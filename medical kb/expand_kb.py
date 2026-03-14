import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), "medical_kb.db")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Step 1 — Delete the accidental header row
cursor.execute("DELETE FROM medical_knowledge WHERE symptom = 'symptom'")
print("Deleted header row")

# Step 2 — For null drug rows, extract first drug from recommended_otc_medicine
cursor.execute("""
    UPDATE medical_knowledge
    SET drug = (
        SELECT TRIM(LOWER(
            CASE 
                WHEN INSTR(recommended_otc_medicine, ' or ') > 0 
                THEN SUBSTR(recommended_otc_medicine, 1, INSTR(recommended_otc_medicine, ' or ') - 1)
                WHEN INSTR(recommended_otc_medicine, ',') > 0 
                THEN SUBSTR(recommended_otc_medicine, 1, INSTR(recommended_otc_medicine, ',') - 1)
                ELSE recommended_otc_medicine
            END
        ))
        FROM symptom_treatments st
        WHERE st.symptom = medical_knowledge.symptom
    )
    WHERE drug IS NULL
""")

conn.commit()

# Verify
cursor.execute("SELECT COUNT(*) FROM medical_knowledge")
print("Total rows:", cursor.fetchone())

cursor.execute("SELECT COUNT(*) FROM medical_knowledge WHERE drug IS NULL")
print("Null drug rows remaining:", cursor.fetchone())

cursor.execute("SELECT symptom, drug FROM medical_knowledge LIMIT 10")
print("Sample rows:")
for row in cursor.fetchall():
    print(" ", row)

conn.close()
print("Done!")