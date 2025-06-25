# file: utils.py

import os
import requests
from dotenv import load_dotenv

load_dotenv()

NOTION_TOKEN = os.getenv("NOTION_TOKEN")
NOTION_DATABASE_ID = os.getenv("NOTION_DATABASE_ID")

NOTION_HEADERS = {
    "Authorization": f"Bearer {NOTION_TOKEN}",
    "Content-Type": "application/json",
    "Notion-Version": "2022-06-28"
}


def get_notion_tasks():
    url = f"https://api.notion.com/v1/databases/{NOTION_DATABASE_ID}/query"
    res = requests.post(url, headers=NOTION_HEADERS)
    res.raise_for_status()
    return res.json().get("results", [])


def update_notion_task(task_id, properties: dict):
    url = f"https://api.notion.com/v1/pages/{task_id}"
    res = requests.patch(url, headers=NOTION_HEADERS, json={"properties": properties})
    res.raise_for_status()
    return res.json()


def safe_get_select(props, field_name: str) -> str:
    if not isinstance(props, dict):
        return ""
    field = props.get(field_name)
    if not isinstance(field, dict):
        return ""
    select = field.get("select")
    if not isinstance(select, dict):
        return ""
    return select.get("name", "")