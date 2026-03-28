import sqlite3
import os
import threading

DB_PATH = os.path.join(os.path.dirname(__file__), "../medical kb/medical_kb.db")
CHAT_DB_PATH = os.path.join(os.path.dirname(__file__), "../medical kb/chat.db")

# Cache for approved KB entries from kb_requests table
_kb_cache = {}
_kb_cache_loaded = False
_cache_lock = threading.Lock()


def _load_kb_cache():
    """Load approved KB entries from chat.db into memory cache."""
    global _kb_cache, _kb_cache_loaded
    with _cache_lock:
        if _kb_cache_loaded:
            return
        try:
            conn = sqlite3.connect(CHAT_DB_PATH)
            conn.row_factory = sqlite3.Row
            cur = conn.cursor()
            rows = cur.execute(
                """SELECT suggested_symptom, suggested_drug, suggested_mechanism, 
                          suggested_precautions, suggested_side_effects, is_auto_generated 
                   FROM kb_requests WHERE status = 'approved'"""
            ).fetchall()
            conn.close()

            _kb_cache = {}
            for row in rows:
                symptom_lower = row["suggested_symptom"].lower().strip()
                _kb_cache[symptom_lower] = {
                    "symptom": row["suggested_symptom"],
                    "drug": row["suggested_drug"],
                    "mechanism": row["suggested_mechanism"] or "Not available",
                    "precautions": row["suggested_precautions"] or "Consult a doctor",
                    "side_effect": row["suggested_side_effects"] or "Use with caution",
                    "is_auto_generated": bool(row["is_auto_generated"]),
                }
            _kb_cache_loaded = True
            print(f"[query_engine] KB cache loaded with {len(_kb_cache)} entries")
        except Exception as e:
            print(f"[query_engine] Failed to load KB cache: {e}")


def get_cached_symptom(symptom: str) -> dict | None:
    """Check cache for symptom (fast lookup)."""
    _load_kb_cache()
    symptom_lower = symptom.lower().strip()
    return _kb_cache.get(symptom_lower)


def add_to_kb_cache(
    symptom: str, drug: str, mechanism: str, precautions: str, side_effect: str = "Use with caution", is_auto: bool = True
):
    """Add new symptom to KB cache after auto-insertion."""
    _load_kb_cache()
    symptom_lower = symptom.lower().strip()
    with _cache_lock:
        _kb_cache[symptom_lower] = {
            "symptom": symptom,
            "drug": drug,
            "mechanism": mechanism,
            "precautions": precautions,
            "side_effect": side_effect,
            "is_auto_generated": is_auto,
        }


def refresh_kb_cache():
    """Force refresh cache (e.g., after admin changes)."""
    global _kb_cache_loaded
    _kb_cache_loaded = False
    _load_kb_cache()


def query_symptom(symptom: str) -> dict | None:
    """
    Query knowledge base for a given symptom.
    First checks cache (fast), then checks both medical_knowledge and kb_requests tables.
    Returns a dict of medical data or None if not found.
    """
    # Check cache first (fastest)
    cached = get_cached_symptom(symptom)
    if cached:
        return cached

    try:
        # Check medical_knowledge table first
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
                "is_auto_generated": False,
            }

        # Check kb_requests (approved entries from chat.db)
        conn = sqlite3.connect(CHAT_DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute(
            """SELECT suggested_symptom, suggested_drug, suggested_mechanism, 
                      suggested_precautions, suggested_side_effects, is_auto_generated 
               FROM kb_requests 
               WHERE status = 'approved' AND LOWER(suggested_symptom) LIKE LOWER(?)
               LIMIT 1""",
            (f"%{symptom}%",),
        )

        row = cursor.fetchone()
        conn.close()

        if row:
            # Add to cache for future
            add_to_kb_cache(
                row["suggested_symptom"],
                row["suggested_drug"],
                row["suggested_mechanism"] or "Not available",
                row["suggested_precautions"] or "Consult a doctor",
                row["suggested_side_effects"] or "Use with caution",
                bool(row["is_auto_generated"]),
            )
            return {
                "symptom": row["suggested_symptom"],
                "drug": row["suggested_drug"],
                "mechanism": row["suggested_mechanism"] or "Not available",
                "precautions": row["suggested_precautions"] or "Consult a doctor",
                "side_effect": row["suggested_side_effects"] or "Use with caution",
                "is_auto_generated": bool(row["is_auto_generated"]),
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


def get_all_knowledge() -> list:
    """
    Retrieve all knowledge entries from the knowledge base for admin overview.
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        cursor.execute(
            "SELECT ROWID as id, symptom, drug, mechanism, precautions, side_effect FROM medical_knowledge ORDER BY ROWID ASC"
        )
        rows = cursor.fetchall()
        conn.close()

        return [
            {
                "id": row[0],
                "symptom": row[1],
                "drug": row[2],
                "mechanism": row[3],
                "precautions": row[4],
                "side_effect": row[5],
            }
            for row in rows
        ]

    except sqlite3.Error as e:
        print(f"[query_engine] Select all error: {e}")
        return []


def get_kb_stats() -> dict:
    """
    Get statistics about the knowledge base.
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        # Total entries
        cursor.execute("SELECT COUNT(*) FROM medical_knowledge")
        total_entries = cursor.fetchone()[0]

        # Unique symptoms
        cursor.execute("SELECT COUNT(DISTINCT LOWER(symptom)) FROM medical_knowledge")
        unique_symptoms = cursor.fetchone()[0]

        # Unique drugs
        cursor.execute("SELECT COUNT(DISTINCT LOWER(drug)) FROM medical_knowledge")
        unique_drugs = cursor.fetchone()[0]

        conn.close()

        return {
            "total_entries": total_entries,
            "unique_symptoms": unique_symptoms,
            "unique_drugs": unique_drugs,
        }
    except sqlite3.Error as e:
        print(f"[query_engine] Stats error: {e}")
        return {"total_entries": 0, "unique_symptoms": 0, "unique_drugs": 0}


def delete_kb_entry(entry_id: int) -> bool:
    """
    Delete a KB entry by ID.
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM medical_knowledge WHERE ROWID = ?", (entry_id,))
        conn.commit()
        affected = cursor.rowcount
        conn.close()
        return affected > 0
    except sqlite3.Error as e:
        print(f"[query_engine] Delete error: {e}")
        return False
