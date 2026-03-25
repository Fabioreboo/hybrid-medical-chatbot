import sqlite3
import os
import uuid
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "../medical kb/chat.db")


def init_chat_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS threads (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """
    )
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            thread_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            source TEXT,
            symptom TEXT,
            drug TEXT,
            can_save BOOLEAN,
            structured TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(thread_id) REFERENCES threads(id)
        )
    """
    )
    conn.commit()
    conn.close()


def create_thread(title: str) -> str:
    thread_id = str(uuid.uuid4())
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO threads (id, title) VALUES (?, ?)", (thread_id, title)
    )
    conn.commit()
    conn.close()
    return thread_id


def get_threads():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT id, title, created_at FROM threads ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()
    return [{"id": row["id"], "title": row["title"], "created_at": row["created_at"]} for row in rows]


def save_message(
    thread_id: str,
    role: str,
    content: str,
    source: str = None,
    symptom: str = None,
    drug: str = None,
    can_save: bool = False,
    structured: str = None,
):
    msg_id = str(uuid.uuid4())
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO messages (id, thread_id, role, content, source, symptom, drug, can_save, structured)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """,
        (msg_id, thread_id, role, content, source, symptom, drug, can_save, structured),
    )
    conn.commit()
    conn.close()
    return msg_id


def get_messages(thread_id: str):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute(
        "SELECT role, content, source, symptom, drug, can_save, structured, created_at FROM messages WHERE thread_id = ? ORDER BY created_at ASC",
        (thread_id,),
    )
    rows = cursor.fetchall()
    conn.close()
    messages = []
    for row in rows:
        messages.append({
            "role": row["role"],
            "content": row["content"],
            "source": row["source"],
            "symptom": row["symptom"],
            "drug": row["drug"],
            "can_save": bool(row["can_save"]),
            "structured": row["structured"],
            "created_at": row["created_at"],
        })
    return messages
