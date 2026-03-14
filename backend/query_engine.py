import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "../medical kb/medical_kb.db")


def query_symptom(symptom: str) -> dict | None:
    """
    Query medical_knowledge for a given symptom.
    Returns a dict of medical data or None if not found.
    ALWAYS uses parameterized queries — never string format user input into SQL.
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT symptom, drug, mechanism, precautions, side_effect
            FROM medical_knowledge
            WHERE LOWER(symptom) LIKE LOWER(?)
            LIMIT 1
        """,
            (f"%{symptom}%",),
        )

        row = cursor.fetchone()
        conn.close()

        if row:
            return {
                "symptom": row["symptom"],
                "drug": row["drug"],
                "mechanism": row["mechanism"] or "mechanism not available",
                "precautions": row["precautions"] or "consult a doctor",
                "side_effect": row["side_effect"],
            }
        return None

    except sqlite3.Error as e:
        print(f"[query_engine] DB error: {e}")
        return None


def add_symptom(
    symptom: str, drug: str, mechanism: str, precautions: str, side_effect: str
) -> bool:
    """
    Add a new symptom-drug entry to the knowledge base.
    Returns True on success, False on failure.
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        cursor.execute(
            """
            INSERT INTO medical_knowledge (symptom, drug, mechanism, precautions, side_effect)
            VALUES (?, ?, ?, ?, ?)
        """,
            (symptom, drug, mechanism, precautions, side_effect),
        )

        conn.commit()
        conn.close()
        return True

    except sqlite3.Error as e:
        print(f"[query_engine] Insert error: {e}")
        return False
