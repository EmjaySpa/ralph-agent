import os
import logging
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError

# Setup basic logging
logging.basicConfig(filename='slack_errors.log', level=logging.ERROR)

SLACK_BOT_TOKEN = os.getenv("SLACK_BOT_TOKEN")
SLACK_CHANNEL = os.getenv("SLACK_CHANNEL")

client = WebClient(token=SLACK_BOT_TOKEN)

def send_slack_message(text: str):
    try:
        response = client.chat_postMessage(channel=SLACK_CHANNEL, text=text)
        print("✅ Message sent successfully:", response['ts'])
    except SlackApiError as e:
        print("❌ Slack error:", e.response['error'])
        logging.error(f"Slack Error: {e.response['error']} | Message: {text}")
