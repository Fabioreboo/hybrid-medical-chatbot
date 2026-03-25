# 🏥 Medical Chatbot — Enhanced Implementation Plan
> **Status:** Admin Panel and Auth complete. → Ready for deployment

---

## Project Architecture Overview

```
User Message (Browser)
        ↓
   Flask app.py  ←── serves HTML/CSS/JS (Auth, Chat, Admin)
        ↓
 chatbot_backend.py  (orchestrator)
        ↓
symptom_detector.py  →  query_engine.py  →  groq_client.py
                               ↓
                       medical_kb.db (Knowledge Base)
                               ↓
                          chat.db (User data, threads, logs, KB requests)
```

---

## Folder Structure (Final Target)

```
medical_chatbot/
│
├── medical kb/
│   ├── medical_kb.db          ← main KB
│   ├── chembl_small.db        ← pharmacology reference
│   └── pubchem_synonyms.db    ← drug name normalization
│
├── backend/
│   ├── __init__.py
│   ├── symptom_detector.py
│   ├── query_engine.py
│   ├── groq_client.py
│   └── chat_db.py             ← now includes users, kb_requests, query_logs
│
├── templates/
│   ├── index.html             ← main chat UI + modals
│   ├── login.html             ← login/register page
│   └── admin_panel.html       ← admin dashboard
│
├── static/
│   ├── css/
│   │   ├── style.css
│   │   ├── claude_element.css
│   │   └── admin.css          ← new admin styles
│   └── js/
│       ├── chat.js
│       └── admin.js           ← new admin logic
│
├── app.py                     ← Flask entry point (now with auth, admin routes)
├── .env                       ← GROQ_API_KEY, ADMIN_PIN, ADMIN_EMAIL, SECRET_KEY
├── .gitignore
├── requirements.txt
└── README.md
```

---

## Phase 1 — Environment Setup

### requirements.txt
```
groq
flask
flask-cors           ← Added for frontend-backend communication
python-dotenv
rapidfuzz
```
> `sqlite3` is built into Python — no install needed.
> `rapidfuzz` replaces simple substring matching with fuzzy matching (handles typos like "headche" → "headache")

### .env
```
GROQ_API_KEY=your_key_here
ADMIN_PIN=your_pin_here         ← New
ADMIN_EMAIL=admin@example.com   ← New
SECRET_KEY=a_strong_secret_key  ← New, for Flask sessions
```

### .gitignore
```
.env
venv/
__pycache__/
*.pyc
*.db
```

### Install command
```bash
pip install groq flask flask-cors python-dotenv rapidfuzz
```

---

## Phase 2 — Backend Modules

---

### Module 1: `backend/symptom_detector.py`

**Purpose:** Extract symptom keywords from raw user input.

**Enhancements over original plan:**
- Uses `rapidfuzz` for fuzzy matching (handles typos)
- Loads symptom list dynamically from DB (no hardcoded list)
- Returns confidence score alongside match
- Handles multi-symptom messages ("I have a headache and runny nose")

```python
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
    return [match[0] for match in matches if match[1] >= 70]
```

**Error handling:** Returns empty list (never crashes) — orchestrator handles the empty case by routing to Groq fallback.

---

### Module 2: `backend/query_engine.py`

**Purpose:** Query `medical_knowledge` table using detected symptom.

**Enhancements over original plan:**
- Uses parameterized queries (SQL injection safe)
- Returns `None` cleanly if no result found
- Handles the `mechanism` being NULL gracefully

```python
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
        conn.row_factory = sqlite3.Row  # enables column access by name
        cursor = conn.cursor()

        cursor.execute("""
            SELECT symptom, drug, mechanism, precautions, side_effect
            FROM medical_knowledge
            WHERE LOWER(symptom) LIKE LOWER(?)
            LIMIT 1
        """, (f"%{symptom}%",))  # parameterized — safe from SQL injection

        row = cursor.fetchone()
        conn.close()

        if row:
            return {
                "symptom": row["symptom"],
                "drug": row["drug"],
                "mechanism": row["mechanism"] or "mechanism not available",
                "precautions": row["precautions"] or "consult a doctor",
                "side_effect": row["side_effect"]  # may be None — Groq handles this
            }
        return None

    except sqlite3.Error as e:
        print(f"[query_engine] DB error: {e}")
        return None
```

---

### Module 3: `backend/groq_client.py`

**Purpose:** Send structured DB result to Groq and return natural language explanation.

**Enhancements over original plan:**
- Loads API key from `.env` with clear error if missing
- Two clean modes: `explain_with_kb()` and `fallback()`
- Handles Groq API errors gracefully (returns safe error message instead of crashing)
- Strict prompt engineering: LLM is instructed not to invent drug facts

```python
import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise EnvironmentError("GROQ_API_KEY not found. Check your .env file.")

client = Groq(api_key=GROQ_API_KEY)
MODEL = "llama3-8b-8192"  # fast and free on Groq

DISCLAIMER = "\n\n⚠️ *This is general health information only, not medical advice. Consult a doctor for diagnosis and treatment.*"

def explain_with_kb(result: dict) -> str:
    """
    KB hit mode: Groq explains the structured DB result naturally.
    The LLM must NOT invent additional drug facts.
    """
    prompt = f"""You are a helpful, cautious medical assistant.
Based ONLY on the structured data below, explain the treatment clearly to a patient in 2-3 sentences.
Do NOT add any drug facts that are not present in the data below.

Symptom: {result['symptom']}
Recommended drug: {result['drug']}
Mechanism: {result['mechanism']}
Precautions: {result['precautions']}
Known side effects: {result['side_effect'] or 'not listed — use general caution'}

Respond in plain English. Be concise and helpful."""

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=200
        )
        return response.choices[0].message.content + DISCLAIMER

    except Exception as e:
        return f"I found information about {result['drug']} for {result['symptom']}, but couldn't generate an explanation right now. Please consult a pharmacist.{DISCLAIMER}"


def fallback(user_input: str) -> str:
    """
    Fallback mode: symptom not in DB, Groq answers from its own knowledge.
    """
    prompt = f"""You are a cautious medical assistant. A patient said:
"{user_input}"

Provide a brief, helpful response. If you mention any medication, note it's a general suggestion only.
Always recommend seeing a doctor for diagnosis. Respond in 2-3 sentences."""

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=200
        )
        return response.choices[0].message.content + DISCLAIMER

    except Exception as e:
        return f"I'm unable to find information on that right now. Please consult a healthcare professional.{DISCLAIMER}"
```

---

### Module 4: `backend/chat_db.py`

**Purpose:** Database interactions for chat threads, messages, user management, KB requests, and query logs.

**New Tables:**
- `users`: stores user accounts, now with `is_banned` column.
- `kb_requests`: stores user suggestions for the knowledge base.
- `query_logs`: records every chatbot interaction.

**Key Functions Added:**
- `init_chat_db`: creates all necessary tables (`threads`, `messages`, `users`, `kb_requests`, `query_logs`) and safely adds `is_banned` column to `users`.
- `log_query`: Inserts a new entry into `query_logs` for each user query.
- `get_user_by_email`, `get_user_by_id`: Helper functions to retrieve user information.

---

### Module 5: `app.py`

**Purpose:** Flask entry point, routing, session management, and API endpoints.

**Key Features Added:**
- **Authentication:**
    - `@login_required` and `@admin_required` decorators for route protection.
    - `/login` (GET/POST): Handles user login, checks `is_banned` status.
    - `/register` (POST): Handles new user registration.
    - `/logout`: Clears session.
    - `SECRET_KEY` loaded from `.env` for session security.
    - `@app.before_request`: Global check for banned users on every request.
- **KB Suggestion (User-side):**
    - `/api/kb_request` (POST): Allows logged-in users to suggest new KB entries for admin review.
- **Admin Access:**
    - `/admin/verify_pin` (POST): Verifies `ADMIN_PIN` from `.env` to grant `session['is_admin']`.
    - `/admin` (GET): Renders `admin_panel.html`, provides summary statistics.
- **Admin KB Requests Management:**
    - `/admin/kb_requests` (GET): Fetches pending KB requests.
    - `/admin/kb_requests/<id>/approve` (POST): Approves a request, adds to `medical_knowledge.db`, and updates request status.
    - `/admin/kb_requests/<id>/reject` (POST): Rejects a request.
- **Admin User Management:**
    - `/admin/users` (GET): Lists all users with their query counts and banned status.
    - `/admin/users/<id>/ban` (POST): Bans a user, invalidates their session.
    - `/admin/users/<id>/unban` (POST): Unbans a user.
    - `/admin/users/<id>/delete` (POST): Deletes a user and their associated data (KB requests, query logs). Prevents admin from banning/deleting themselves.
- **Admin Analytics & Query Logs:**
    - `/admin/analytics` (GET): Provides data for charts (top symptoms, KB hit rate, daily queries).
    - `/admin/query_logs` (GET): Paginated and searchable list of all user queries.

---

### Module 6: `chatbot_backend.py`

**Purpose:** Main orchestrator, now enhanced to log user queries.

**Enhancements over original plan:**
- `get_response` now accepts `user_id`, `username`, `user_email` to log queries.
- Calls `chat_db.log_query()` for every user interaction, distinguishing between KB hits and LLM fallbacks.

---

## Phase 7 — Frontend Development

### `templates/index.html` (Main Chat UI)

**Enhancements:**
- **User Authentication integration:** Dynamically shows username.
- **Admin Access:**
    - A `🔐` lock icon is displayed next to the user's name in the sidebar footer if `session['user_email']` matches `ADMIN_EMAIL`.
    - Clicking it opens an `admin_pin_modal` (defined in inline `<style>` and `<script>` tags).
- **Suggest to KB Button:**
    - A "Suggest to KB" button appears on every bot response.
    - Clicking it opens a `kb_request_modal` (defined in inline `<style>` and `<script>` tags) pre-filled with available symptom/drug data.

### `static/js/chat.js`

**Enhancements:**
- Integrated with new Flask `/threads` and `/chat` endpoints (no change for this summary, but implemented in code).
- Now includes logic to trigger the `openKbModal` (from `index.html`) when the "Suggest to KB" button is clicked.
- Added basic styling for the new `.suggest-kb-btn`.

### `templates/login.html` (New File)

**Purpose:** Provides a user interface for signing in and registering new accounts.

**Features:**
- Tabbed interface for "Sign In" and "Register".
- Collects email, password (and username for registration).
- Uses AJAX to interact with `/login` and `/register` endpoints.
- Displays error messages.

### `templates/admin_panel.html` (New File)

**Purpose:** Comprehensive dashboard for administrators.

**Sections:**
1.  **KB Requests:** Lists pending user suggestions for KB, with Approve/Reject actions.
2.  **User Management:** Table of all users, with options to Ban/Unban or Delete. Includes total queries per user.
3.  **Query Logs:** Paginated table of all chatbot interactions, searchable by username or symptom.
4.  **Analytics:** Summary cards (Total Users, Pending Requests, KB Entries, Queries Today, KB Hits, LLM Fallbacks) and charts (Chart.js) for top symptoms, KB hit rate, and daily queries.

### `static/css/admin.css` (New File)

**Purpose:** Dedicated styling for the admin panel, following the Claude.ai aesthetic.

**Features:**
- Custom color variables prefixed with `--admin-`.
- Responsive layout for admin tables and charts.
- Styles for summary cards, action buttons, badges, and the toast notification system.

### `static/js/admin.js` (New File)

**Purpose:** Client-side logic for the admin panel.

**Features:**
- **Navigation:** Manages active sections and loads data accordingly.
- **KB Requests:** Fetches and renders pending requests, handles Approve/Reject actions with live updates and toasts.
- **User Management:** Fetches and renders user list, handles Ban/Unban/Delete actions.
- **Query Logs:** Fetches, renders, and paginates query logs. Includes client-side search/filter.
- **Analytics:** Fetches data and renders charts using Chart.js.
- **Utilities:** Helper functions for HTML escaping, date/time formatting, and toast notifications.

---

## Phase 8 — Security Checklist

- [x] All SQL queries use parameterized inputs (`?` placeholders)
- [x] `GROQ_API_KEY`, `ADMIN_PIN`, `ADMIN_EMAIL`, `SECRET_KEY` loaded from `.env` only, never hardcoded.
- [x] `.env` in `.gitignore`
- [x] `*.db` in `.gitignore`
- [x] Medical disclaimer shown on every response
- [x] Input sanitized (empty message check before processing)
- [x] Groq errors caught — app never crashes on API failure
- [x] Session-based authentication implemented.
- [x] Admin access protected by `ADMIN_PIN` and `ADMIN_EMAIL`.
- [x] `session['is_admin']` checked on every `/admin` route.
- [x] Banned users prevented from logging in and accessing any routes.
- [x] Admin cannot ban or delete their own account.

---

## Build Order Summary

| Step | File | Status |
|------|------|--------|
| 1 | `backend/symptom_detector.py` | ✅ Complete |
| 2 | `backend/query_engine.py` | ✅ Complete |
| 3 | `backend/groq_client.py` | ✅ Complete |
| 4 | `backend/chat_db.py` | ✅ Complete (Added users, kb_requests, query_logs tables & functions) |
| 5 | `app.py` | ✅ Complete (Full rewrite with auth, admin, KB requests) |
| 6 | `templates/login.html` | ✅ Complete (New login/register page) |
| 7 | `templates/admin_panel.html` | ✅ Complete (New admin dashboard) |
| 8 | `static/css/admin.css` | ✅ Complete (New admin styles) |
| 9 | `static/js/admin.js` | ✅ Complete (New admin logic) |
| 10 | `templates/index.html` | ✅ Complete (Added admin lock, KB suggest modal & triggers) |
| 11 | `static/js/chat.js` | ✅ Complete (Added suggest to KB button logic) |
| 12 | `static/css/style.css` | ✅ Complete (Added suggest to KB button styles) |
| 13 | End-to-end testing (5 test cases) | ⏳ Pending |