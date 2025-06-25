import os
import requests
from dotenv import load_dotenv

load_dotenv()

NOTION_TOKEN = os.getenv("NOTION_TOKEN")
NOTION_DATABASE_ID = os.getenv("NOTION_DATABASE_ID")

def inspect_notion_schema():
    url = f"https://api.notion.com/v1/databases/{NOTION_DATABASE_ID}"
    headers = {
        "Authorization": f"Bearer {NOTION_TOKEN}",
        "Notion-Version": "2022-06-28"
    }

    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        print("❌ Failed to fetch Notion DB schema:", response.text)
        return

    data = response.json()
    properties = data["properties"]

    print("\n📋 Notion Property Types & Values:\n")
    for prop, val in properties.items():
        print(f"🔹 {prop} ({val['type']})")
        if val["type"] == "select":
            print("   Options:")
            for option in val["select"]["options"]:
                print("   -", option["name"])

inspect_notion_schema()
