import os
from google import genai
from dotenv import load_dotenv
from .function_defs import crm_tools

# Load environment variables (API Key) from ai-agent/.env
env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
load_dotenv(dotenv_path=env_path)
api_key = os.getenv("GEMINI_API_KEY")
raw_model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
model_name = raw_model.removeprefix("models/")

if not api_key or api_key == "your_api_key_here":
    raise ValueError("Missing GEMINI_API_KEY. Please add it to your .env file in the ai-agent folder.")

# Initialize the new SDK client
client = genai.Client(api_key=api_key)

# Read the system prompt
prompt_path = os.path.join(os.path.dirname(__file__), '..', 'prompts', 'system_prompt.txt')
with open(prompt_path, "r") as f:
    system_instruction = f.read()

def get_chat_session():
    """Returns an active chat session that remembers conversation history."""
    return client.chats.create(
        model=model_name,
        config={
            "tools": crm_tools,
            "system_instruction": system_instruction,
        }
    )
