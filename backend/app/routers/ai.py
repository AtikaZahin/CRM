from fastapi import APIRouter, HTTPException
from app.schemas.ai import AIChatRequest, AIChatResponse
import sys
import os

router = APIRouter(
    prefix="/ai",
    tags=["AI"]
)

# Add ai-agent to Python path so we can import gemini client
sys.path.append(os.path.join(os.path.dirname(__file__), "../../../ai-agent"))

def create_fresh_chat():
    from gemini.client import get_chat_session
    return get_chat_session()

chat = None
try:
    chat = create_fresh_chat()
except Exception as e:
    print(f"Warning: Failed to initialize Gemini chat session on startup: {e}")

def extract_text(response) -> str:
    try:
        if response.text:
            return response.text
    except Exception:
        pass

    reply_text = ""
    candidates = getattr(response, 'candidates', [])
    if candidates:
        for candidate in candidates:
            content = getattr(candidate, 'content', None)
            if content:
                parts = getattr(content, 'parts', None)
                if parts: # Checks if parts is not None and not empty
                    for part in parts:
                        text = getattr(part, 'text', "")
                        if text:
                            reply_text += text + " "
    
    return reply_text.strip()

@router.post("/chat", response_model=AIChatResponse)
def chat_with_ai(request: AIChatRequest):
    """
    Forward the user's chat message to the AI Agent.
    """
    global chat
    try:
        if not chat:
            chat = create_fresh_chat()

        response = chat.send_message(request.message)
        reply_text = extract_text(response)
        
        if not reply_text:
            reply_text = "I performed the requested action."

        return AIChatResponse(
            response=reply_text,
            actions_taken=[]
        )
    except Exception as e:
        print(f"Error in /ai/chat: {e}, refreshing session...")
        try:
            chat = create_fresh_chat()
            response = chat.send_message(request.message)
            reply_text = extract_text(response)
            
            if not reply_text:
                reply_text = "Action completed."
                
            return AIChatResponse(
                response=reply_text,
                actions_taken=[]
            )
        except Exception as retry_err:
            print(f"Fatal error in /ai/chat: {retry_err}")
            raise HTTPException(status_code=500, detail=str(retry_err))
