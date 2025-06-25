# simulate_task_update.py
import os
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError
from dotenv import load_dotenv

load_dotenv()

SLACK_BOT_TOKEN = os.getenv("SLACK_BOT_TOKEN")
SLACK_CHANNEL = os.getenv("SLACK_CHANNEL")

def notify_task_update(task_name, status, due):
    client = WebClient(token=SLACK_BOT_TOKEN)

    msg = (
        "*Task Update*\n"
        f"> *Task:* {task_name}\n"
        f"> *Status:* {status}\n"
        f"> *Due:* {due}"
    )

    try:
        response = client.chat_postMessage(channel=SLACK_CHANNEL, text=msg)
        print(f"✅ Message sent successfully: {response['ts']}")
    except SlackApiError as e:
        print(f"❌ Slack error: {e.response['error']}")

if __name__ == "__main__":
    notify_task_update(
        task_name="Write proposal for Emjay workshop",
        status="In review",
        due="2025-06-26"
    )