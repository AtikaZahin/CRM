import os
import json
from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse
from google_auth_oauthlib.flow import Flow
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(__file__), "../../.env")
load_dotenv(dotenv_path=env_path)
router = APIRouter(tags=["OAuth"])

# Global dictionary to temporarily store the OAuth Flow objects (for development/single-worker)
oauth_states = {}

# The scopes required for Gmail API to send emails
SCOPES = ['https://www.googleapis.com/auth/gmail.send']

def get_client_config():
    # In a real app, these come from .env
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    
    # We construct the client_secret dictionary format expected by Flow.from_client_config
    if not client_id or not client_secret:
        return None
        
    return {
        "web": {
            "client_id": client_id,
            "project_id": "crm-agent-project",
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "client_secret": client_secret,
            "redirect_uris": ["http://localhost:8000/auth/google/callback"]
        }
    }

@router.get("/auth/google/login")
def google_login():
    config = get_client_config()
    if not config:
        return {"error": "GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set in backend/.env"}
        
    flow = Flow.from_client_config(
        config,
        scopes=SCOPES,
        redirect_uri="http://localhost:8000/auth/google/callback"
    )
    
    authorization_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true',
        prompt='consent'
    )
    
    # Store the flow in our global dict so the callback can access the exact same instance
    oauth_states[state] = flow
    
    return RedirectResponse(authorization_url)


@router.get("/auth/google/callback")
def google_callback(request: Request, state: str = None, code: str = None, error: str = None):
    if error:
        return {"error": f"Authorization failed: {error}"}
    if not code:
        return {"error": "No authorization code returned"}
        
    if not state or state not in oauth_states:
        return {"error": "Invalid state parameter or session expired. Please try logging in again."}
        
    try:
        # Retrieve the exact Flow instance that initiated the login
        flow = oauth_states.pop(state)
        
        # We need the full URL to fetch the token
        authorization_response = str(request.url)
        # Ensure it starts with http (to prevent https mismatch in dev)
        if authorization_response.startswith('http://'):
            # In development we might need this because oauthlib enforces https by default
            os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'
            
        flow.fetch_token(authorization_response=authorization_response)
        credentials = flow.credentials
        
        # Save credentials to a file that the AI agent can read
        creds_data = {
            'token': credentials.token,
            'refresh_token': credentials.refresh_token,
            'token_uri': credentials.token_uri,
            'client_id': credentials.client_id,
            'client_secret': credentials.client_secret,
            'scopes': credentials.scopes
        }
        
        # Save it in ai-agent directory
        creds_path = os.path.join(os.path.dirname(__file__), "../../../ai-agent/google_credentials.json")
        with open(creds_path, 'w') as f:
            json.dump(creds_data, f)
            
        return {"message": "Successfully authenticated with Google! You can close this window and ask the agent to send the email again."}
    except Exception as e:
        return {"error": f"Failed to fetch token: {str(e)}"}
