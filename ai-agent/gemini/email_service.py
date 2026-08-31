import os
import smtplib
import json
import base64
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import google.generativeai as genai
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from google.auth.transport.requests import Request

def draft_email_content(recipient_email: str, context: str) -> dict:
    """
    Uses Gemini to draft a personalized email subject and body.
    Returns a dictionary with 'subject' and 'body'.
    """
    model = genai.GenerativeModel(
        model_name="gemini-3.5-flash",
        system_instruction=(
            "You are an expert sales and marketing copywriter. "
            "Write an email for the given recipient based on the context provided. "
            "Respond ONLY with a valid JSON object containing exactly two keys: "
            "'subject' (the email subject line) and 'body' (the email body text)."
        )
    )
    
    prompt = f"Recipient Email: {recipient_email}\nContext/Topic: {context}\n\nPlease draft the email."
    
    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        
        # Try to parse the JSON output (in case it includes markdown backticks)
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
            
        return json.loads(text.strip())
    except Exception as e:
        print(f"Error generating email for {recipient_email}: {e}")
        return {
            "subject": "Follow up",
            "body": f"Hello,\n\nI'm reaching out regarding: {context}\n\nBest regards,"
        }

def send_email_via_oauth(recipient_email: str, subject: str, body: str):
    """
    Sends an email using Gmail's API with OAuth 2.0 credentials.
    """
    creds_path = os.path.join(os.path.dirname(__file__), "..", "google_credentials.json")
    
    if not os.path.exists(creds_path):
        return False, "Not Authenticated. Tell the user they must authenticate first by clicking this link: http://localhost:8000/auth/google/login"
        
    try:
        creds = Credentials.from_authorized_user_file(creds_path)
        
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
            # Save refreshed credentials
            with open(creds_path, 'w') as f:
                f.write(creds.to_json())
                
        service = build('gmail', 'v1', credentials=creds)
        
        msg = MIMEMultipart()
        msg['To'] = recipient_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))
        
        raw_msg = base64.urlsafe_b64encode(msg.as_bytes()).decode()
        create_message = {'raw': raw_msg}
        
        send_message = service.users().messages().send(userId="me", body=create_message).execute()
        return True, f"Success (Message ID: {send_message.get('id')})"
        
    except Exception as e:
        return False, str(e)
