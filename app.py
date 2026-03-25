from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from backend.chatbot_backend import get_response, save_to_kb

app = Flask(__name__)
CORS(app)

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json()
    user_input = data.get("message", "").strip()
    thread_id = data.get("thread_id")

    if not user_input:
        return jsonify({"error": "Empty message"}), 400

    result = get_response(user_input, thread_id)
    return jsonify(result)

@app.route("/threads", methods=["GET"])
def threads():
    from backend.chat_db import get_threads
    return jsonify(get_threads())

@app.route("/threads/<thread_id>", methods=["GET"])
def thread_messages(thread_id):
    from backend.chat_db import get_messages
    return jsonify(get_messages(thread_id))

@app.route("/save-kb", methods=["POST"])
def save_kb():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    result = save_to_kb(data)
    return jsonify(result)


if __name__ == "__main__":
    from backend.chat_db import init_chat_db
    init_chat_db()
    app.run(debug=True)
