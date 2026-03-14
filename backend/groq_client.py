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


def explain_with_kb(result: dict) -> str:
    """
    KB hit mode: Groq explains the structured DB result naturally.
    The LLM must NOT invent additional drug facts.
    """
    prompt = f"""You are a helpful, cautious medical assistant.
Based ONLY on the structured data below, explain the treatment clearly to a patient in 2-3 sentences.
Do NOT add any drug facts that are not present in the data below.

Symptom: {result["symptom"]}
Recommended drug: {result["drug"]}
Mechanism: {result["mechanism"]}
Precautions: {result["precautions"]}
Known side effects: {result["side_effect"] or "not listed — use general caution"}

Respond in plain English. Be concise and helpful."""

    try:
        response = client.chat.completions.create(
            model=MODEL, messages=[{"role": "user", "content": prompt}], max_tokens=200
        )
        content = response.choices[0].message.content
        if content:
            return content
        return f"I found information about {result['drug']} for {result['symptom']}, but couldn't generate an explanation right now. Please consult a pharmacist."

    except Exception as e:
        return f"I found information about {result['drug']} for {result['symptom']}, but couldn't generate an explanation right now. Please consult a pharmacist."


def fallback(user_input: str) -> dict:
    """
    Fallback mode: symptom not in DB, Groq answers from its own knowledge.
    Returns both explanation and structured data for potential KB save.
    """
    prompt = f"""You are a cautious medical assistant. A patient said:
"{user_input}"

Provide a brief, helpful response. If you mention any medication, note it's a general suggestion only.
Do NOT include any long medical disclaimers, warnings to consult a doctor, or notes about this being general advice. The user has already agreed to a medical disclaimer in the app UI.

You MUST respond in JSON format with EXACTLY these keys:
{{
    "explanation": "Your 2-3 sentence response to the patient here",
    "symptom": "the main symptom detected",
    "drug": "any medication mentioned, or empty string",
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
