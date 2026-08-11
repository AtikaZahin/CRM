from fastapi import APIRouter, HTTPException
from app.schemas.ai import AIChatRequest, AIChatResponse

router = APIRouter(
    prefix="/ai",
    tags=["AI"]
)

@router.post("/chat", response_model=AIChatResponse)
async def chat_with_ai(request: AIChatRequest):
    """
    Forward the user's chat message to the AI Agent.
    This endpoint is ready for Person 2 to integrate the Gemini client logic.
    """
    try:
        # TODO: Person 2 - Import and call Gemini get_chat_session() here.
        # Alternatively, if the AI agent becomes a separate microservice, 
        # make an HTTP request to it from here.
        
        # Mock response for now to unblock Person 3 (Frontend) & Person 4 (Android)
        mock_response = f"This is a mock response from the AI for your message: '{request.message}'. Person 2 will connect Gemini soon!"
        
        return AIChatResponse(
            response=mock_response,
            actions_taken=[]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
