import os
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from google.auth.transport.requests import Request

def add_calendar_event(summary: str, start_time: str, end_time: str, description: str = "") -> str:
    """
    Adds an event to the primary Google Calendar.
    start_time and end_time must be ISO formatted strings (e.g., '2026-10-02T10:00:00+05:30').
    """
    creds_path = os.path.join(os.path.dirname(__file__), "..", "google_credentials.json")
    
    if not os.path.exists(creds_path):
        return "Not Authenticated. Tell the user they must authenticate first by clicking this link: http://localhost:8000/auth/google/login"
        
    try:
        creds = Credentials.from_authorized_user_file(creds_path)
        
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
            with open(creds_path, 'w') as f:
                f.write(creds.to_json())
                
        service = build('calendar', 'v3', credentials=creds)
        
        event = {
            'summary': summary,
            'description': description,
            'start': {
                'dateTime': start_time,
            },
            'end': {
                'dateTime': end_time,
            }
        }
        
        created_event = service.events().insert(calendarId='primary', body=event).execute()
        return f"Successfully created calendar event: {created_event.get('htmlLink')}"
        
    except Exception as e:
        return f"Failed to create calendar event: {str(e)}"
