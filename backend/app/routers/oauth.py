import os
import json
from typing import Optional
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import RedirectResponse
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(__file__), "../../.env")
load_dotenv(dotenv_path=env_path)

# Allow HTTP for local development (OAuthLib requirement)
os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'

router = APIRouter(tags=["OAuth"])

# Global dictionary to temporarily store the OAuth Flow objects (for development/single-worker)
oauth_states = {}

# The scopes required for Gmail API and Calendar API
SCOPES = [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/calendar.events'
]

def get_client_config():
    load_dotenv(dotenv_path=env_path, override=True)
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    
    if not client_id or not client_secret:
        return None
        
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/auth/google/callback")
    return {
        "web": {
            "client_id": client_id,
            "project_id": "crm-agent-project",
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "client_secret": client_secret,
            "redirect_uris": [redirect_uri]
        }
    }

@router.get("/auth/google/login")
def google_login():
    # If in airgap / offline mode or not configured
    airgap = os.environ.get("AIRGAP_MODE", "false").lower() in ("true", "1", "yes")
    if airgap:
        raise HTTPException(
            status_code=503,
            detail="Google OAuth is disabled in Air-Gap / Offline mode. Use local email/password login."
        )

    config = get_client_config()
    if not config:
        return {"error": "GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set in backend/.env"}
        
    try:
        from google_auth_oauthlib.flow import Flow
        redirect_uri = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/auth/google/callback")
        flow = Flow.from_client_config(
            config,
            scopes=SCOPES,
            redirect_uri=redirect_uri
        )
        authorization_url, state = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            prompt='consent'
        )
        oauth_states[state] = flow
        return RedirectResponse(authorization_url)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"OAuth Flow initialization failed: {exc}")
