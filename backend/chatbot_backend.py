from backend.symptom_detector import detect_symptoms
from backend.query_engine import query_symptom, add_symptom
from backend.groq_client import explain_with_kb, fallback
from backend.chat_db import save_message, create_thread

def get_response(user_input: str, thread_id: str = None) -> dict:
    """
    Main pipeline: user_input -> symptoms -> DB query -> Groq response.
    Returns response text and metadata for the frontend.
    """
    if not user_input or not user_input.strip():
        return {"response": "Please describe your symptoms.", "source": "validation"}

    # Create thread if none exists
    if not thread_id:
        title = " ".join(user_input.split()[:5]) + "..."
        thread_id = create_thread(title)
        
    # Save user message
    save_message(thread_id, role="user", content=user_input)

    symptoms = detect_symptoms(user_input)

    if symptoms:
        result = query_symptom(symptoms[0])
        if result:
            response_text = explain_with_kb(result)
            
            # Save bot message
            save_message(
                thread_id=thread_id,
                role="bot",
                content=response_text,
                source="database",
                symptom=result["symptom"],
                drug=result["drug"]
            )
            
            return {
                "response": response_text,
                "source": "database",
                "symptom": result["symptom"],
                "drug": result["drug"],
                "thread_id": thread_id
            }

    result = fallback(user_input)
    response_data = {
        "response": result["explanation"],
        "source": "llm_fallback",
        "thread_id": thread_id
    }

    if result.get("structured"):
        response_data["can_save"] = True
        response_data["structured"] = result["structured"]

    # Save bot message
    save_message(
        thread_id=thread_id,
        role="bot",
        content=result["explanation"],
        source="llm_fallback",
        can_save=response_data.get("can_save", False),
        structured=str(result.get("structured")) if result.get("structured") else None
    )

    return response_data


def save_to_kb(data: dict) -> dict:
    """
    Save structured LLM response to KB.
    """
    success = add_symptom(
        symptom=data.get("symptom", ""),
        drug=data.get("drug", ""),
        mechanism=data.get("mechanism", ""),
        precautions=data.get("precautions", ""),
        side_effect=data.get("side_effect", ""),
    )
    if success:
        return {
            "success": True,
            "message": f"Added '{data['symptom']}' to knowledge base",
        }
    return {"success": False, "message": "Failed to save to knowledge base"}
