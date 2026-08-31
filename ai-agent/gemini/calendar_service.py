import os
import datetime
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from google.auth.transport.requests import Request

def get_calendar_service():
    creds_path = os.path.join(os.path.dirname(__file__), "..", "google_credentials.json")
    
    if not os.path.exists(creds_path):
        raise ValueError("Not Authenticated. Tell the user they must authenticate first by clicking this link: http://localhost:8000/auth/google/login")
        
    creds = Credentials.from_authorized_user_file(creds_path)
    
    if creds and creds.expired and creds.refresh_token:
        creds.refresh(Request())
        with open(creds_path, 'w') as f:
            f.write(creds.to_json())
            
    service = build('calendar', 'v3', credentials=creds)
    return service

def get_upcoming_events(max_results=10) -> str:
    """
    Fetches the upcoming events from the user's primary calendar.
    """
    try:
        service = get_calendar_service()
        
        # Call the Calendar API
        now = datetime.datetime.utcnow().isoformat() + 'Z'  # 'Z' indicates UTC time
        events_result = service.events().list(
            calendarId='primary', timeMin=now,
            maxResults=max_results, singleEvents=True,
            orderBy='startTime'
        ).execute()
        
        events = events_result.get('items', [])
        
        if not events:
            return "No upcoming events found."
            
        result = "Upcoming events:\n"
        for event in events:
            start = event['start'].get('dateTime', event['start'].get('date'))
            result += f"- {start}: {event['summary']}\n"
            
        return result
        
    except ValueError as ve:
        return str(ve)
    except Exception as e:
        return f"Error fetching events: {str(e)}"

def schedule_event(title: str, start_time: str, end_time: str, attendees: list = None) -> str:
    """
    Creates a new event on the user's primary calendar.
    start_time and end_time should be ISO format strings (e.g., '2023-10-25T09:00:00-07:00').
    """
    try:
        service = get_calendar_service()
        
        event = {
            'summary': title,
            'start': {
                'dateTime': start_time,
                'timeZone': 'UTC',
            },
            'end': {
                'dateTime': end_time,
                'timeZone': 'UTC',
            },
        }
        
        if attendees:
            event['attendees'] = [{'email': email} for email in attendees]
            
        # Insert event and send notifications to attendees
        event_result = service.events().insert(
            calendarId='primary',
            body=event,
            sendUpdates='all'
        ).execute()
        
        return f"Successfully created event: '{title}'. Link: {event_result.get('htmlLink')}"
        
    except ValueError as ve:
        return str(ve)
    except Exception as e:
        return f"Error scheduling event: {str(e)}"
