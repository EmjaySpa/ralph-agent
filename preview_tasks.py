# preview_tasks.py
from utils import get_notion_tasks

def preview_tasks():
    tasks = get_notion_tasks()
    print("\n🧾 Notion Tasks Preview\n" + "-" * 40)
    for task in tasks:
        print(
            f"✅ Task: {task['title']} | "
            f"Status: {task['status']} | "
            f"Due: {task['due']} | "
            f"Assignee: {task['assignee']} | "
            f"Priority: {task['priority']} | "
            f"Tags: {', '.join(task['tags'])}"
        )

if __name__ == "__main__":
    preview_tasks()
