import sqlite3
import os
from rapidfuzz import process, fuzz

DB_PATH = os.path.join(os.path.dirname(__file__), "../medical kb/medical_kb.db")

def get_known_symptoms():
    """Load all known symptoms from DB."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT DISTINCT symptom FROM medical_knowledge")
    symptoms = [row[0] for row in cursor.fetchall()]
    conn.close()
    return symptoms

def detect_symptoms(user_input: str) -> list[str]:
    """
    Extract symptoms from user message using fuzzy matching.
    Returns list of matched symptom strings.
    """
    known = get_known_symptoms()
    user_input_lower = user_input.lower().strip()
    
    # Try direct substring match first (fast path)
    direct = [s for s in known if s in user_input_lower]
    if direct:
        return direct
    
    # Fuzzy match fallback (handles typos)
    matches = process.extract(
        user_input_lower,
        known,
        scorer=fuzz.partial_ratio,
        limit=3
    )
    # Only return matches with high confidence (score >= 70)
    return [match[0] for match in matches if match[1] >= 85]
