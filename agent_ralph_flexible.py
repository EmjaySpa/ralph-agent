# agent_ralph_flexible.py

import os
import base64
import re
from datetime import datetime
from email.message import EmailMessage
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import InstalledAppFlow
from dotenv import load_dotenv
import requests

load_dotenv()

NOTION_TOKEN = os.getenv("NOTION_TOKEN")
NOTION_DATABASE_ID = os.getenv("NOTION_DATABASE_ID")
SENDER_EMAIL = os.getenv("SENDER_EMAIL")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")
CLIENT_SECRET_FILE = os.getenv("GOOGLE_CLIENT_SECRET_FILE")

SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/documents",
    "https://www.googleapis.com/auth/drive"
]

TAG_TRIGGERS = {
    "course": ["module", "lesson", "kartra", "coaching", "framework"],
    "client": ["email", "consult", "booking"],
    "tech": ["zapier", "automation", "python", "api"]
}

def gmail_auth():
    creds = None
    token_path = "token.json"
    if os.path.exists(token_path):
        creds = Credentials.from_authorized_user_file(token_path, SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(CLIENT_SECRET_FILE, SCOPES)
            creds = flow.run_local_server(port=0)
        with open(token_path, "w") as token:
            token.write(creds.to_json())
    return creds

def get_latest_email(service):
    results = service.users().messages().list(
        userId="me",
        q='from:emjayspas@gmail.com to:ralph.emjayops@gmail.com is:unread',
        maxResults=1
    ).execute()
    messages = results.get("messages", [])
    if not messages:
        return None
    msg = service.users().messages().get(userId="me", id=messages[0]["id"]).execute()
    headers = msg["payload"].get("headers", [])
    subject = next((h["value"] for h in headers if h["name"] == "Subject"), "")
    parts = msg["payload"].get("parts", [])
    body = ""
    for part in parts:
        if part["mimeType"] == "text/plain":
            body_data = part["body"].get("data")
            if body_data:
                body = base64.urlsafe_b64decode(body_data).decode("utf-8")
    return subject, body

def parse_human_command(subject, body):
    title_match = re.search(r"(?:title|subject)[:\-]?\s*(.*)", body, re.IGNORECASE)
    content_match = re.search(r"(?:content|body|note)[:\-]?\s*(.*)", body, re.IGNORECASE)
    title = title_match.group(1) if title_match else subject.strip()
    content = content_match.group(1) if content_match else body.strip()
    return title, content

def extract_tags(content):
    tags = []
    for tag, keywords in TAG_TRIGGERS.items():
        if any(kw in content.lower() for kw in keywords):
            tags.append({"name": tag})
    return tags

def assign_to_agent(content):
    if "approve" in content.lower():
        return [{"name": "Emjay Spa & Wellness"}]
    if "automation" in content.lower():
        return [{"name": "Agent Swarm"}]
    return [{"name": "Ralph"}]

def create_google_doc(title, content):
    creds = gmail_auth()
    docs_service = build("docs", "v1", credentials=creds)
    doc = docs_service.documents().create(body={"title": title}).execute()
    doc_id = doc["documentId"]
    docs_service.documents().batchUpdate(
        documentId=doc_id,
        body={"requests": [{"insertText": {"location": {"index": 1}, "text": content}}]}
    ).execute()
    return f"https://docs.google.com/document/d/{doc_id}/edit"

def log_to_notion(task_title, task_body, doc_url):
    tags = extract_tags(task_body)
    assignee = assign_to_agent(task_body)
    today = datetime.today().strftime('%Y-%m-%d')

    notion_url = "https://api.notion.com/v1/pages"
    headers = {
        "Authorization": f"Bearer {NOTION_TOKEN}",
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28"
    }

    data = {
        "parent": {"database_id": NOTION_DATABASE_ID},
        "properties": {
            "Task name": {"title": [{"text": {"content": task_title}}]},
            "Summary": {"rich_text": [{"text": {"content": task_body}}]},
            "Status": {"status": {"name": "Not started"}},
            "Assignee": {"people": []},  # IDs optional if linking users directly
            "Tags": {"multi_select": tags},
            "Due": {"date": {"start": today}},
            "Priority": {"select": {"name": "Medium"}},
            "Created by": {"rich_text": [{"text": {"content": "Ralph"}}]},
            "Started on": {"date": {"start": today}},
            "Task type": {"select": {"name": "Creative"}},
            "URL": {"url": doc_url}
        }
    }

    response = requests.post(notion_url, headers=headers, json=data)
    print("🔍 Notion response status code:", response.status_code)
    print("📦 Notion response content:", response.text)
    return response.status_code == 200

def send_email(service, to, subject, body):
    message = EmailMessage()
    message.set_content(body)
    message["To"] = to
    message["From"] = SENDER_EMAIL
    message["Subject"] = subject

    encoded_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
    create_message = {"raw": encoded_message}
    service.users().messages().send(userId="me", body=create_message).execute()

def main():
    creds = gmail_auth()
    gmail_service = build("gmail", "v1", credentials=creds)
    latest = get_latest_email(gmail_service)
    if not latest:
        print("No unread email found.")
        return

    subject, body = latest
    title, content = parse_human_command(subject, body)

    if "Done" in title or "Done" in content:
        print("✅ Task marked Done — skipping.")
        return

    try:
        doc_url = create_google_doc(title, content)
        notion_logged = log_to_notion(title, content, doc_url)
        send_email(
            gmail_service,
            "emjayspas@gmail.com",
            f"✅ Ralph created: {title}",
            f"Here’s the link to your new doc:\n{doc_url}\n\nContent:\n{content}"
        )
        if notion_logged:
            print(f"✔️ Ralph completed: {title}")
        else:
            print("⚠️ Logged Google Doc but could not update Notion.")
    except Exception as e:
        print("❌ Something went wrong:", e)

if __name__ == "__main__":
    main()
