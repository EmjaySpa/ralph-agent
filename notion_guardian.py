# notion_guardian.py

import os
import requests
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

NOTION_TOKEN = os.getenv("NOTION_TOKEN")
NOTION_DATABASE_ID = os.getenv("NOTION_DATABASE_ID")
NOTION_API_VERSION = "2022-06-28"

HEADERS = {
    "Authorization": f"Bearer {NOTION_TOKEN}",
    "Notion-Version": NOTION_API_VERSION,
    "Content-Type": "application/json",
}

def query_tasks():
    url = f"https://api.notion.com/v1/databases/{NOTION_DATABASE_ID}/query"
    payload = {"page_size": 100}
    res = requests.post(url, headers=HEADERS, json=payload)
    return res.json()["results"]

def extract_due_date(task):
    prop = task["properties"].get("Due", {})
    if prop.get("date") and prop["date"].get("start"):
        return datetime.fromisoformat(prop["date"]["start"].split("T")[0])
    return None

def escalate_task(task):
    task_id = task["id"]
    url = f"https://api.notion.com/v1/pages/{task_id}"
    updates = {
        "properties": {
            "Escalation flag": {"checkbox": True},
            "Nudge count": {"number": get_current_nudges(task) + 1}
        }
    }
    requests.patch(url, headers=HEADERS, json=updates)

def get_current_nudges(task):
    return task["properties"].get("Nudge count", {}).get("number", 0) or 0

def is_overdue(task, due_date):
    status = task["properties"].get("Status", {}).get("status", {}).get("name", "")
    return due_date and due_date < datetime.now() and status not in ["Done", "Archived"]

def run_nudge_check():
    tasks = query_tasks()
    for task in tasks:
        due_date = extract_due_date(task)
        if is_overdue(task, due_date):
            escalate_task(task)
            print("⚠️ Escalated overdue task:", task["properties"].get("Task name", {}).get("title", [{}])[0].get("text", {}).get("content", "Unknown"))
        else:
            print("✅ Task OK or complete.")

if __name__ == "__main__":
    run_nudge_check()
