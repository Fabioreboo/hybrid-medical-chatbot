import unittest
import json
import os
import sys

# Ensure root directory is in path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

try:
    from app import app
except ImportError:
    # Fallback if running from root
    from app import app

import sqlite3
DB_PATH = os.path.join(os.path.dirname(__file__), "../medical kb/chat.db")

class PrivacyTest(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()
        # Ensure we have at least two users
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        
        # User 1 (Admin) - already exists in your DB
        # Create User 99 (Test)
        cur.execute("INSERT OR IGNORE INTO users (id, username, email, password_hash) VALUES (99, 'TestUser', 'test@example.com', 'hash')")
        
        # Create Thread for User 1
        cur.execute("INSERT OR IGNORE INTO threads (id, user_id, title) VALUES ('thread-admin-1', 1, 'Admin Secret Thread')")
        
        # Create Thread for User 99
        cur.execute("INSERT OR IGNORE INTO threads (id, user_id, title) VALUES ('thread-test-1', 99, 'Test Private Thread')")
        
        conn.commit()
        conn.close()

    def test_unauthorized_thread_access_denied(self):
        # User 99 tries to access User 1's thread via /api/chat
        payload = {
            "message": "Hello",
            "thread_id": "thread-admin-1"
        }
        headers = {
            "X-User-Email": "test@example.com",
            "X-User-Name": "TestUser"
        }
        response = self.client.post('/api/chat', 
                                   data=json.dumps(payload),
                                   content_type='application/json',
                                   headers=headers)
        
        self.assertEqual(response.status_code, 403)
        self.assertIn(b"Unauthorized access to thread", response.data)

    def test_list_threads_privacy(self):
        # User 99 should only see their own threads
        headers = {
            "X-User-Email": "test@example.com",
            "X-User-Name": "TestUser"
        }
        response = self.client.get('/api/threads', headers=headers)
        data = json.loads(response.data)
        
        thread_ids = [t['id'] for t in data]
        self.assertIn('thread-test-1', thread_ids)
        self.assertNotIn('thread-admin-1', thread_ids)

if __name__ == '__main__':
    unittest.main()
