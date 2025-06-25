# metrics_tracker.py

import os
import csv
from datetime import datetime
import requests
from dotenv import load_dotenv

load_dotenv()

NOTION_TOKEN = os.getenv("NOTION_TOKEN")
NOTION_DATABASE_ID = os.getenv("NOTION_DATABASE_ID")

HEADERS = {
    "Authorization": f"Bearer {NOTION_TOKEN}",
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json"
}

CSV_FILE = "dashboard_log.csv"

def query_tasks():
    url = f"https://api.notion.com/v1/databases/{NOTION_DATABASE_ID}/query"
    res = requests.post(url, headers=HEADERS, json={"page_size": 100})
    return res.json().get("results", [])

def parse_metrics(tasks):
    today = datetime.now().strftime("%Y-%m-%d")
    counts = {
        "Not started": 0,
        "In progress": 0,
        "In review": 0,
        "Waiting for Emjay": 0,
        "Rejected – actioned": 0,
        "Rejected – hold": 0,
        "Done": 0,
        "Overdue": 0
    }

    for task in tasks:
        props = task["properties"]
        status = props.get("Status", {}).get("status", {}).get("name", "Unknown")
        due = props.get("Due", {}).get("date", {}).get("start")

        if status in counts:
            counts[status] += 1

        # Overdue check
        if due and status not in ["Done", "Rejected – hold"]:
            due_date = datetime.fromisoformat(due.split("T")[0])
            if due_date.date() < datetime.now().date():
                counts["Overdue"] += 1

    return [today] + [counts[key] for key in sorted(counts.keys())]

def write_csv(metrics_row):
    headers = ["Date"] + sorted([
        "Not started", "In progress", "In review", "Waiting for Emjay",
        "Rejected – actioned", "Rejected – hold", "Done", "Overdue"
    ])
    file_exists = os.path.isfile(CSV_FILE)

    with open(CSV_FILE, "a", newline="") as file:
        writer = csv.writer(file)
        if not file_exists:
            writer.writerow(headers)
        writer.writerow(metrics_row)

def main():
    tasks = query_tasks()
    metrics = parse_metrics(tasks)
    write_csv(metrics)
    print("📊 Metrics logged to dashboard_log.csv")

if __name__ == "__main__":
    main()
