from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import requests
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

COHERE_API_KEY = os.getenv('COHERE_API_KEY')

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

@app.route('/api/generate-hint', methods=['POST'])
def generate_hint():
    try:
        data = request.json
        secret_word = data.get('secretWord')
        
        if not secret_word:
            return jsonify({'error': 'Secret word is required'}), 400
        
        if not COHERE_API_KEY:
            return jsonify({'error': 'API key not configured'}), 500
        
        # Call Cohere API
        response = requests.post(
            'https://api.cohere.ai/v1/chat',
            headers={
                'Authorization': f'Bearer {COHERE_API_KEY}',
                'Content-Type': 'application/json'
            },
            json={
                'message': f'''Give me ONE word that is loosely related to "{secret_word}" and in the SAME CATEGORY. The word should help someone guess what general category or type of thing it is without revealing the exact word.

Examples:
- "Pizza" → "Italian", "Restaurant", "Cheese"
- "Cashier" → "Retail", "Store", "Customer"
- "Scissors" → "Cutting", "Sharp", "Paper"
- "Dog" → "Animal", "Companion", "Furry"
- "Seal" → "Ocean", "Marine", "Swim"
- "Teacher" → "Guide", "Course", "Learning"
- "Apple" → "Fruit", "Sweet", "Orchard"

IMPORTANT: The hint MUST be loosely related to the same type/category. Do NOT give unrelated words, but also do not give overly specific words that reveal the secret word.

Now give me ONLY ONE word for "{secret_word}":''',
                'model': 'command',
                'temperature': 0.3
            }
        )
        
        if response.status_code != 200:
            return jsonify({'error': 'Cohere API request failed'}), response.status_code
        
        return jsonify(response.json())
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True)
