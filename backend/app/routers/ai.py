from fastapi import APIRouter, Depends, HTTPException
from app.auth.dependencies import get_current_user
from app.models.user import User
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

@router.post("/chat", response_model=AIChatResponse)
def chat_with_ai(request: AIChatRequest, current_user: User = Depends(get_current_user)):
    """
    Forward the user's chat message to the AI Agent.
    """
    global chat
    try:
        if not chat:
            chat = create_fresh_chat()

        response = chat.send_message(request.message)
        
        # Safely extract text content
        reply_text = ""
        try:
            reply_text = response.text
        except Exception:
            if hasattr(response, 'candidates') and response.candidates:
                for candidate in response.candidates:
                    for part in candidate.content.parts:
                        if hasattr(part, 'text') and part.text:
                            reply_text += part.text + " "
        
        if not reply_text:
            reply_text = "I performed the requested action."

        return AIChatResponse(
            response=reply_text.strip(),
            actions_taken=[]
        )
    except Exception as e:
        print(f"Error in /ai/chat: {e}, refreshing session...")
        try:
            chat = create_fresh_chat()
            response = chat.send_message(request.message)
            reply_text = ""
            try:
                reply_text = response.text
            except Exception:
                reply_text = "Action completed."
            return AIChatResponse(
                response=reply_text,
                actions_taken=[]
            )
        except Exception as retry_err:
            print(f"Fatal error in /ai/chat: {retry_err}")
            raise HTTPException(status_code=500, detail=str(retry_err))
