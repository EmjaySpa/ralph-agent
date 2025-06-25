# file: test_slack_message.py

import os
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError
from dotenv import load_dotenv

load_dotenv()

SLACK_BOT_TOKEN = os.getenv("SLACK_BOT_TOKEN")
SLACK_CHANNEL = os.getenv("SLACK_CHANNEL")

def send_test_message():
    client = WebClient(token=SLACK_BOT_TOKEN)
    try:
        response = client.chat_postMessage(
            channel=SLACK_CHANNEL,
            text="✅ Slack test message: Your bot is working!"
        )
        print("Message sent:", response["ts"])
    except SlackApiError as e:
        print("Slack error:", e.response["error"])

if __name__ == "__main__":
    send_test_message()
