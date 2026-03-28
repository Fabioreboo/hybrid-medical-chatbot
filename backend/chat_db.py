import sqlite3
import os
import uuid
from datetime import datetime
import hashlib  # Import hashlib

DB_PATH = os.path.join(os.path.dirname(__file__), "../medical kb/chat.db")


def init_chat_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS threads (
            id TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
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

    # Users table for session-based auth
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_banned INTEGER DEFAULT 0
        )
    """
    )

    # Safely add is_banned column if it doesn't exist
    existing_cols_users = [
        row[1] for row in cursor.execute("PRAGMA table_info(users)").fetchall()
    ]
    if "is_banned" not in existing_cols_users:
        cursor.execute("ALTER TABLE users ADD COLUMN is_banned INTEGER DEFAULT 0")

    # Safely add user_id column to threads if it doesn't exist
    existing_cols_threads = [
        row[1] for row in cursor.execute("PRAGMA table_info(threads)").fetchall()
    ]
    if "user_id" not in existing_cols_threads:
        cursor.execute("ALTER TABLE threads ADD COLUMN user_id INTEGER")
        cursor.execute(
            "UPDATE threads SET user_id = 1 WHERE user_id IS NULL"
        )  # Assign to default user if needed
        cursor.execute("CREATE TEMPORARY TABLE threads_backup(id, title, created_at)")
        cursor.execute(
            "INSERT INTO threads_backup SELECT id, title, created_at FROM threads"
        )
        cursor.execute("DROP TABLE threads")
        cursor.execute("""
            CREATE TABLE threads (
                id TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
        """)
        cursor.execute(
            "INSERT INTO threads SELECT id, 1, title, created_at FROM threads_backup"
        )  # Re-insert with default user_id 1
        cursor.execute("DROP TABLE threads_backup")

    # KB suggestion requests from users
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS kb_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            username TEXT NOT NULL,
            user_email TEXT NOT NULL,
            suggested_symptom TEXT NOT NULL,
            suggested_drug TEXT NOT NULL,
            suggested_mechanism TEXT,
            suggested_precautions TEXT,
            suggested_side_effects TEXT,
            user_note TEXT,
            status TEXT DEFAULT 'pending',
            is_auto_generated INTEGER DEFAULT 0,
            submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            reviewed_at TIMESTAMP
        )
    """
    )

    # Safely add suggested_side_effects and is_auto_generated to kb_requests
    existing_cols_kb = [
        row[1] for row in cursor.execute("PRAGMA table_info(kb_requests)").fetchall()
    ]
    if "suggested_side_effects" not in existing_cols_kb:
        cursor.execute("ALTER TABLE kb_requests ADD COLUMN suggested_side_effects TEXT")
    if "is_auto_generated" not in existing_cols_kb:
        cursor.execute(
            "ALTER TABLE kb_requests ADD COLUMN is_auto_generated INTEGER DEFAULT 0"
        )

    # Logs every chatbot query made by users
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS query_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            username TEXT,
            user_email TEXT,
            symptom_detected TEXT,
            user_message TEXT,
            was_kb_hit INTEGER DEFAULT 0,
            queried_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """
    )

    # Audit logs for admin actions
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS admin_audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            admin_user_id INTEGER,
            admin_email TEXT,
            admin_username TEXT,
            action TEXT NOT NULL,
            target_type TEXT,
            target_id INTEGER,
            details TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """
    )

    # Create a default admin user if none exists
    admin_email = os.getenv("ADMIN_EMAIL")
    admin_pin = os.getenv("ADMIN_PIN")
    if admin_email and admin_pin:
        cursor.execute("SELECT id FROM users WHERE email = ?", (admin_email,))
        if cursor.fetchone() is None:
            # Hash the admin pin for storage
            admin_password_hash = hashlib.sha256(admin_pin.encode()).hexdigest()
            cursor.execute(
                "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
                ("Admin", admin_email, admin_password_hash),
            )

    conn.commit()
    conn.close()


def create_thread(title: str, user_id: int) -> str:
    thread_id = str(uuid.uuid4())
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO threads (id, title, user_id) VALUES (?, ?, ?)",
        (thread_id, title, user_id),
    )
    conn.commit()
    conn.close()
    return thread_id


def get_threads(user_id: int):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, title, created_at FROM threads WHERE user_id = ? ORDER BY created_at DESC",
        (user_id,),
    )
    rows = cursor.fetchall()
    conn.close()
    return [
        {"id": row["id"], "title": row["title"], "created_at": row["created_at"]}
        for row in rows
    ]


def save_message(
    thread_id: str,
    role: str,
    content: str,
    source: str | None = None,
    symptom: str | None = None,
    drug: str | None = None,
    can_save: bool = False,
    structured: str | None = None,
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


def get_messages(thread_id: str, user_id: int):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    # Ensure messages belong to the user's thread
    cursor.execute(
        "SELECT 1 FROM threads WHERE id = ? AND user_id = ?", (thread_id, user_id)
    )
    if not cursor.fetchone():
        conn.close()
        return []  # Or raise an error for unauthorized access

    cursor.execute(
        "SELECT role, content, source, symptom, drug, can_save, structured, created_at FROM messages WHERE thread_id = ? ORDER BY created_at ASC",
        (thread_id,),
    )
    rows = cursor.fetchall()
    conn.close()
    messages = []
    for row in rows:
        messages.append(
            {
                "role": row["role"],
                "content": row["content"],
                "source": row["source"],
                "symptom": row["symptom"],
                "drug": row["drug"],
                "can_save": bool(row["can_save"]),
                "structured": row["structured"],
                "created_at": row["created_at"],
            }
        )
    return messages


def log_query(
    user_id, username, user_email, symptom_detected, user_message, was_kb_hit
):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO query_logs (user_id, username, user_email, symptom_detected, user_message, was_kb_hit)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            user_id,
            username,
            user_email,
            symptom_detected,
            user_message,
            1 if was_kb_hit else 0,
        ),
    )
    conn.commit()
    conn.close()


def get_user_by_email(email: str):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def get_user_by_id(user_id: int):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def get_recent_messages(thread_id: str, limit: int = 5, user_id: int = None):
    """
    Get the most recent messages for a thread (chronological order)
    to provide conversation context to the LLM.
    If user_id is provided, verifies that the thread belongs to that user.
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    if user_id is not None:
        cursor.execute("SELECT 1 FROM threads WHERE id = ? AND user_id = ?", (thread_id, user_id))
        if not cursor.fetchone():
            conn.close()
            return []

    cursor.execute(
        """
        SELECT role, content 
        FROM messages 
        WHERE thread_id = ? 
        ORDER BY created_at DESC 
        LIMIT ?
        """,
        (thread_id, limit),
    )
    # Fetch returns newest first. Reverse to get oldest-to-newest context.
    rows = cursor.fetchall()
    conn.close()

    messages = [{"role": row["role"], "content": row["content"]} for row in rows]
    messages.reverse()
    return messages


def log_admin_action(
    admin_user_id: int,
    admin_email: str,
    admin_username: str,
    action: str,
    target_type: str = None,
    target_id: int = None,
    details: str = None,
):
    """
    Log an admin action to the audit trail.
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO admin_audit_logs (admin_user_id, admin_email, admin_username, action, target_type, target_id, details)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            admin_user_id,
            admin_email,
            admin_username,
            action,
            target_type,
            target_id,
            details,
        ),
    )
    conn.commit()
    conn.close()


def get_admin_audit_logs(limit: int = 100):
    """
    Get admin audit logs.
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM admin_audit_logs ORDER BY created_at DESC LIMIT ?",
        (limit,),
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]
