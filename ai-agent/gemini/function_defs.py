import requests
import os
import json
from dotenv import load_dotenv

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


# List of tools to pass to Gemini
crm_tools = [add_lead, get_leads, delete_lead, get_deals]
