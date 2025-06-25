from __future__ import print_function
import os.path
import base64
from email.mime.text import MIMEText

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

# If modifying these SCOPES, delete token.json
SCOPES = ['https://www.googleapis.com/auth/gmail.send']

def send_email():
    creds = None

    # Check if token already exists
    if os.path.exists('token.json'):
        creds = Credentials.from_authorized_user_file('token.json', SCOPES)
    # If not, do the OAuth flow
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(
                'credentials_oauth.json', SCOPES)
            creds = flow.run_local_server(port=0)

        # Save token for future use
        with open('token.json', 'w') as token:
            token.write(creds.to_json())

    service = build('gmail', 'v1', credentials=creds)

    message = MIMEText('Your AI agent just sent this via Gmail using OAuth!')
    message['to'] = 'emjayspas@gmail.com'
    message['from'] = 'emjayspas@gmail.com'
    message['subject'] = '🎉 It worked!'
    raw = base64.urlsafe_b64encode(message.as_bytes()).decode()

    message = service.users().messages().send(userId='me', body={'raw': raw}).execute()
    print('✅ Email sent! Message ID:', message['id'])

send_email()
