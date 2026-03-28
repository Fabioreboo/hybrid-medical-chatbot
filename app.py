import os
import sqlite3
import requests
from datetime import datetime, date
from functools import wraps

from flask import (
    Flask,
    render_template,
    request,
    jsonify,
    session,
    redirect,
    url_for,
    flash,
    g,
)
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

import sentry_sdk
from sentry_sdk.integrations.flask import FlaskIntegration

sentry_sdk.init(
    dsn="https://70dd81fad43fe35c7993cb795d942968@o4511082152919040.ingest.us.sentry.io/4511082171006976",
    traces_sample_rate=1.0,
    profiles_sample_rate=1.0,
)

from backend.chatbot_backend import get_response, save_to_kb
from backend.chat_db import DB_PATH, init_chat_db

app = Flask(__name__)
CORS(app)
app.secret_key = os.getenv("SECRET_KEY", "change_me_in_production")

ADMIN_PIN = os.getenv("ADMIN_PIN", "")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "")
NESTJS_URL = os.getenv("NESTJS_URL", "http://localhost:3001")


from flask import g

# ── Decorators ────────────────────────────────────────────────────────────────


def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        email = request.headers.get("X-User-Email")
        username = request.headers.get("X-User-Name", "User")
        role = request.headers.get("X-User-Role", "user")

        if not email:
            return jsonify({"error": "Unauthorized"}), 401

        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE email = ?", (email.lower(),))
        user_row = cursor.fetchone()

        if not user_row:
            try:
                cursor.execute(
                    "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
                    (username, email.lower(), ""),
                )
                conn.commit()
                user_id = cursor.lastrowid
            except sqlite3.IntegrityError:
                cursor.execute("SELECT * FROM users WHERE email = ?", (email.lower(),))
                user_row = cursor.fetchone()
                user_id = user_row["id"]
        else:
            if user_row["is_banned"]:
                conn.close()
                return jsonify(
                    {"error": "Your account has been suspended. Contact admin."}
                ), 403
            user_id = user_row["id"]

        conn.close()

        g.user_id = user_id
        g.username = username
        g.user_email = email.lower()
        g.is_admin = role == "admin" or email.lower() == ADMIN_EMAIL.lower()

        return f(*args, **kwargs)

    return decorated


def admin_required(f):
    @wraps(f)
    @require_auth
    def decorated(*args, **kwargs):
        if not getattr(g, "is_admin", False):
            return jsonify({"error": "Admin access required"}), 403
        return f(*args, **kwargs)

    return decorated


# ── Chat related endpoints (for React Frontend) ───────────────────────────────


@app.route("/api/chat", methods=["POST"])
@require_auth
def api_chat():
    data = request.get_json()
    user_input = data.get("message", "").strip()
    thread_id = data.get("thread_id")

    if not user_input:
        return jsonify({"error": "Empty message"}), 400

    user_id = g.user_id
    username = g.username
    user_email = g.user_email

    # Ownership check if thread_id is provided
    if thread_id:
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        row = cur.execute(
            "SELECT 1 FROM threads WHERE id = ? AND user_id = ?", (thread_id, user_id)
        ).fetchone()
        conn.close()
        if not row:
            return jsonify({"error": "Unauthorized access to thread"}), 403

    result = get_response(
        user_input, thread_id, user_id=user_id, username=username, user_email=user_email
    )
    return jsonify(result)


@app.route("/api/threads", methods=["GET"])
@require_auth
def api_threads():
    from backend.chat_db import get_threads

    # Assuming get_threads can be modified to return user-specific threads
    return jsonify(get_threads(g.user_id))


@app.route("/api/threads/<thread_id>", methods=["GET", "DELETE"])
@require_auth
def api_thread_messages(thread_id):
    from backend.chat_db import get_messages, DB_PATH

    if request.method == "DELETE":
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        # Verify ownership
        row = cur.execute(
            "SELECT user_id FROM threads WHERE id = ?", (thread_id,)
        ).fetchone()
        if not row or row[0] != g.user_id:
            conn.close()
            return jsonify({"error": "Unauthorized"}), 403

        cur.execute("DELETE FROM messages WHERE thread_id = ?", (thread_id,))
        cur.execute("DELETE FROM threads WHERE id = ?", (thread_id,))
        conn.commit()
        conn.close()
        return jsonify({"success": True})

    return jsonify(get_messages(thread_id, g.user_id))


@app.route("/api/save-kb", methods=["POST"])
@require_auth
def api_save_kb():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400
    result = save_to_kb(data)
    return jsonify(result)


# ── KB Request (user-side suggest) ───────────────────────────────────────────


@app.route("/api/kb_request/check", methods=["POST"])
@require_auth
def api_check_kb_request():
    """Check if a KB request already exists for the given symptom and drug"""
    data = request.get_json() or {}
    symptom = (data.get("symptom") or "").strip().lower()
    drug = (data.get("drug") or "").strip().lower()

    if not symptom or not drug:
        return jsonify({"exists": False})

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Check if any request exists with same symptom and drug (case insensitive)
    cursor.execute(
        """SELECT id, status, submitted_at FROM kb_requests 
           WHERE LOWER(suggested_symptom) = ? AND LOWER(suggested_drug) = ?
           ORDER BY submitted_at DESC LIMIT 1""",
        (symptom, drug),
    )
    row = cursor.fetchone()
    conn.close()

    if row:
        return jsonify(
            {
                "exists": True,
                "status": row["status"],
                "submitted_at": row["submitted_at"],
            }
        )

    return jsonify({"exists": False})


@app.route("/api/kb_request", methods=["POST"])
@require_auth
def api_kb_request():
    data = request.get_json() or {}
    symptom = (data.get("suggested_symptom") or "").strip()
    drug = (data.get("suggested_drug") or "").strip()

    if not symptom or not drug:
        return jsonify(
            {"success": False, "message": "Symptom and drug are required"}
        ), 400

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        """INSERT INTO kb_requests
           (user_id, username, user_email, suggested_symptom, suggested_drug,
            suggested_mechanism, suggested_precautions, user_note)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            g.user_id,
            g.username,
            g.user_email,
            symptom,
            drug,
            data.get("suggested_mechanism", ""),
            data.get("suggested_precautions", ""),
            data.get("user_note", ""),
        ),
    )
    conn.commit()
    conn.close()

    # Sync to NestJS for admin panel
    try:
        token = session.get("nestjs_token")
        headers = {}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        requests.post(
            f"{NESTJS_URL}/kb/request-addition",
            json={
                "symptom": symptom,
                "drug": drug,
                "mechanism": data.get("suggested_mechanism", ""),
                "precautions": data.get("suggested_precautions", ""),
                "side_effects": data.get("suggested_side_effects", ""),
            },
            headers=headers,
            timeout=5,
        )
    except Exception as e:
        print(f"[api_kb_request] Failed to sync to NestJS: {e}")

    return jsonify(
        {"success": True, "message": "Suggestion submitted for admin review."}
    )


# ── Admin panel endpoints (for React Frontend) ───────────────────────────────


@app.route("/api/admin/dashboard", methods=["GET"])
@admin_required
def api_admin_dashboard():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    total_users = cur.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    pending_requests = cur.execute(
        "SELECT COUNT(*) FROM kb_requests WHERE status='pending'"
    ).fetchone()[0]
    total_kb_entries = cur.execute("SELECT COUNT(*) FROM medical_knowledge").fetchone()[
        0
    ]
    today_str = date.today().isoformat()
    queries_today = cur.execute(
        "SELECT COUNT(*) FROM query_logs WHERE DATE(queried_at) = ?", (today_str,)
    ).fetchone()[0]
    conn.close()

    return jsonify(
        {
            "total_users": total_users,
            "pending_requests": pending_requests,
            "total_kb_entries": total_kb_entries,
            "queries_today": queries_today,
        }
    )


@app.route("/api/admin/kb_requests", methods=["GET"])
@admin_required
def api_admin_kb_requests():
    include_approved = request.args.get("include_approved") == "true"
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    
    if include_approved:
        # Include both pending and auto-generated approved entries
        rows = cur.execute(
            "SELECT * FROM kb_requests WHERE status='pending' OR (status='approved' AND is_auto_generated=1) ORDER BY submitted_at DESC"
        ).fetchall()
    else:
        rows = cur.execute(
            "SELECT * FROM kb_requests WHERE status='pending' ORDER BY submitted_at DESC"
        ).fetchall()
        
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route("/api/admin/kb_requests/<int:req_id>/approve", methods=["POST"])
@admin_required
def api_approve_kb_request(req_id):
    from backend.chat_db import log_admin_action

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    row = conn.execute("SELECT * FROM kb_requests WHERE id = ?", (req_id,)).fetchone()
    if not row:
        conn.close()
        return jsonify({"success": False, "message": "Request not found"}), 404

    symptom = row[4]
    drug = row[5]

    cur.execute(
        "UPDATE kb_requests SET status='approved', reviewed_at=? WHERE id=?",
        (datetime.now().isoformat(), req_id),
    )

    # Try to connect to the knowledge base DB
    kb_path = os.path.join(os.path.dirname(__file__), "medical kb/medical_kb.db")
    if os.path.exists(kb_path):
        kb_conn = sqlite3.connect(kb_path)
        kb_conn.execute(
            "INSERT INTO medical_knowledge (symptom, drug, mechanism, precautions) VALUES (?, ?, ?, ?)",
            (symptom, drug, row[6], row[7]),
        )
        kb_conn.commit()
        kb_conn.close()

    conn.commit()
    conn.close()

    # Log admin action
    log_admin_action(
        g.user_id,
        g.user_email,
        g.username,
        "approved_kb_request",
        "kb_request",
        req_id,
        f"Approved: {symptom} - {drug}",
    )

    return jsonify({"success": True})


@app.route("/api/admin/kb_requests/<int:req_id>/reject", methods=["POST"])
@admin_required
def api_reject_kb_request(req_id):
    from backend.chat_db import log_admin_action

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    row = conn.execute("SELECT * FROM kb_requests WHERE id = ?", (req_id,)).fetchone()
    symptom = row[4] if row else None
    drug = row[5] if row else None

    cur.execute(
        "UPDATE kb_requests SET status='rejected', reviewed_at=? WHERE id=?",
        (datetime.now().isoformat(), req_id),
    )
    conn.commit()
    conn.close()

    # Log admin action
    log_admin_action(
        g.user_id,
        g.user_email,
        g.username,
        "rejected_kb_request",
        "kb_request",
        req_id,
        f"Rejected: {symptom} - {drug}",
    )

    return jsonify({"success": True})


@app.route("/api/admin/kb_requests/approved", methods=["GET"])
@admin_required
def api_admin_kb_requests_approved():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("""
        SELECT id, user_id, username, user_email, suggested_symptom, suggested_drug,
               suggested_mechanism, suggested_precautions, user_note, status, submitted_at, reviewed_at
        FROM kb_requests
        WHERE status = 'approved'
        ORDER BY reviewed_at DESC
        LIMIT 10
    """)
    rows = cur.fetchall()
    conn.close()

    entries = []
    for row in rows:
        entries.append(
            {
                "id": row[0],
                "user_id": row[1],
                "username": row[2],
                "user_email": row[3],
                "suggested_symptom": row[4],
                "suggested_drug": row[5],
                "suggested_mechanism": row[6],
                "suggested_precautions": row[7],
                "user_note": row[8],
                "status": row[9],
                "submitted_at": row[10],
                "reviewed_at": row[11],
            }
        )
    return jsonify(entries)


@app.route("/api/admin/kb/approved", methods=["GET"])
@admin_required
def api_admin_kb_approved():
    from backend.query_engine import get_all_knowledge

    # Get entries from medical_knowledge
    kb_entries = get_all_knowledge()

    # Also get approved entries from kb_requests (includes auto-generated)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    kb_requests = cur.execute("""
        SELECT id, suggested_symptom as symptom, suggested_drug as drug, 
               suggested_mechanism as mechanism, suggested_precautions as precautions,
               is_auto_generated
        FROM kb_requests WHERE status = 'approved'
    """).fetchall()
    conn.close()

    # Combine both sources
    all_entries = []
    for entry in kb_entries:
        all_entries.append(
            {**entry, "is_auto_generated": False, "source": "medical_kb"}
        )
    for entry in kb_requests:
        all_entries.append({**dict(entry), "source": "kb_requests"})

    return jsonify(all_entries)


@app.route("/api/admin/kb/<int:entry_id>", methods=["DELETE"])
@admin_required
def api_admin_kb_delete(entry_id):
    from backend.chat_db import log_admin_action
    
    source = request.args.get("source", "medical_kb")
    symptom_name = "Unknown"
    
    try:
        if source == "medical_kb":
            # Delete from curated medical_knowledge
            kb_path = os.path.join(os.path.dirname(__file__), "medical kb/medical_kb.db")
            conn = sqlite3.connect(kb_path)
            cur = conn.cursor()
            
            # Get symptom name for logging before deletion using ROWID
            row = cur.execute("SELECT symptom FROM medical_knowledge WHERE ROWID = ?", (entry_id,)).fetchone()
            if row:
                symptom_name = row[0]
                cur.execute("DELETE FROM medical_knowledge WHERE ROWID = ?", (entry_id,))
                
            conn.commit()
            conn.close()
            
        else:
            # Delete from kb_requests (chat.db)
            # Use the correct relative path for chat.db via DB_PATH import
            conn = sqlite3.connect(DB_PATH)
            cur = conn.cursor()
            
            # Get symptom name for logging
            row = cur.execute("SELECT suggested_symptom FROM kb_requests WHERE id = ?", (entry_id,)).fetchone()
            if row:
                symptom_name = row[0]
                cur.execute("DELETE FROM kb_requests WHERE id = ?", (entry_id,))
                
            conn.commit()
            conn.close()

        # Log admin action
        log_admin_action(
            g.user_id,
            g.user_email,
            g.username,
            "delete_kb_entry",
            "kb_entry",
            entry_id,
            f"Deleted {source} entry: {symptom_name}",
        )
        
        # Refresh the cache in query_engine to reflect the deletion
        from backend.query_engine import refresh_kb_cache
        refresh_kb_cache()
        
        return jsonify({"success": True})

    except Exception as e:
        print(f"[admin_kb] Delete failed: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/admin/kb/<int:entry_id>", methods=["DELETE"])
@admin_required
def api_delete_kb_entry(entry_id):
    source = request.args.get("source", "medical_kb")

    try:
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()

        if source == "kb_requests":
            cur.execute("DELETE FROM kb_requests WHERE id = ?", (entry_id,))
        else:
            cur.execute("DELETE FROM medical_knowledge WHERE ROWID = ?", (entry_id,))

        conn.commit()
        affected = cur.rowcount
        conn.close()

        if affected > 0:
            return jsonify({"success": True})
        return jsonify({"success": False, "message": "Entry not found"}), 404
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route("/api/admin/kb/stats", methods=["GET"])
@admin_required
def api_admin_kb_stats():
    from backend.query_engine import get_kb_stats

    return jsonify(get_kb_stats())


@app.route("/api/admin/users", methods=["GET"])
@admin_required
def api_admin_users():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    rows = cur.execute(
        """SELECT u.id, u.username, u.email, u.created_at, u.is_banned,
                  COUNT(q.id) as query_count
           FROM users u
           LEFT JOIN query_logs q ON q.user_id = u.id
           GROUP BY u.id
           ORDER BY u.created_at DESC"""
    ).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route("/api/admin/users/<int:user_id>/ban", methods=["POST"])
@admin_required
def api_ban_user(user_id):
    from backend.chat_db import log_admin_action

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    row = conn.execute(
        "SELECT email, username FROM users WHERE id=?", (user_id,)
    ).fetchone()
    if not row:
        conn.close()
        return jsonify({"success": False, "message": "User not found"}), 404
    if row["email"].lower() == ADMIN_EMAIL.lower():
        conn.close()
        return jsonify(
            {"success": False, "message": "Cannot ban the admin account"}
        ), 403
    conn.execute("UPDATE users SET is_banned=1 WHERE id=?", (user_id,))
    conn.commit()
    conn.close()

    # Log admin action
    log_admin_action(
        g.user_id,
        g.user_email,
        g.username,
        "banned_user",
        "user",
        user_id,
        f"Banned user: {row['email']}",
    )

    return jsonify({"success": True})


@app.route("/api/admin/users/<int:user_id>/unban", methods=["POST"])
@admin_required
def api_unban_user(user_id):
    from backend.chat_db import log_admin_action

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    row = conn.execute(
        "SELECT email, username FROM users WHERE id=?", (user_id,)
    ).fetchone()
    conn.execute("UPDATE users SET is_banned=0 WHERE id=?", (user_id,))
    conn.commit()
    conn.close()

    # Log admin action
    log_admin_action(
        g.user_id,
        g.user_email,
        g.username,
        "unbanned_user",
        "user",
        user_id,
        f"Unbanned user: {row['email']}" if row else f"Unbanned user ID: {user_id}",
    )

    return jsonify({"success": True})


@app.route("/api/admin/users/<int:user_id>", methods=["DELETE"])
@admin_required
def api_delete_user(user_id):
    from backend.chat_db import log_admin_action

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    row = conn.execute(
        "SELECT email, username FROM users WHERE id=?", (user_id,)
    ).fetchone()
    if not row:
        conn.close()
        return jsonify({"success": False, "message": "User not found"}), 404
    if row["email"].lower() == ADMIN_EMAIL.lower():
        conn.close()
        return jsonify(
            {"success": False, "message": "Cannot delete the admin account"}
        ), 403

    username = row["username"]
    user_email = row["email"]

    conn.execute("DELETE FROM query_logs WHERE user_id=?", (user_id,))
    conn.execute("DELETE FROM kb_requests WHERE user_id=?", (user_id,))
    conn.execute("DELETE FROM users WHERE id=?", (user_id,))
    conn.commit()
    conn.close()

    log_admin_action(
        g.user_id,
        g.user_email,
        g.username,
        "deleted_user",
        "user",
        user_id,
        f"Deleted user: {username} ({user_email})",
    )

    return jsonify({"success": True})


@app.route("/api/admin/analytics", methods=["GET"])
@admin_required
def api_admin_analytics():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    # Total users and active users
    total_users = cur.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    active_users = cur.execute(
        "SELECT COUNT(*) FROM users WHERE is_banned = 0"
    ).fetchone()[0]

    # Total chats (from query_logs)
    total_chats = cur.execute("SELECT COUNT(*) FROM query_logs").fetchone()[0]

    # Total KB entries (approved)
    total_kb_entries = cur.execute(
        "SELECT COUNT(*) FROM kb_requests WHERE status = 'approved'"
    ).fetchone()[0]

    # Pending approvals
    pending_approvals = cur.execute(
        "SELECT COUNT(*) FROM kb_requests WHERE status = 'pending'"
    ).fetchone()[0]

    # Top symptoms from query logs
    top_symptoms = cur.execute(
        """SELECT symptom_detected, COUNT(*) as count FROM query_logs
           WHERE symptom_detected IS NOT NULL AND symptom_detected != ''
           GROUP BY symptom_detected ORDER BY count DESC LIMIT 10"""
    ).fetchall()

    # Chat activity by day (last 7 days)
    daily = cur.execute(
        """SELECT DATE(queried_at) as day, COUNT(*) as count FROM query_logs
           WHERE queried_at >= DATE('now', '-6 days')
           GROUP BY day ORDER BY day ASC"""
    ).fetchall()

    conn.close()
    return jsonify(
        {
            "totalUsers": total_users,
            "activeUsers": active_users,
            "totalChats": total_chats,
            "totalKbEntries": total_kb_entries,
            "pendingApprovals": pending_approvals,
            "chatsByDay": [{"date": r["day"], "count": r["count"]} for r in daily],
            "topSymptoms": [
                {"symptom": r["symptom_detected"], "count": r["count"]}
                for r in top_symptoms
            ],
        }
    )


@app.route("/api/admin/query_logs", methods=["GET"])
@admin_required
def api_admin_query_logs():
    page = int(request.args.get("page", 1))
    per_page = 20
    search = request.args.get("search", "").strip()
    offset = (page - 1) * per_page

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    if search:
        pattern = f"%{search}%"
        rows = cur.execute(
            """SELECT * FROM query_logs
               WHERE username LIKE ? OR symptom_detected LIKE ?
               ORDER BY queried_at DESC LIMIT ? OFFSET ?""",
            (pattern, pattern, per_page, offset),
        ).fetchall()
        total = cur.execute(
            """SELECT COUNT(*) FROM query_logs
               WHERE username LIKE ? OR symptom_detected LIKE ?""",
            (pattern, pattern),
        ).fetchone()[0]
    else:
        rows = cur.execute(
            "SELECT * FROM query_logs ORDER BY queried_at DESC LIMIT ? OFFSET ?",
            (per_page, offset),
        ).fetchall()
        total = cur.execute("SELECT COUNT(*) FROM query_logs").fetchone()[0]

    conn.close()
    return jsonify(
        {
            "logs": [dict(r) for r in rows],
            "total": total,
            "page": page,
            "pages": (total + per_page - 1) // per_page,
        }
    )


@app.route("/api/admin/exit", methods=["POST"])
@admin_required
def api_admin_exit():
    return jsonify({"success": True})


@app.route("/api/admin/audit/logs", methods=["GET"])
@admin_required
def api_admin_audit_logs():
    from backend.chat_db import get_admin_audit_logs

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    # Get user query logs
    query_logs = cur.execute(
        "SELECT id, user_id, username, user_email, symptom_detected, user_message, was_kb_hit, queried_at as created_at, 'user_query' as log_type FROM query_logs ORDER BY queried_at DESC LIMIT 50"
    ).fetchall()

    # Get admin action logs
    admin_logs = cur.execute(
        "SELECT id, admin_user_id as user_id, admin_email as user_email, admin_username as username, action, details, NULL as was_kb_hit, created_at, 'admin_action' as log_type FROM admin_audit_logs ORDER BY created_at DESC LIMIT 50"
    ).fetchall()

    conn.close()

    # Combine and sort by date
    all_logs = sorted(
        [dict(r) for r in query_logs] + [dict(r) for r in admin_logs],
        key=lambda x: x.get("created_at") or "",
        reverse=True,
    )[:100]

    return jsonify({"logs": all_logs})


# ── Default route for React App ──────────────────────────────────────────────


@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_react_app(path):
    # For a React app, Flask typically serves a single index.html
    # and lets React Router handle client-side routing.
    # In this case, since the React app is served separately (e.g., via `npm start`),
    # we don't serve any frontend files directly from Flask for now.
    # This route is a placeholder or could be used to serve a minimal static file
    # if React build output was placed in Flask's static folder.
    return jsonify(
        {
            "message": "Flask backend is running. React frontend should be served separately."
        }
    )


# ── Startup ───────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    init_chat_db()
    # The Flask server will run on port 5000, React on 3000.
    # React will proxy API calls to Flask.
    app.run(debug=True, port=5000)
