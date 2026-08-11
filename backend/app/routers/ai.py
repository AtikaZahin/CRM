from fastapi import APIRouter, HTTPException
from app.schemas.ai import AIChatRequest, AIChatResponse

router = APIRouter(
    prefix="/ai",
    tags=["AI"]
)

import sys
import os
# Add ai-agent to Python path so we can import gemini client
sys.path.append(os.path.join(os.path.dirname(__file__), "../../../ai-agent"))

try:
    from gemini.client import get_chat_session
    chat = get_chat_session()
except Exception as e:
    print(f"Warning: Failed to initialize Gemini chat session: {e}")
    chat = None

@router.post("/chat", response_model=AIChatResponse)
def chat_with_ai(request: AIChatRequest):
    """
    Forward the user's chat message to the AI Agent.
    """
    try:
        if not chat:
            return AIChatResponse(
                response="AI is currently unavailable. Please check backend logs for API key setup.",
                actions_taken=[]
            )
            
        # Send the message to Gemini
        response = chat.send_message(request.message)
        
        return AIChatResponse(
            response=response.text,
            actions_taken=[]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
