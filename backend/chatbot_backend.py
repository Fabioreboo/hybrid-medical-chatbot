from backend.symptom_detector import detect_symptoms
from backend.query_engine import query_symptom, add_symptom, add_to_kb_cache
from backend.groq_client import explain_with_kb, fallback
from backend.chat_db import save_message, create_thread, log_query, get_recent_messages
import requests
import os
import sqlite3


def auto_add_symptom_to_kb(
    symptom: str, drug: str, mechanism: str, precautions: str, side_effects: str = "Use with caution"
) -> bool:
    """
    Auto-add a new symptom to KB (approved status, marked as auto-generated).
    Returns True on success.
    """
    try:
        CHAT_DB_PATH = os.path.join(os.path.dirname(__file__), "../medical kb/chat.db")
        conn = sqlite3.connect(CHAT_DB_PATH)
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO kb_requests (user_id, username, user_email, suggested_symptom, suggested_drug, suggested_mechanism, suggested_precautions, suggested_side_effects, status, is_auto_generated, reviewed_at)
            VALUES (1, 'System', 'system@localhost', ?, ?, ?, ?, ?, 'approved', 1, datetime('now'))
        """,
            (symptom, drug, mechanism, precautions, side_effects),
        )
        conn.commit()
        conn.close()

        # Add to cache for fast lookup
        add_to_kb_cache(symptom, drug, mechanism, precautions, side_effects, True)
        print(f"[auto_add] Added '{symptom}' -> '{drug}' to KB")
        return True
    except Exception as e:
        print(f"[auto_add] Failed to add symptom: {e}")
        return False


def get_response(
    user_input: str, thread_id: str = None, user_id=None, username=None, user_email=None
) -> dict:
    """
    Main pipeline: user_input -> symptoms -> DB query -> Groq response.
    Returns response text and metadata for the frontend.
    """
    if not user_input or not user_input.strip():
        return {"response": "Please describe your symptoms.", "source": "validation"}

    # Create thread if none exists
    if not thread_id:
        title = " ".join(user_input.split()[:5]) + "..."
        thread_id = create_thread(title, user_id=user_id)
    else:
        # Extra safety check: confirm ownership if we didn't just create it
        # This is a fallback in case the caller didn't check (but app.py does)
        conn = sqlite3.connect(os.path.join(os.path.dirname(__file__), "../medical kb/chat.db"))
        row = conn.execute("SELECT user_id FROM threads WHERE id = ?", (thread_id,)).fetchone()
        conn.close()
        if row and row[0] != user_id:
            # If somehow we get a thread from another user, we stop immediately.
            # In a production app, we'd raise a custom exception here.
            return {"response": "Unauthorized access to thread history.", "source": "security_check"}

    # Get recent conversation history + append current message
    recent_msgs = get_recent_messages(thread_id, limit=6, user_id=user_id)
    history_lines = [
        f"{msg['role'].capitalize()}: {msg['content']}" for msg in recent_msgs
    ]
    history_str = "\n".join(history_lines)

    # Check if the bot just asked a question (e.g., about allergies)
    waiting_for_answer = False
    if (
        recent_msgs
        and recent_msgs[-1]["role"] == "bot"
        and "?" in recent_msgs[-1]["content"]
    ):
        waiting_for_answer = True

    # Save user message
    save_message(thread_id, role="user", content=user_input)

    symptoms = detect_symptoms(user_input)

    if symptoms and not waiting_for_answer:
        result = query_symptom(symptoms[0])

        if not result and symptoms[0]:
            # Symptom detected but not in KB - try to get LLM suggestion and auto-add
            llm_result = fallback(user_input, chat_history=history_str)
            structured = llm_result.get("structured", {})

            if structured and structured.get("drug") and structured.get("symptom"):
                # Auto-add to KB
                auto_add_symptom_to_kb(
                    symptom=structured["symptom"],
                    drug=structured["drug"],
                    mechanism=structured.get("mechanism", "Not available"),
                    precautions=structured.get("precautions", "Consult a doctor"),
                    side_effects=structured.get("side_effects") or structured.get("side_effect", "Use with caution"),
                )
                # Now query again to get the result
                result = query_symptom(symptoms[0])

        if result:
            response_text = explain_with_kb(result, chat_history=history_str)

            # Log query (KB hit) - only log symptom if it's a meaningful query
            user_input_stripped = user_input.strip().lower()
            short_responses = [
                "yes",
                "no",
                "yeah",
                "yep",
                "nope",
                "ok",
                "okay",
                "sure",
                "maybe",
            ]
            symptom_to_log = (
                result["symptom"]
                if len(user_input_stripped) >= 3
                and user_input_stripped not in short_responses
                else ""
            )

            log_query(
                user_id=user_id,
                username=username or "anonymous",
                user_email=user_email or "",
                symptom_detected=symptom_to_log,
                user_message=user_input,
                was_kb_hit=True,
            )

            # Save bot message
            save_message(
                thread_id=thread_id,
                role="bot",
                content=response_text,
                source="database",
                symptom=result["symptom"],
                drug=result["drug"],
            )

            return {
                "response": response_text,
                "source": "database",
                "symptom": result["symptom"],
                "drug": result["drug"],
                "thread_id": thread_id,
                "is_auto_generated": result.get("is_auto_generated", False),
            }

    # Log query (LLM fallback) - only log symptom if it's a meaningful query
    user_input_stripped = user_input.strip().lower()
    short_responses = [
        "yes",
        "no",
        "yeah",
        "yep",
        "nope",
        "ok",
        "okay",
        "sure",
        "maybe",
    ]
    symptom_to_log = (
        symptoms[0]
        if symptoms
        and len(user_input_stripped) >= 3
        and user_input_stripped not in short_responses
        else ""
    )

    log_query(
        user_id=user_id,
        username=username or "anonymous",
        user_email=user_email or "",
        symptom_detected=symptom_to_log,
        user_message=user_input,
        was_kb_hit=False,
    )

    result = fallback(user_input, chat_history=history_str)
    response_data = {
        "response": result["explanation"],
        "source": "llm_fallback",
        "thread_id": thread_id,
    }

    if result.get("structured"):
        structured = result["structured"]
        response_data["can_save"] = True
        response_data["structured"] = structured

        # Auto-add to KB if it's a valid new symptom/drug recommendation
        if structured.get("symptom") and structured.get("drug"):
            auto_add_symptom_to_kb(
                symptom=structured["symptom"].lower(),
                drug=structured["drug"],
                mechanism=structured.get("mechanism", "Not available"),
                precautions=structured.get("precautions", "Consult a doctor"),
                side_effects=structured.get("side_effects") or structured.get("side_effect", "Use with caution"),
            )

    # Save bot message
    save_message(
        thread_id=thread_id,
        role="bot",
        content=result["explanation"],
        source="llm_fallback",
        can_save=response_data.get("can_save", False),
        structured=str(result.get("structured")) if result.get("structured") else None,
    )

    return response_data


def save_to_kb(data: dict, token: str = None) -> dict:
    """
    Save structured LLM response to KB via NestJS API.
    """
    try:
        nestjs_url = os.environ.get("NESTJS_URL", "http://localhost:3001")
        headers = {}
        if token:
            headers["Authorization"] = f"Bearer {token}"

        payload = {
            "symptom": data.get("symptom", ""),
            "drug": data.get("drug", ""),
            "mechanism": data.get("mechanism", ""),
            "precautions": data.get("precautions", ""),
            "side_effects": data.get("side_effect", ""),
        }

        response = requests.post(
            f"{nestjs_url}/kb/request-addition",
            json=payload,
            headers=headers,
            timeout=10,
        )

        if response.status_code == 201:
            return {
                "success": True,
                "message": f"Added '{data['symptom']}' to knowledge base for approval",
            }
        else:
            return {"success": False, "message": f"API error: {response.status_code}"}

    except Exception as e:
        print(f"[save_to_kb] Error calling NestJS API: {e}")
        return {"success": False, "message": str(e)}
