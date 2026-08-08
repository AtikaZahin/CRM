import os
import google.generativeai as genai
from dotenv import load_dotenv
from .function_defs import crm_tools

# Load environment variables (API Key)
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

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
    model_name="gemini-3.5-flash",
    tools=crm_tools,
    system_instruction=system_instruction
)

def get_chat_session():
    """Returns an active chat session that remembers conversation history."""
    # enable_automatic_function_calling=True tells Gemini to automatically 
    # run the python function when it decides a tool is needed, 
    # and then feed the result back into the model to generate a final answer.
    return model.start_chat(enable_automatic_function_calling=False)
