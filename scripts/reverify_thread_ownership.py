import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "../medical kb/chat.db")

def fix_thread_ownership():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    print("--- Starting Thread Ownership Re-verification ---")
    
    # Identify threads belonging to user_id=1 (Admin)
    cursor.execute("SELECT id, title FROM threads WHERE user_id = 1")
    admin_threads = cursor.fetchall()
    
    updates_performed = 0
    
    for thread in admin_threads:
        thread_id = thread['id']
        print(f"Checking thread: {thread_id} ('{thread['title']}')")
        
        # Look for messages in this thread
        cursor.execute("SELECT content FROM messages WHERE thread_id = ? AND role = 'user' LIMIT 3", (thread_id,))
        user_messages = cursor.fetchall()
        
        if not user_messages:
            print(f"  - No user messages found for thread {thread_id}. Skipping.")
            continue
            
        found_owner = False
        for msg in user_messages:
            content = msg['content']
            
            # Find a matching query log
            cursor.execute("""
                SELECT user_id, user_email 
                FROM query_logs 
                WHERE user_message = ? 
                AND user_id != 1
                LIMIT 1
            """, (content,))
            log = cursor.fetchone()
            
            if log:
                potential_owner_id = log['user_id']
                potential_owner_email = log['user_email']
                print(f"  + Potential owner found: User {potential_owner_id} ({potential_owner_email})")
                
                # Reassign the thread
                cursor.execute("UPDATE threads SET user_id = ? WHERE id = ?", (potential_owner_id, thread_id))
                updates_performed += 1
                found_owner = True
                break
                
        if not found_owner:
            print(f"  - Could not definitively reassign thread {thread_id} using logs.")

    conn.commit()
    conn.close()
    print(f"--- Finished. {updates_performed} threads reassigned. ---")

if __name__ == "__main__":
    fix_thread_ownership()
