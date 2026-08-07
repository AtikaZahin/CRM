import requests
import os
from dotenv import load_dotenv

load_dotenv()
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")

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
        response = requests.post(f"{BACKEND_URL}/leads/", json=payload)
        if response.status_code == 201:
            return f"Success! Lead created with ID: {response.json().get('id')}"
        else:
            return f"Error creating lead: {response.text}"
    except Exception as e:
        return f"Failed to connect to backend API: {str(e)}"

# List of tools to pass to Gemini
crm_tools = [add_lead]
