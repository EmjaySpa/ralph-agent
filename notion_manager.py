# notion_manager.py
from utils import get_notion_tasks, update_notion_task
from datetime import datetime

def check_overdue_tasks():
    tasks = get_notion_tasks()
    now = datetime.now()

    for task in tasks:
        due = task.get("due")
        status = task.get("status")
        if not due or status == "Done":
            continue
        due_date = datetime.fromisoformat(due)
        if due_date < now:
            print(f"🚨 Overdue: {task['name']}")
            update_notion_task(task["id"], {
                "Tags": ["Overdue"],
                "Priority": "Urgent"
            })

if __name__ == "__main__":
    check_overdue_tasks()
