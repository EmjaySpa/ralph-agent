# task_logger.py
import csv
import os
from datetime import datetime
from utils import get_notion_tasks, safe_get_title, safe_get_priority, safe_get_email, safe_get_due
from dotenv import load_dotenv
import smtplib
from email.message import EmailMessage

load_dotenv()

CSV_FILE = "notion_tasks_log.csv"

def log_tasks_to_csv():
    tasks = get_notion_tasks()
    with open(CSV_FILE, "w", newline="", encoding="utf-8") as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(["Title", "Assignee", "Priority", "Due", "Needs Review"])
        for task in tasks:
            props = task["properties"]
            title = safe_get_title(props)
            assignee = safe_get_email(props)
            priority = safe_get_priority(props)
            due = safe_get_due(props)
            needs_review = "Yes" if not assignee or not priority else "No"
            writer.writerow([title, assignee, priority, due, needs_review])
    print(f"✅ Logged {len(tasks)} tasks to {CSV_FILE}")

def email_csv_report():
    sender = os.getenv("EMAIL_HOST_USER")
    recipient = os.getenv("EMAIL_TO")
    password = os.getenv("EMAIL_HOST_PASSWORD")

    msg = EmailMessage()
    msg["Subject"] = f"🔔 Daily Task Log - {datetime.today().strftime('%Y-%m-%d')}"
    msg["From"] = sender
    msg["To"] = recipient
    msg.set_content("Attached is the daily task log from Notion.")

    with open(CSV_FILE, "rb") as f:
        msg.add_attachment(f.read(), maintype="application", subtype="csv", filename=CSV_FILE)

    with smtplib.SMTP(os.getenv("EMAIL_HOST"), int(os.getenv("EMAIL_PORT"))) as server:
        server.starttls()
        server.login(sender, password)
        server.send_message(msg)
    print(f"📧 Sent task log to {recipient}")

if __name__ == "__main__":
    log_tasks_to_csv()
    email_csv_report()