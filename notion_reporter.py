# notion_reporter.py

import os
import requests
import smtplib
from datetime import datetime
from dotenv import load_dotenv
from email.message import EmailMessage

load_dotenv()

NOTION_TOKEN = os.getenv("NOTION_TOKEN")
NOTION_DATABASE_ID = os.getenv("NOTION_DATABASE_ID")
SENDER_EMAIL = os.getenv("SENDER_EMAIL")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")
RECIPIENT_EMAIL = os.getenv("RECIPIENT_EMAIL")
NOTION_API_VERSION = "2022-06-28"

HEADERS = {
    "Authorization": f"Bearer {NOTION_TOKEN}",
    "Notion-Version": NOTION_API_VERSION,
    "Content-Type": "application/json"
}

def query_all_tasks():
    url = f"https://api.notion.com/v1/databases/{NOTION_DATABASE_ID}/query"
    payload = {"page_size": 100}
    res = requests.post(url, headers=HEADERS, json=payload)
    return res.json()["results"]

def format_summary(tasks):
    today = datetime.now().strftime("%Y-%m-%d")
    summary = [f"📋 **Daily Task Summary for {today}**\n"]
    
    overdue, due_today, waiting = [], [], []

    for task in tasks:
        props = task["properties"]
        name = props.get("Task name", {}).get("title", [{}])[0].get("text", {}).get("content", "Untitled")
        status = props.get("Status", {}).get("status", {}).get("name", "")
        due = props.get("Due", {}).get("date", {}).get("start", None)

        if due:
            due_date = datetime.fromisoformat(due.split("T")[0])
            if due_date.date() < datetime.now().date() and status not in ["Done", "Archived"]:
                overdue.append(f"🔴 {name} (was due {due_date.date()})")
            elif due_date.date() == datetime.now().date():
                due_today.append(f"🟡 {name}")
        if status == "Waiting for Emjay":
            waiting.append(f"⏳ {name}")

    summary.append("\n---\n\n**Overdue:**\n" + ("\n".join(overdue) or "None"))
    summary.append("\n\n**Due Today:**\n" + ("\n".join(due_today) or "None"))
    summary.append("\n\n**Waiting on Emjay:**\n" + ("\n".join(waiting) or "None"))
    
    return "\n".join(summary)

def send_digest_email(content):
    msg = EmailMessage()
    msg["Subject"] = "🧠 Daily Task Digest"
    msg["From"] = SENDER_EMAIL
    msg["To"] = RECIPIENT_EMAIL
    msg.set_content(content)

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
        smtp.login(SENDER_EMAIL, EMAIL_PASSWORD)
        smtp.send_message(msg)
        print("📬 Sent digest to:", RECIPIENT_EMAIL)

def main():
    tasks = query_all_tasks()
    summary = format_summary(tasks)
    send_digest_email(summary)

if __name__ == "__main__":
    main()
