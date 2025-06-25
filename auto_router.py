# file: auto_router.py

import os
from dotenv import load_dotenv
from utils import get_notion_tasks, update_notion_task, safe_get_select

load_dotenv()

def route_tasks_by_status():
    tasks = get_notion_tasks()
    for task in tasks:
        task_id = task.get("id")
        props = task.get("properties", {})

        status = safe_get_select(props, "Status")
        priority = safe_get_select(props, "Priority")
        assignee = safe_get_select(props, "Assignee")

        tags = []

        if not assignee or not priority:
            tags.append("Needs Review")

        if not status:
            tags.append("Unsorted")

        if tags:
            update_notion_task(task_id, {
                "Tags": {
                    "multi_select": [{"name": tag} for tag in tags]
                }
            })

if __name__ == "__main__":
    route_tasks_by_status()