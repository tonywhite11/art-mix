import os
import random
import json
import base64
from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.gzip import GZipMiddleware  # Add compression middleware
from pydantic import BaseModel
import openai
from together import Together  # Import Together
from termcolor import colored
import asyncio
import uvicorn
from dotenv import load_dotenv
load_dotenv()


# CONSTANTS
WORD_POOL = [
    # Nature
    "mountain", "ocean", "river", "forest", "desert", "meadow", "valley", "canyon", "cloud", "storm",
    "rainbow", "sunrise", "sunset", "star", "moon", "sun", "sky", "wind", "rain", "snow",
    "flower", "tree", "leaf", "root", "seed", "grass", "vine", "moss", "fog", "dew",
    "frost", "ice", "flame", "smoke", "shadow", "light", "dawn", "dusk", "coral", "crystal",
    
    # Animals
    "tiger", "eagle", "shark", "dolphin", "elephant", "lion", "wolf", "bear", "fox", "owl",
    "snake", "turtle", "rabbit", "deer", "frog", "butterfly", "bee", "ant", "spider", "bird",
    "fish", "whale", "octopus", "penguin", "squirrel", "cat", "dog", "horse", "monkey", "bat",
    "lizard", "hawk", "swan", "duck", "goose", "peacock", "cricket", "beetle", "dragonfly", "moth",
    
    # Food
    "apple", "orange", "banana", "grape", "cherry", "lemon", "peach", "mango", "kiwi", "pear",
    "bread", "cheese", "cake", "cookie", "cream", "butter", "honey", "sugar", "salt", "pepper",
    "coffee", "tea", "juice", "water", "milk", "soup", "stew", "spice", "herb", "rice",
    "pasta", "noodle", "meat", "fish", "egg", "bean", "corn", "potato", "carrot", "onion",
    
    # Objects
    "chair", "table", "lamp", "clock", "book", "door", "window", "mirror", "cup", "plate",
    "knife", "fork", "spoon", "bowl", "box", "bag", "key", "lock", "phone", "screen",
    "keyboard", "mouse", "cable", "wire", "paper", "pen", "pencil", "marker", "tape", "glue",
    "button", "zipper", "thread", "needle", "fabric", "shirt", "shoe", "hat", "ring", "watch",
    
    # Places
    "house", "home", "office", "school", "store", "market", "mall", "theater", "museum", "library",
    "park", "garden", "beach", "island", "mountain", "hill", "cave", "lake", "pond", "stream",
    "road", "path", "bridge", "tunnel", "tower", "castle", "palace", "temple", "hospital",
    "hotel", "station", "harbor", "dock", "farm", "field", "factory", "studio", "arena",
    
    # Concepts
    "time", "space", "mind", "soul", "heart", "dream", "idea", "thought", "memory", "story",
    "art", "music", "dance", "song", "poem", "game", "play", "sport", "skill", "talent",
    "power", "force", "energy", "magic", "wisdom", "knowledge", "truth", "beauty", "love", "peace",
    "hope", "faith", "trust", "joy", "fear", "pain", "anger", "sorrow", "wonder", "mystery",
    
    # Action Words
    "run", "walk", "jump", "swim", "fly", "climb", "fall", "rise", "turn", "spin",
    "break", "build", "create", "destroy", "open", "close", "push", "pull", "lift", "drop",
    "cut", "join", "mix", "stir", "cook", "bake", "burn", "freeze", "melt", "grow",
    "shrink", "stretch", "bend", "twist", "fold", "wrap", "tie", "bind", "speak", "sing",
    
    # Technology
    "computer", "robot", "machine", "engine", "motor", "screen", "device", "tool", "gear", "wheel",
    "circuit", "chip", "data", "code", "program", "system", "network", "server", "cloud", "web",
    "pixel", "laser", "radar", "radio", "signal", "battery", "solar", "digital", "virtual", "cyber",
    "drone", "rocket", "satellite", "spaceship", "probe", "sensor", "camera", "scanner", "printer", "router",
    
    # Colors and Qualities
    "red", "blue", "green", "yellow", "purple", "orange", "pink", "black", "white", "gray",
    "gold", "silver", "copper", "bronze", "steel", "glass", "wood", "stone", "plastic", "rubber",
    "soft", "hard", "smooth", "rough", "sharp", "dull", "light", "heavy", "thin", "thick",
    "long", "short", "wide", "narrow", "deep", "shallow", "hot", "cold", "warm", "cool",
    
    # Human Body
    "head", "face", "eye", "ear", "nose", "mouth", "tooth", "tongue", "chin", "cheek",
    "hair", "neck", "shoulder", "arm", "elbow", "wrist", "hand", "finger", "thumb", "nail",
    "chest", "back", "spine", "waist", "hip", "leg", "knee", "ankle", "foot", "toe",
    "skin", "bone", "muscle", "nerve", "brain", "heart", "lung", "liver",  "breath",
    
    # Abstract Descriptors
    "wild", "calm", "loud", "quiet", "bright", "dark", "clear", "foggy", "clean", "dirty",
    "rich", "poor", "full", "empty", "open", "closed", "loose", "tight", "wet", "dry",
    "awake", "asleep", "alive",  "young", "old", "new", "ancient", "fresh", "stale",
    "sweet", "sour", "bitter", "spicy", "simple", "complex", "common", "rare", "real", "fake",
    
    # Clothing and Fashion
    "dress", "shirt", "pants", "jeans", "skirt", "coat", "jacket", "sweater", "sock", "shoe",
    "boot", "sandal", "hat", "cap", "scarf", "glove", "belt", "tie", "button", "zipper",
    "pocket", "sleeve", "collar", "cuff", "hem", "seam", "fabric", "cotton", "silk", "wool",
    "leather", "denim", "linen", "lace", "pattern", "stripe", "polka", "plaid", "style", "trend"
]

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
TOGETHER_API_KEY = os.getenv("TOGETHER_API_KEY") # Add Together API Key
OPENAI_MODEL = "gpt-4o"
TOGETHER_IMAGE_MODEL = "black-forest-labs/FLUX.1-schnell" # Define image model

app = FastAPI()

# Add compression middleware for efficiency with base64 encoded images
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Templates
templates = Jinja2Templates(directory="templates")

# Initialize Clients
openai_client = openai.OpenAI(api_key=OPENAI_API_KEY)
together_client = Together(api_key=TOGETHER_API_KEY) # Initialize Together client


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
        
        # Call OpenAI API
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
    # if not together_client.api_key:
    #     error_msg = "Together API key not configured."
    #     print(colored(error_msg, "red"))
    #     raise HTTPException(status_code=500, detail=error_msg)
        
    word = image_request.word.strip()
    prompt = f"a cute, colorful, chibi cartoon-style illustration of '{word}', suitable for children, no violence, no scary or adult themes"
    print(colored(f"🎨 Generating image for: {word} with prompt: '{prompt}'", "blue"))
    
    try:
        response = await asyncio.to_thread(
            together_client.images.generate,
            prompt=prompt,
            model=TOGETHER_IMAGE_MODEL,
            width=800, # Smaller default size
            height=608,
            steps=4, # Fast steps
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
    # Check for API keys
    if not OPENAI_API_KEY:
        print(colored("⚠️ Warning: OPENAI_API_KEY environment variable not set.", "yellow"))
    if not TOGETHER_API_KEY:
        print(colored("⚠️ Warning: TOGETHER_API_KEY environment variable not set.", "yellow"))
        
    print(colored("🚀 Starting Word Blender app", "magenta"))
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True) 