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

    if not user_input:
        return jsonify({"error": "Empty message"}), 400

    result = get_response(user_input)
    return jsonify(result)


@app.route("/save-kb", methods=["POST"])
def save_kb():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    result = save_to_kb(data)
    return jsonify(result)


if __name__ == "__main__":
    app.run(debug=True)
