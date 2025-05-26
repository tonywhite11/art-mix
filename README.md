# LexiMix

LexiMix is a playful, creative web application that lets users blend two words to generate a new, whimsical word and an AI-generated artistic image inspired by that blend. It leverages OpenAI's GPT models for word blending and Together's image generation API for visuals. The app is built with FastAPI (Python backend), HTML/CSS/JS (frontend), Tailwind CSS, DaisyUI, and anime.js for a modern, animated, and mobile-friendly experience.

## Features

- **Word Blending:** Select any two words from a colorful, animated word cloud. LexiMix uses GPT-4o to invent a new portmanteau or blend.
- **AI Art Generation:** For each new blend, an artistic image is generated using Together's image API, visualizing the new word.
- **Dynamic Word Pool:** Each session, 20 words are randomly drawn from a pool of 500 diverse words, ensuring variety and replayability.
- **Session Gallery:** The last 10 generated images are saved in your browser's local storage, so you can revisit your blends and art even after a refresh.
- **Download & Expand:** Click any gallery image to view it full-size in a modal, with a one-click download button.
- **Mobile-First, Animated UI:** Responsive, dark-mode, and visually engaging with Tailwind, DaisyUI, and anime.js.

## How It Works

1. **Word Selection:**
   - On page load, 20 random words appear on the left. Click any two to select them.
   - As soon as two are selected, LexiMix sends them to the backend.

2. **Word Blending (Backend):**
   - The FastAPI backend calls OpenAI's GPT-4o in JSON mode, prompting it to create a single new word (no explanation, just the word).
   - The new word is returned to the frontend and displayed.

3. **Image Generation:**
   - The backend then calls Together's image API with the prompt: `an artistic image of 'NEWWORD'`.
   - The resulting image (base64-encoded) is sent to the frontend and shown below the blend.

4. **Gallery & Storage:**
   - Each generated image/word pair is saved to local storage (up to 10 most recent).
   - The gallery is always visible at the bottom, and persists across sessions.
   - No infinite scroll: only the last 10 images are kept for simplicity and performance.

5. **Download & Modal:**
   - Click any gallery image to view it in a modal.
   - Use the download button in the modal to save the image locally.

## Setup & Running

### Prerequisites
- Python 3.8+
- Node.js (for Tailwind, if you want to build custom CSS; not required for default setup)

### Environment Variables
- `OPENAI_API_KEY` — Your OpenAI API key (for GPT-4o)
- `TOGETHER_API_KEY` — Your Together API key (for image generation)

Set these in your shell before running:
```sh
export OPENAI_API_KEY=sk-...
export TOGETHER_API_KEY=...
```
(Windows: use `set` instead of `export`)

### Install Dependencies
```sh
pip install -r requirements.txt
```

### Run the App
```sh
python main.py
```

Visit [http://127.0.0.1:8000](http://127.0.0.1:8000) in your browser.

## Project Structure

```
leximix/
├── main.py                # FastAPI backend
├── requirements.txt       # Python dependencies
├── static/
│   ├── style.css          # Custom styles (Tailwind, DaisyUI, animations)
│   └── script.js          # Frontend logic (word selection, gallery, API calls)
├── templates/
│   └── index.html         # Main HTML template
```

## Customization & Extending
- **Word Pool:** Edit the `WORD_POOL` in `main.py` to add/remove words.
- **Image Model:** Change the Together model in `main.py` for different art styles.
- **Gallery Size:** Adjust `MAX_GALLERY_IMAGES` in `static/script.js` to keep more/fewer images.
- **Styling:** Tweak `static/style.css` or use Tailwind classes in the HTML for a different look.

## Credits
- **OpenAI GPT-4o** for creative word blending
- **Together API** for image generation
- **Tailwind CSS & DaisyUI** for beautiful, dark-mode UI
- **anime.js** for smooth animations
- **FastAPI** for the backend

---

LexiMix is a joyful experiment in wordplay and AI art. Have fun blending, inventing, and sharing your creations!