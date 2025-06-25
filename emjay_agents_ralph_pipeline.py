# file: emjay/agents/ralph_pipeline.py

import base64
import os
from email.mime.text import MIMEText

import requests
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

# --- Gmail Setup ---
SCOPES = ['https://www.googleapis.com/auth/gmail.readonly',
          'https://www.googleapis.com/auth/gmail.send']
TOKEN_PATH = 'token.json'
CREDENTIALS_PATH = 'credentials.json'

# --- Notion Setup ---
NOTION_TOKEN = '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'
NOTION_DB_ID = '1a3630fc76dc80a1a1c1dc035b66afe7'
NOTION_HEADERS = {
    'Authorization': f'Bearer {NOTION_TOKEN}',
    'Content-Type': 'application/json',
    'Notion-Version': '2022-06-28'
}

# --- Google Docs Setup ---
DOC_SCOPES = ['https://www.googleapis.com/auth/documents']

def get_gmail_service():
    creds = Credentials.from_authorized_user_file(TOKEN_PATH, SCOPES)
    if not creds.valid and creds.expired and creds.refresh_token:
        creds.refresh(Request())
    return build('gmail', 'v1', credentials=creds)

def get_latest_email(service):
    result = service.users().messages().list(userId='me', labelIds=['INBOX'], q='is:unread', maxResults=1).execute()
    messages = result.get('messages', [])
    if not messages:
        return None
    msg = service.users().messages().get(userId='me', id=messages[0]['id']).execute()
    snippet = msg['snippet']
    service.users().messages().modify(userId='me', id=messages[0]['id'], body={'removeLabelIds': ['UNREAD']}).execute()
    return snippet

def create_google_doc(title, content):
    creds = Credentials.from_authorized_user_file(TOKEN_PATH, DOC_SCOPES)
    service = build('docs', 'v1', credentials=creds)
    doc = service.documents().create(body={'title': title}).execute()
    doc_id = doc['documentId']
    service.documents().batchUpdate(documentId=doc_id, body={
        'requests': [{
            'insertText': {
                'location': {'index': 1},
                'text': content
            }
        }]
    }).execute()
    return f"https://docs.google.com/document/d/{doc_id}"

def log_to_notion(agent, task, doc_url):
    data = {
        "parent": {"database_id": NOTION_DB_ID},
        "properties": {
            "Agent": {"title": [{"text": {"content": agent}}]},
            "Task": {"rich_text": [{"text": {"content": task}}]},
            "Document": {"url": doc_url},
        }
    }
    res = requests.post("https://api.notion.com/v1/pages", headers=NOTION_HEADERS, json=data)
    return res.status_code == 200

def send_confirmation_email(service, to, subject, body):
    message = MIMEText(body)
    message['to'] = to
    message['subject'] = subject
    raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
    message_body = {'raw': raw}
    service.users().messages().send(userId='me', body=message_body).execute()

def main():
    gmail_service = get_gmail_service()
    snippet = get_latest_email(gmail_service)
    if not snippet:
        print("No unread emails.")
        return

    if 'create a google doc' in snippet.lower():
        doc_url = create_google_doc("AI Test June 24", "This is a test")
        log_success = log_to_notion("Ralph", "Create doc + log", doc_url)
        if log_success:
            send_confirmation_email(
                gmail_service,
                'your.email@domain.com',
                'Task Completed',
                f'Document created and logged: {doc_url}'
            )
        else:
            print("Failed to log to Notion.")

if __name__ == '__main__':
    main()
