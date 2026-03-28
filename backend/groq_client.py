import os
import json
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise EnvironmentError("GROQ_API_KEY not found. Check your .env file.")

client = Groq(api_key=GROQ_API_KEY)
MODEL = "llama-3.3-70b-versatile"

SCHEMA = {
    "type": "object",
    "properties": {
        "explanation": {"type": "string"},
        "symptom": {"type": "string"},
        "drug": {"type": "string"},
        "mechanism": {"type": "string"},
        "precautions": {"type": "string"},
        "side_effect": {"type": "string"},
    },
    "required": [
        "explanation",
        "symptom",
        "drug",
        "mechanism",
        "precautions",
        "side_effect",
    ],
}


def explain_with_kb(result: dict, chat_history: str = "") -> str:
    """
    KB hit mode: Groq explains the structured DB result naturally.
    The LLM must NOT invent additional drug facts.
    """
    history_prompt = ""
    if chat_history:
        history_prompt = f"Recent Conversation History (for context only):\n{chat_history}\n\n"

    prompt = f"""You are a helpful, cautious medical assistant.
{history_prompt}Based ONLY on the structured data below, explain the treatment clearly to a patient in 2-3 sentences.
Do NOT add any drug facts that are not present in the data below.

Symptom: {result.get("symptom", "Unknown")}
Recommended drug: {result.get("drug", "Alternative over-the-counter medicine")}
Mechanism: {result.get("mechanism", "Information not available")}
Precautions: {result.get("precautions", "Consult a healthcare professional")}
Known side effects: {result.get("side_effect") or result.get("side_effects") or "not listed — use general caution"}

CRITICAL INSTRUCTION: You MUST ask the user if they have any specific allergies related to the suggested medicine. To do this, use your medical knowledge to identify the common allergic reactions, symptoms, or conditions caused by allergies to {result["drug"]} (like hives, facial swelling, asthma). Then, explicitly ask if they have ever experienced those specific reactions when taking similar medications, instead of using the drug or class name. For example, instead of asking if they are allergic to NSAIDs, ask: "Have you ever experienced hives, facial swelling, or asthma symptoms when taking pain relievers?" Add this question to the end of your response.

Respond in plain English. Be concise and helpful."""

    try:
        response = client.chat.completions.create(
            model=MODEL, messages=[{"role": "user", "content": prompt}], max_tokens=200
        )
        content = response.choices[0].message.content
        if content:
            return content
        return f"I found information about {result['drug']} for {result['symptom']}, but couldn't generate an explanation right now. Are you allergic to {result['drug']}?"

    except Exception as e:
        return f"I found information about {result['drug']} for {result['symptom']}, but couldn't generate an explanation right now. Are you allergic to {result['drug']}?"


def fallback(user_input: str, chat_history: str = "") -> dict:
    """
    Fallback mode: symptom not in DB, Groq answers from its own knowledge, 
    or handles conversation like allergy questions.
    Returns both explanation and structured data for potential KB save.
    """
    history_prompt = ""
    if chat_history:
        history_prompt = f"Recent Conversation History:\n{chat_history}\n\n"

    prompt = f"""You are a cautious medical assistant. 
{history_prompt}A patient just said:
"{user_input}"

Provide a brief, helpful response. 

1. If the user is answering a previous question about allergies (e.g. saying "yes", "no", "I get hives"):
    - If they indicate they have experienced allergic reactions, apologize and recommend an alternative over-the-counter medicine avoiding the allergen.
    - If they say they are NOT allergic (e.g. "no"), reassure them they can proceed safely and DO NOT ask any further allergy questions.
2. ONLY IF you are introducing a NEW medicine for the FIRST time (including new alternatives), you MUST ask the user if they have any allergies related to it at the end of your response. Use your medical knowledge to identify common allergic reactions (like hives or asthma) associated with the medicine, and explicitly ask if they've ever had those reactions instead of using strict medical names.
3. Do NOT include any long medical disclaimers, warnings to consult a doctor, or notes about this being general advice. The user has already agreed to a medical disclaimer in the app UI.

You MUST respond in JSON format with EXACTLY these keys:
{{
    "explanation": "Your 2-3 sentence response to the patient here (make sure to ask about allergies if suggesting a drug)",
    "symptom": "the main symptom discussed (e.g., headache), or empty string",
    "drug": "any medication mentioned/suggested, or empty string",
    "mechanism": "how the drug works, or empty string",
    "precautions": "any warnings or precautions",
    "side_effect": "any side effects mentioned, or empty string"
}}"""

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            max_tokens=400,
        )
        content = response.choices[0].message.content
        if not content:
            raise Exception("Empty response from LLM")
        data = json.loads(content)

        # Safety: try multiple possible keys the LLM might use
        explanation = (
            data.get("explanation")
            or data.get("response")
            or data.get("message")
            or data.get("answer")
            or str(next(iter(data.values()), ""))
        )

        return {
            "explanation": explanation,
            "structured": {
                "symptom": data.get("symptom", ""),
                "drug": data.get("drug", data.get("medication", "")),
                "mechanism": data.get("mechanism", ""),
                "precautions": data.get("precautions", data.get("warnings", "")),
                "side_effect": data.get("side_effect", data.get("side_effects", "")),
            },
        }

    except Exception as e:
        return {
            "explanation": f"I'm unable to find information on that right now. Please consult a healthcare professional.",
            "structured": None,
        }
