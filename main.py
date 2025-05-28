import os
import random
import json
import base64
from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.gzip import GZipMiddleware
from pydantic import BaseModel
import openai
from together import Together
from termcolor import colored
import asyncio
import uvicorn
from dotenv import load_dotenv
load_dotenv()

# Kid-friendly word pool (same length as original, random order, no categories in code)
WORD_POOL = [
    "tree", "cloud", "rain", "snow", "sun", "moon", "star", "rock", "leaf", "lake",
    "hill", "beach", "island", "sand", "wind", "sky", "flower", "grass", "river", "pond",
    "bush", "petal", "shell", "twig", "mud", "berry", "acorn", "log", "pebble", "root",
    "moss", "dew", "wave", "bud", "branch", "pine", "rose", "daisy", "clover", "seed",
    "cat", "dog", "rabbit", "bear", "fox", "owl", "duck", "frog", "fish", "bird",
    "horse", "monkey", "turtle", "mouse", "lion", "tiger", "elephant", "penguin", "bee", "butterfly",
    "puppy", "kitten", "pony", "goat", "sheep", "pig", "cow", "hen", "chick", "crab",
    "snail", "ant", "worm", "bat", "deer", "swan", "goose", "seal", "otter", "ladybug",
    "apple", "banana", "grape", "cherry", "lemon", "peach", "carrot", "potato", "cookie", "cake",
    "bread", "cheese", "milk", "juice", "egg", "honey", "candy", "icecream", "pizza", "popcorn",
    "pear", "orange", "plum", "melon", "berry", "corn", "bean", "rice", "cracker", "waffle",
    "toast", "jam", "butter", "yogurt", "cereal", "muffin", "donut", "pancake", "syrup", "nut",
    "ball", "book", "box", "cup", "plate", "spoon", "fork", "bowl", "chair", "table",
    "pencil", "pen", "crayon", "toy", "block", "doll", "car", "train", "truck", "robot",
    "drum", "bell", "kite", "puzzle", "game", "lamp", "clock", "bag", "hat", "shoe",
    "sock", "scarf", "brush", "ribbon", "sticker", "coin", "key", "ring", "button", "towel",
    "house", "home", "school", "park", "garden", "store", "zoo", "farm", "room", "yard",
    "pool", "tent", "cabin", "barn", "forest", "playground", "bridge", "road", "hill", "cave",
    "castle", "tower", "treehouse", "bus", "train", "boat", "ship", "plane", "station", "market",
    "beach", "island", "mountain", "field", "valley", "river", "lake", "pond", "dock", "pier",
    "dream", "idea", "story", "art", "music", "dance", "song", "game", "play", "magic",
    "wish", "smile", "laugh", "hug", "love", "peace", "hope", "joy", "fun", "friend",
    "team", "party", "gift", "star", "hero", "quest", "adventure", "puzzle", "race", "goal",
    "win", "draw", "build", "make", "find", "share", "help", "learn", "read", "write",
    "run", "walk", "jump", "swim", "fly", "climb", "sing", "dance", "draw", "play",
    "build", "make", "find", "hide", "seek", "catch", "throw", "kick", "spin", "hop",
    "skip", "slide", "swing", "dig", "paint", "color", "read", "write", "count", "laugh",
    "smile", "wave", "clap", "cheer", "hug", "yawn", "nap", "rest", "look", "listen",
    "robot", "computer", "phone", "tablet", "tv", "camera", "radio", "clock", "lamp", "fan",
    "car", "bus", "train", "boat", "plane", "rocket", "drone", "game", "remote", "light",
    "bell", "mic", "speaker", "mouse", "keyboard", "screen", "watch", "alarm", "battery", "plug",
    "wheel", "gear", "tool", "button", "switch", "cord", "tape", "film", "chip", "disk",
    "red", "blue", "green", "yellow", "purple", "orange", "pink", "black", "white", "brown",
    "gray", "gold", "silver", "soft", "hard", "smooth", "rough", "shiny", "bright", "dark",
    "small", "big", "short", "tall", "fast", "slow", "warm", "cool", "sweet", "funny",
    "happy", "silly", "brave", "kind", "quiet", "loud", "clean", "messy", "new", "old",
    "head", "face", "eye", "ear", "nose", "mouth", "tooth", "tongue", "chin", "cheek",
    "hair", "neck", "shoulder", "arm", "elbow", "wrist", "hand", "finger", "thumb", "nail",
    "chest", "back", "waist", "hip", "leg", "knee", "ankle", "foot", "toe", "skin",
    "smile", "laugh", "wink", "blink", "wave", "hug", "jump", "run", "clap", "yawn",
    "wild", "calm", "loud", "quiet", "bright", "dark", "clear", "clean", "full", "empty",
    "open", "closed", "wet", "dry", "awake", "asleep", "alive", "young", "old", "new",
    "fresh", "sweet", "simple", "common", "real", "fun", "silly", "happy", "brave", "kind",
    "cool", "warm", "soft", "hard", "smooth", "rough", "shiny", "messy", "fast", "slow",
    "shirt", "pants", "dress", "hat", "shoe", "sock", "coat", "scarf", "glove", "belt",
    "cap", "jacket", "sweater", "boot", "sandal", "pocket", "button", "zipper", "collar", "cuff",
    "hem", "seam", "fabric", "cotton", "wool", "lace", "pattern", "stripe", "polka", "plaid",
    "bow", "tie", "clip", "band", "crown", "mask", "apron", "mitt", "vest", "robe"
]

# List of kid-friendly art styles
KID_STYLES = [
    "children's coloring book style",
    "chibi cartoon-style",
    "crayon drawing",
    "watercolor painting",
    "paper cutout art",
    "lego style",
    "playdough sculpture",
    "storybook illustration",
    "cute kawaii style",
    "simple doodle"
    
]

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
TOGETHER_API_KEY = os.getenv("TOGETHER_API_KEY")
OPENAI_MODEL = "gpt-4o"
TOGETHER_IMAGE_MODEL = "black-forest-labs/FLUX.1-schnell"

app = FastAPI()
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

openai_client = openai.OpenAI(api_key=OPENAI_API_KEY)
together_client = Together(api_key=TOGETHER_API_KEY)

class WordPair(BaseModel):
    word1: str
    word2: str

class ImageRequest(BaseModel):
    word: str

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    print(colored("📄 Serving index page", "green"))
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/words")
async def get_words():
    print(colored("🔤 Selecting random words from pool", "cyan"))
    selected_words = random.sample(WORD_POOL, 20)
    return {"words": selected_words}

@app.post("/blend")
async def blend_words(word_pair: WordPair):
    if not openai_client.api_key:
        error_msg = "OpenAI API key not configured."
        print(colored(error_msg, "red"))
        raise HTTPException(status_code=500, detail=error_msg)
    try:
        word1 = word_pair.word1.strip().lower()
        word2 = word_pair.word2.strip().lower()
        print(colored(f"🔀 Blending words: {word1} + {word2}", "yellow"))
        response = openai_client.chat.completions.create(
            model=OPENAI_MODEL,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": "You are a creative word-blending assistant. Create a single portmanteau by combining the two words provided. Return only a JSON object with the key 'blended_word' and the new word as the value."},
                {"role": "user", "content": f"Blend these two words into one creative new word: '{word1}' and '{word2}'"}
            ],
            temperature=0.7,
            max_tokens=150
        )
        result_str = response.choices[0].message.content
        result_json = json.loads(result_str)
        print(colored(f"✨ Generated blend JSON: {result_json}", "green"))
        return result_json
    except json.JSONDecodeError as json_e:
        error_msg = f"Error parsing OpenAI response: {str(json_e)} - Response: {result_str}"
        print(colored(error_msg, "red"))
        raise HTTPException(status_code=500, detail="Error processing AI response")
    except Exception as e:
        error_msg = f"Error blending words: {str(e)}"
        print(colored(error_msg, "red"))
        raise HTTPException(status_code=500, detail=error_msg)

@app.post("/generate-image", response_class=JSONResponse)
async def generate_image(image_request: ImageRequest):
    word = image_request.word.strip()
    style = random.choice(KID_STYLES)
    prompt = f"a colorful, {style} illustration of '{word}', suitable for children, no violence, no scary or adult themes"
    print(colored(f"🎨 Generating image for: {word} with prompt: '{prompt}'", "blue"))
    # print("Selected style:", style)
    try:
        response = await asyncio.to_thread(
            together_client.images.generate,
            prompt=prompt,
            model=TOGETHER_IMAGE_MODEL,
            width=800,
            height=608,
            steps=4,
            n=1,
            response_format="b64_json"
        )
        if response.data and len(response.data) > 0 and response.data[0].b64_json:
            b64_data = response.data[0].b64_json
            print(colored(f"🖼️ Image generated successfully for {word}", "green"))
            return {"image_data": b64_data, "word": word}
        else:
            raise Exception("No image data received from Together API")
    except Exception as e:
        error_msg = f"Error generating image for {word}: {str(e)}"
        print(colored(error_msg, "red"))
        raise HTTPException(status_code=500, detail=error_msg)

if __name__ == "__main__":
    if not OPENAI_API_KEY:
        print(colored("⚠️ Warning: OPENAI_API_KEY environment variable not set.", "yellow"))
    if not TOGETHER_API_KEY:
        print(colored("⚠️ Warning: TOGETHER_API_KEY environment variable not set.", "yellow"))
    print(colored("🚀 Starting Word Blender app", "magenta"))
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)