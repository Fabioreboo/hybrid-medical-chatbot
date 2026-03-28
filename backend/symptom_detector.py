import sqlite3
import os
import re
from rapidfuzz import process, fuzz

DB_PATH = os.path.join(os.path.dirname(__file__), "../medical kb/medical_kb.db")
CHAT_DB_PATH = os.path.join(os.path.dirname(__file__), "../medical kb/chat.db")

# Common greetings and fillers to ignore for symptom detection
GREETINGS = {
    "hi",
    "hello",
    "hey",
    "hola",
    "greetings",
    "good morning",
    "good afternoon",
    "good evening",
    "howdy",
    "hi there",
    "hello there",
}


def get_known_symptoms():
    """Load all known symptoms from both medical_knowledge and kb_requests."""
    symptoms = set()

    # From medical_knowledge
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT DISTINCT symptom FROM medical_knowledge")
    for row in cursor.fetchall():
        if row[0]:
            symptoms.add(row[0].lower())
    conn.close()

    # From kb_requests (approved entries)
    conn = sqlite3.connect(CHAT_DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT DISTINCT suggested_symptom FROM kb_requests WHERE status = 'approved'"
    )
    for row in cursor.fetchall():
        if row[0]:
            symptoms.add(row[0].lower())
    conn.close()

    return list(symptoms)


def detect_symptoms(user_input: str) -> list[str]:
    """
    Extract symptoms from user message using fuzzy matching.
    Returns list of matched symptom strings.
    """
    user_input_lower = user_input.lower().strip()

    # If input is just a greeting, don't try to detect symptoms
    if user_input_lower in GREETINGS:
        return []

    known = get_known_symptoms()

    # Try direct whole-word match first (fast path)
    direct = []
    for s in known:
        # Use regex to find symptom as a whole word
        pattern = r"\b" + re.escape(s) + r"\b"
        if re.search(pattern, user_input_lower):
            direct.append(s)

    if direct:
        return direct

    # Fuzzy match fallback (handles typos) - only for inputs that look like symptoms (>= 4 chars)
    if len(user_input_lower) < 4:
        return []

    # Use WRatio but verify result with token_set_ratio to avoid partial match issues (like hi/teething)
    matches = process.extract(user_input_lower, known, scorer=fuzz.WRatio, limit=3)

    results = []
    for symptom, score, _ in matches:
        if score >= 85:
            # Further verification for short inputs or partial matches
            ts_score = fuzz.token_set_ratio(user_input_lower, symptom)
            # If input is significantly matched
            if ts_score >= 70:
                results.append(symptom)

    return results
