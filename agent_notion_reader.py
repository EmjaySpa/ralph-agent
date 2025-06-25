import os
import requests
from dotenv import load_dotenv
import csv

# Load .env variables
load_dotenv()

NOTION_TOKEN = os.getenv("NOTION_TOKEN")
NOTION_DATABASE_ID = os.getenv("NOTION_DATABASE_ID")

# Headers for Notion API
headers = {
    "Authorization": f"Bearer {NOTION_TOKEN}",
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json"
}

def safe_get_select(props, field_name):
    return props.get(field_name, {}).get("select", {}).get("name", "").strip()

def safe_get_title(props, field_name):
    return props.get(field_name, {}).get("title", [{}])[0].get("text", {}).get("content", "").strip()

def safe_get_rich_text(props, field_name):
    return props.get(field_name, {}).get("rich_text", [{}])[0].get("text", {}).get("content", "").strip()

def safe_get_date(props, field_name):
    return props.get(field_name, {}).get("date", {}).get("start", "")

def safe_get_people(props, field_name):
    people = props.get(field_name, {}).get("people", [])
    return [p.get("name", "") for p in people]

def fetch_notion_tasks():
    url = f"https://api.notion.com/v1/databases/{NOTION_DATABASE_ID}/query"
    response = requests.post(url, headers=headers)

    if response.status_code != 200:
        print("❌ Failed to query Notion:", response.text)
        return []

    data = response.json()
    return data.get("results", [])

def process_tasks(tasks):
    processed = []
    errors = []

    for task in tasks:
        try:
            props = task.get("properties", {})
            processed.append({
                "title": safe_get_title(props, "Task name"),
                "summary": safe_get_rich_text(props, "Summary"),
                "status": safe_get_select(props, "Status"),
                "assignee": safe_get_people(props, "Assignee"),
                "due": safe_get_date(props, "Due"),
                "priority": safe_get_select(props, "Priority"),
                "tags": safe_get_select(props, "Tags"),
                "project": safe_get_select(props, "Project")
            })
        except Exception as e:
            errors.append({"task_id": task.get("id", ""), "error": str(e)})

    return processed, errors

def log_errors(errors):
    if not errors:
        return
    with open("notion_errors.csv", "w", newline="") as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=["task_id", "error"])
        writer.writeheader()
        for row in errors:
            writer.writerow(row)

def main():
    print("📡 Reading Notion database...")
    tasks = fetch_notion_tasks()
    processed, errors = process_tasks(tasks)

    print(f"✅ Loaded {len(processed)} tasks")
    if errors:
        print(f"⚠️ {len(errors)} tasks had errors (logged to notion_errors.csv)")
        log_errors(errors)

    for task in processed:
        print(f"📝 {task['title']} | Status: {task['status']} | Due: {task['due']}")

if __name__ == "__main__":
    main()
