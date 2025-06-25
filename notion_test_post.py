from dotenv import load_dotenv
import os
import requests
import json

load_dotenv()

NOTION_TOKEN = os.getenv("NOTION_TOKEN")
NOTION_DATABASE_ID = os.getenv("NOTION_DATABASE_ID")

payload = {
    "parent": {"database_id": NOTION_DATABASE_ID},
    "properties": {
        "Task name": {"title": [{"text": {"content": "Test Task"}}]},
        "Summary": {"rich_text": [{"text": {"content": "This is just a test"}}]},
        "Status": {"status": {"name": "Not started"}}
    }
}

headers = {
    "Authorization": f"Bearer {NOTION_TOKEN}",
    "Content-Type": "application/json",
    "Notion-Version": "2022-06-28"
}

res = requests.post("https://api.notion.com/v1/pages", headers=headers, json=payload)
print("🔍 Status Code:", res.status_code)
print("📦 Response:", res.text)
