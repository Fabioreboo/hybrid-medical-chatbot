# Medical Chatbot — Project Briefing for Antigravity IDE

## What This Project Is

A **hybrid AI medical chatbot** that answers user health questions by combining:
- A curated **SQL knowledge base** built from real biomedical datasets
- The **Groq LLM API** for natural language explanation and fallback

The key design principle: the database provides the **facts**, the LLM provides the **explanation**.
This prevents hallucination, which is the core problem with pure LLM medical assistants.

---

## Current Project Status

> **The database phase is 100% complete. No more data engineering needed.**

The knowledge base has been fully built and curated. The next phase is writing the Python
backend that connects user input → database → Groq LLM → response.

---

## System Architecture

```
User Message
     ↓
Python Backend
     ↓
Symptom Detection (keyword extraction)
     ↓
SQL Query → medical_kb.db
     ↓
┌────────────────────────────────┐
│ Result found?                  │
│  YES → structured DB result    │
│         + Groq explains it     │
│  NO  → Groq LLM fallback       │
└────────────────────────────────┘
     ↓
Final Natural Language Response
```

### Example Flow

User types: `"I have a headache"`

1. System detects symptom: `headache`
2. Queries `medical_knowledge` table
3. Gets back:
   - drug: `ibuprofen`
   - mechanism: `cyclooxygenase inhibitor`
   - precautions: `avoid if allergic or with stomach ulcers`
4. Sends structured result to Groq
5. Groq returns:

> *"Headaches are often treated with ibuprofen, which works by blocking cyclooxygenase
> enzymes that cause inflammation and pain. Avoid using it if you are allergic to NSAIDs
> or have stomach ulcers."*

---

## Knowledge Base Files (Already Built)

Located in: `knowledge_base/` folder

### 1. `medical_kb.db` — Main Knowledge Base
The primary database the chatbot queries.

**Tables:**
- `symptom_treatments` — custom curated dataset
- `medical_knowledge` — final merged curated layer

**Columns in `medical_knowledge`:**
| Column | Description |
|---|---|
| `symptom` | e.g. headache, fever, runny nose |
| `drug` | e.g. ibuprofen, loratadine |
| `chembl_id` | e.g. CHEMBL521 |
| `mechanism` | e.g. Cyclooxygenase inhibitor |
| `side_effect` | nullable — filled by LLM if missing |
| `precautions` | e.g. avoid if allergic or with stomach ulcers |

**Indexes already created:**
- `idx_symptom_lookup` on `symptom`
- `idx_drug_lookup` on `drug`

### 2. `chembl_small.db` — Pharmacology Data
Extracted from the full 28GB ChEMBL database (filtered to relevant drugs only).

**Tables used:**
- `molecule_dictionary` — canonical drug names + ChEMBL IDs
- `drug_mechanism` — mechanism of action per drug

### 3. `pubchem_synonyms.db` — Drug Name Normalization
Resolves different names for the same drug to one canonical identity.

**Example:**
```
acetaminophen
paracetamol       →  same compound (CID 1983)
tylenol
```

---

## Raw Datasets (Archived — Not Needed at Runtime)

These were used to build the knowledge base but the chatbot does NOT read them directly.

| Dataset | Used For | Status |
|---|---|---|
| ChEMBL (28GB) | Drug mechanisms | ✅ Extracted into chembl_small.db |
| PubChem Synonyms | Drug name normalization | ✅ Extracted into pubchem_synonyms.db |
| SIDER | Side effects | ✅ Partially integrated (nulls filled by LLM) |
| MedQA | Future evaluation/testing | ⏳ Not used yet |
| Disease Ontology | Future disease hierarchy | ⏳ Not used yet |
| drug_atc.tsv | Future drug classification | ⏳ Not used yet |

---

## Project Folder Structure (Target)

```
medical_chatbot/
│
├── knowledge_base/
│   ├── medical_kb.db          ← main KB, chatbot queries this
│   ├── chembl_small.db        ← pharmacology reference
│   └── pubchem_synonyms.db    ← drug name normalization
│
├── backend/
│   ├── symptom_detector.py    ← extracts symptom keywords from user message
│   ├── query_engine.py        ← runs SQL queries against medical_kb.db
│   └── groq_client.py         ← sends structured data to Groq, handles fallback
│
├── app/
│   └── chatbot_backend.py     ← main orchestrator, wires all modules together
│
├── .env                       ← stores GROQ_API_KEY (never commit this)
├── requirements.txt           ← Python dependencies
└── README.md
```

---

## Python Backend Modules to Build

### Module 1: `symptom_detector.py`
**Purpose:** Extract symptom keywords from a raw user message.

**Input:** `"my head is killing me and I feel feverish"`
**Output:** `["headache", "fever"]`

**Approach:** Keyword matching against known symptom list from DB.
No need for complex NLP — simple fuzzy matching is sufficient.

### Module 2: `query_engine.py`
**Purpose:** Query `medical_knowledge` table using detected symptom.

**Input:** `"headache"`
**Output:**
```python
{
  "symptom": "headache",
  "drug": "ibuprofen",
  "mechanism": "Cyclooxygenase inhibitor",
  "precautions": "avoid if allergic or with stomach ulcers",
  "side_effect": None
}
```

**Core SQL:**
```sql
SELECT * FROM medical_knowledge
WHERE symptom LIKE '%headache%'
LIMIT 1;
```

### Module 3: `groq_client.py`
**Purpose:** Take structured DB result and return a natural language explanation.

**Two modes:**
1. **KB hit mode** — DB found a result, Groq explains it naturally
2. **Fallback mode** — DB found nothing, Groq answers from its own knowledge

**Prompt structure (KB hit mode):**
```
You are a helpful medical assistant. Based on the following structured data,
explain the treatment clearly and safely to a patient:

Symptom: {symptom}
Recommended drug: {drug}
Mechanism: {mechanism}
Precautions: {precautions}

Respond in 2-3 sentences. Do not invent additional facts.
```

### Module 4: `chatbot_backend.py`
**Purpose:** Main orchestrator that wires all modules together.

**Logic flow:**
```python
user_input → symptom_detector → symptoms[]
if symptoms:
    result = query_engine(symptoms[0])
    if result:
        response = groq_client.explain_with_kb(result)
    else:
        response = groq_client.fallback(user_input)
else:
    response = groq_client.fallback(user_input)
return response
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Language | Python 3.10+ |
| Database | SQLite (via `sqlite3` built-in) |
| LLM API | Groq API (`groq` Python package) |
| Web Interface | Flask (lightweight web UI) |
| IDE | Antigravity IDE with Claude Code extension |

---

## Dependencies (requirements.txt)

```
groq
flask
python-dotenv
```

> `sqlite3` is built into Python — no install needed.

---

## Environment Variables (.env)

```
GROQ_API_KEY=your_key_here
```

Get a free key at: https://console.groq.com

---

## Interface Decision

**Chosen interface: Flask Web App**

Reason: The backend and knowledge base are solid. A Flask web UI takes minimal extra effort
and produces a presentable chatbot interface suitable for demos and academic submission.
It runs locally in a browser — no deployment needed unless desired.

---

## What Has Been Done vs What Remains

### ✅ Completed
- Downloaded and processed ChEMBL, PubChem, SIDER datasets
- Built `chembl_small.db` (filtered from 28GB source)
- Built `pubchem_synonyms.db` (drug name resolution)
- Built `medical_kb.db` with curated `medical_knowledge` table
- Created symptom → drug → mechanism → precautions knowledge layer
- Created DB indexes for fast lookup

### 🔲 Remaining (in order)
1. Set up Python environment + install dependencies
2. Configure Groq API key in `.env`
3. Build `symptom_detector.py`
4. Build `query_engine.py`
5. Build `groq_client.py`
6. Build `chatbot_backend.py` (orchestrator)
7. Build Flask web interface
8. Test end-to-end with real user questions

---

## Important Constraints

- The chatbot must **query the DB first** before touching the LLM
- The LLM must **not invent drug facts** — it only explains what the DB returns
- Side effects may be `NULL` in the DB — the LLM can supplement these
- Docker is **not needed** at this stage — local Flask is sufficient
- Raw datasets are **not read at runtime** — only the 3 KB files are needed

---

## Goal Summary

Build a working hybrid medical chatbot that:
1. Accepts natural language health questions
2. Detects symptoms from the message
3. Retrieves factual drug + mechanism + precaution data from SQLite
4. Uses Groq LLM to explain the result naturally
5. Falls back to LLM-only if the symptom is not in the database
6. Presents responses through a clean Flask web interface
