import json
import os
import requests
from dotenv import load_dotenv
from .email_service import draft_email_content, send_email_via_oauth
from .calendar_service import get_upcoming_events, schedule_event
# Load env from ai-agent/.env
env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
load_dotenv(dotenv_path=env_path)

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
_token = None

def get_auth_headers():
    global _token
    if _token:
        return {"Authorization": f"Bearer {_token}", "Content-Type": "application/json"}
    
    login_data = {
        "email": "agent@example.com",
        "password": "AgentPassword123!"
    }
    try:
        response = requests.post(f"{BACKEND_URL}/auth/login", json=login_data)
        if response.status_code == 200:
            _token = response.json().get("token")
            return {"Authorization": f"Bearer {_token}", "Content-Type": "application/json"}
        else:
            register_data = {
                "name": "AI Agent",
                "email": "agent@example.com",
                "password": "AgentPassword123!"
            }
            reg_resp = requests.post(f"{BACKEND_URL}/auth/register", json=register_data)
            if reg_resp.status_code == 201:
                response = requests.post(f"{BACKEND_URL}/auth/login", json=login_data)
                if response.status_code == 200:
                    _token = response.json().get("token")
                    return {"Authorization": f"Bearer {_token}", "Content-Type": "application/json"}
    except Exception as e:
        print(f"Auth error: {e}")
    return {"Content-Type": "application/json"}

# Internal API key — shared secret between ai-agent and FastAPI backend
INTERNAL_API_KEY = "crm-internal-ai-agent-key"

AGENT_HEADERS = {
    "X-API-Key": INTERNAL_API_KEY,
    "Content-Type": "application/json"
}


def add_lead(name: str, company: str, email: str, phone: str = "", status: str = "new") -> str:
    """
    Adds a new lead to the CRM database via the backend REST API.

    Args:
        name: The full name of the lead.
        company: The company the lead works for.
        email: The email address of the lead.
        phone: The phone number of the lead (optional).
        status: The current status of the lead (default is 'new').
    """
    payload = {
        "name": name,
        "company": company,
        "email": email,
        "phone": phone,
        "status": status,
    }
    try:
        response = requests.post(
            f"{BACKEND_URL}/leads/agent",
            json=payload,
            headers=AGENT_HEADERS
        )
        if response.status_code == 201:
            data = response.json()
            return f"Success! Lead '{name}' created with ID: {data.get('id')}"
        else:
            return f"Error creating lead: {response.status_code} - {response.text}"
    except Exception as e:
        return f"Failed to connect to backend API: {str(e)}"


def get_leads(status: str = None) -> str:
    """
    Retrieves leads from the CRM database via the backend REST API.

    Args:
        status: Optional status to filter leads (e.g., 'new', 'contacted', 'qualified').
    """
    try:
        params = {}
        if status:
            params["status"] = status
        response = requests.get(
            f"{BACKEND_URL}/leads/agent",
            params=params,
            headers=AGENT_HEADERS
        )
        if response.status_code == 200:
            leads = response.json()
            if not leads:
                return "No leads found."
            return json.dumps(leads, indent=2)
        else:
            return f"Error fetching leads: {response.status_code} - {response.text}"
    except Exception as e:
        return f"Failed to connect to backend API: {str(e)}"


def delete_lead(id: int) -> str:
    """
    Deletes a lead from the CRM database by ID via the backend REST API.

    Args:
        id: The integer ID of the lead to delete.
    """
    try:
        response = requests.delete(
            f"{BACKEND_URL}/leads/agent/{id}",
            headers=AGENT_HEADERS
        )
        if response.status_code in (200, 204):
            return f"Success! Lead with ID {id} has been deleted."
        elif response.status_code == 404:
            return f"Error: Lead with ID {id} not found."
        else:
            return f"Error deleting lead: {response.status_code} - {response.text}"
    except Exception as e:
        return f"Failed to connect to backend API: {str(e)}"


def get_deals(status: str = None) -> str:
    """
    Retrieves deals from the CRM database via the backend REST API.

    Args:
        status: Optional status to filter deals (e.g., 'open', 'negotiation', 'closed_won').
    """
    try:
        params = {}
        if status:
            params["status"] = status
        response = requests.get(
            f"{BACKEND_URL}/deals/",
            params=params,
            headers=AGENT_HEADERS
        )
        if response.status_code == 200:
            deals = response.json()
            if not deals:
                return "No deals found."
            return json.dumps(deals, indent=2)
        else:
            return f"Error fetching deals: {response.status_code} - {response.text}"
    except Exception as e:
        return f"Failed to connect to backend API: {str(e)}"


def send_smart_emails(emails: list[str], campaign_context: str) -> str:
    """
    Drafts and sends personalized emails to a list of recipients using Gmail.
    Use this when the user wants to send an email or a campaign.

    Args:
        emails: A list of email addresses to send to.
        campaign_context: The topic, instructions, or context for the email body.
    """
    results = []
    success_count = 0
    
    for email in emails:
        # 1. Draft the email using AI
        draft = draft_email_content(email, campaign_context)
        subject = draft.get("subject", "Hello from our CRM")
        body = draft.get("body", campaign_context)
        
        # 2. Send via Gmail API OAuth
        success, msg = send_email_via_oauth(email, subject, body)
        if success:
            success_count += 1
            results.append(f"Successfully sent to {email} (Subject: {subject})")
        else:
            results.append(f"Failed to send to {email}: {msg}")
            
    summary = f"Smart Email Campaign completed. {success_count}/{len(emails)} sent successfully.\nDetails:\n" + "\n".join(results)
    return summary


def check_calendar(max_events: int = 10) -> str:
    """
    Checks the user's primary calendar and returns a list of upcoming events.
    Use this when the user asks about their schedule, meetings, or availability.
    
    Args:
        max_events: The maximum number of events to fetch (default is 10).
    """
    return get_upcoming_events(max_events=max_events)


def book_meeting(title: str, start_time: str, end_time: str, attendees: list[str] = None) -> str:
    """
    Schedules a new meeting/event on the user's calendar.
    
    Args:
        title: The name/summary of the event.
        start_time: ISO 8601 formatted start time (e.g., '2023-10-25T09:00:00Z' or '2023-10-25T09:00:00-07:00').
        end_time: ISO 8601 formatted end time.
        attendees: A list of email addresses of people to invite.
    """
    return schedule_event(title, start_time, end_time, attendees)


# List of tools to pass to Gemini
crm_tools = [add_lead, get_leads, delete_lead, get_deals, send_smart_emails, check_calendar, book_meeting]
