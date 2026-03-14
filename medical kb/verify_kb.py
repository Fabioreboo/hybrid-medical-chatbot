import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), "medical_kb.db")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
print("Tables:", cursor.fetchall())

cursor.execute("SELECT COUNT(*) FROM symptom_treatments")
print("symptom_treatments rows:", cursor.fetchone())

cursor.execute("SELECT DISTINCT symptom FROM symptom_treatments LIMIT 20")
print("Sample symptoms:", cursor.fetchall())

conn.close()