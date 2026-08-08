import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from gemini.client import get_chat_session
from gemini.function_defs import crm_tools
import google.generativeai as genai

chat = get_chat_session()
print(type(chat.history))
print(hasattr(chat, "history"))

# see if we can modify it
try:
    chat.history = []
    print("Can reassign history")
except Exception as e:
    print(f"Error reassigning history: {e}")
