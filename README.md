# 🎮 The Imposter Game

A fun multiplayer party game where players try to guess the secret word while imposters try to blend in!

## 🚀 Setup Instructions

### Prerequisites
- Python 3.7 or higher
- A Cohere API key (get one free at [cohere.ai](https://cohere.ai))

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd ImposterGame
```

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

3. Set up your environment variables:
```bash
cp .env.example .env
```

4. Edit the `.env` file and add your Cohere API key:
```
COHERE_API_KEY=your_actual_api_key_here
```

### Running the Game

Start the Flask server:
```bash
python server.py
```

Then open your browser and go to:
```
http://localhost:8000
```

## 🎯 How to Play

1. **Setup**: Add 3-8 players and choose a word category
2. **Word Reveal**: Each player taps to see their role (Crew or Imposter)
3. **Discussion**: Players take turns describing the secret word without saying it
4. **Winner**: Crew wins if imposters are caught, Imposters win if they blend in!

## 🔒 Security Note

The Cohere API key is stored in a `.env` file which is **not** committed to GitHub. Each person who clones this repo needs to add their own API key to use the AI hint feature.

## 🎨 Features

- Kawaii pixel art design
- AI-powered hint generation
- Persistent leaderboard
- Multiple word categories
- Chaos mode for extra fun!

## 📝 License

Feel free to use and modify for personal or educational purposes!
