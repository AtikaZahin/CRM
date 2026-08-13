import os
import google.generativeai as genai
from dotenv import load_dotenv
from .function_defs import crm_tools

# Load environment variables (API Key) from ai-agent/.env
env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
load_dotenv(dotenv_path=env_path)
api_key = os.getenv("GEMINI_API_KEY")
raw_model = os.getenv("GEMINI_MODEL", "models/gemini-3.5-flash")
model_name = raw_model if raw_model.startswith("models/") else f"models/{raw_model}"

if not api_key or api_key == "your_api_key_here":
    raise ValueError("Missing GEMINI_API_KEY. Please add it to your .env file in the ai-agent folder.")

# Configure the SDK
genai.configure(api_key=api_key)

# Read the system prompt
prompt_path = os.path.join(os.path.dirname(__file__), '..', 'prompts', 'system_prompt.txt')
with open(prompt_path, "r") as f:
    system_instruction = f.read()

# Initialize the model with the CRM tools
model = genai.GenerativeModel(
    model_name=model_name,
    tools=crm_tools,
    system_instruction=system_instruction
)

def get_chat_session():
    """Returns an active chat session that remembers conversation history."""
    return model.start_chat(enable_automatic_function_calling=True)
