import requests
import os
from dotenv import load_dotenv
import json

load_dotenv()
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
_token = None

def get_auth_headers():
    global _token
    if _token:
        return {"Authorization": f"Bearer {_token}", "Content-Type": "application/json"}
    
    # Try to login with a default user
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
            # If login fails, try to register
            register_data = {
                "name": "AI Agent",
                "email": "agent@example.com",
                "password": "AgentPassword123!"
            }
            reg_resp = requests.post(f"{BACKEND_URL}/auth/register", json=register_data)
            if reg_resp.status_code == 201:
                # Registration successful, login again
                response = requests.post(f"{BACKEND_URL}/auth/login", json=login_data)
                if response.status_code == 200:
                    _token = response.json().get("token")
                    return {"Authorization": f"Bearer {_token}", "Content-Type": "application/json"}
    except Exception as e:
        print(f"Auth error: {e}")
    return {"Content-Type": "application/json"}

def add_lead(name: str, company: str, email: str, phone: str = "", status: str = "new", assigned_to: int = 1) -> str:
    """
    Adds a new lead to the CRM database.
    
    Args:
        name: The full name of the lead.
        company: The company the lead works for.
        email: The email address of the lead.
        phone: The phone number of the lead (optional).
        status: The current status of the lead (default is 'new').
        assigned_to: The ID of the user this lead is assigned to (default is 1).
    """
    payload = {
        "name": name,
        "company": company,
        "email": email,
        "phone": phone,
        "status": status,
        "assigned_to": assigned_to
    }
    
    try:
        headers = get_auth_headers()
        response = requests.post(f"{BACKEND_URL}/leads/", json=payload, headers=headers)
        if response.status_code == 201:
            return f"Success! Lead created with ID: {response.json().get('id')}"
        else:
            return f"Error creating lead: {response.status_code} - {response.text}"
    except Exception as e:
        return f"Failed to connect to backend API: {str(e)}"

def get_deals(stage: str = None) -> str:
    """
    Retrieves deals from the CRM database, optionally filtered by stage.
    
    Args:
        stage: The stage to filter by (e.g., 'lead', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost').
    """
    try:
        headers = get_auth_headers()
        params = {}
        if stage:
            params['stage'] = stage
            
        response = requests.get(f"{BACKEND_URL}/deals/", params=params, headers=headers)
        if response.status_code == 200:
            deals = response.json()
            if not deals:
                return "No deals found."
            return json.dumps(deals, indent=2)
        else:
            return f"Error fetching deals: {response.status_code} - {response.text}"
    except Exception as e:
        return f"Failed to connect to backend API: {str(e)}"

def delete_lead(id: int) -> str:
    """
    Deletes a lead from the CRM database by ID.
    
    Args:
        id: The integer ID of the lead to delete.
    """
    try:
        headers = get_auth_headers()
        response = requests.delete(f"{BACKEND_URL}/leads/{id}", headers=headers)
        if response.status_code == 204 or response.status_code == 200:
            return f"Success! Lead with ID {id} has been deleted."
        elif response.status_code == 404:
            return f"Error: Lead with ID {id} not found."
        else:
            return f"Error deleting lead: {response.status_code} - {response.text}"
    except Exception as e:
        return f"Failed to connect to backend API: {str(e)}"

# List of tools to pass to Gemini
crm_tools = [add_lead, get_deals, delete_lead]
