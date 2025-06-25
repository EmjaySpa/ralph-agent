import pandas as pd
import os
import datetime
from notion_client import Client
import matplotlib.pyplot as plt
from dotenv import load_dotenv
from email_alerts import send_email_alert

load_dotenv()

NOTION_TOKEN = os.getenv("NOTION_TOKEN")
DATABASE_ID = os.getenv("NOTION_DATABASE_ID")
CSV_FILE = "dashboard_log.csv"

notion = Client(auth=NOTION_TOKEN)

def fetch_tasks():
    results = notion.databases.query(database_id=DATABASE_ID)["results"]
    task_data = []

    for task in results:
        props = task.get("properties", {})

        # Task name safe fallback
        name_prop = props.get("Task name", {}).get("title", [])
        name = name_prop[0].get("plain_text", "") if name_prop else "Untitled"

        # Status fallback
        status_prop = props.get("Status")
        status = status_prop.get("status", {}).get("name") if status_prop else "Unknown"

        # Due date fallback
        due_prop = props.get("Due")
        due = due_prop.get("date", {}).get("start") if due_prop and due_prop.get("date") else None

        # Priority fallback
        priority_prop = props.get("Priority")
        priority = priority_prop.get("select", {}).get("name") if priority_prop and priority_prop.get("select") else "None"

        task_data.append({
            "Date": datetime.date.today(),
            "Task": name,
            "Status": status,
            "Due": due,
            "Priority": priority
        })

    return pd.DataFrame(task_data)

def append_to_csv(df):
    df["Date"] = pd.to_datetime(df["Date"])
    if os.path.exists(CSV_FILE):
        df.to_csv(CSV_FILE, mode='a', index=False, header=False)
    else:
        df.to_csv(CSV_FILE, index=False)

def plot_weekly_summary():
    df = pd.read_csv(CSV_FILE)
    df["Date"] = pd.to_datetime(df["Date"])
    df["Week"] = df["Date"].dt.to_period("W").apply(lambda r: r.start_time)
    status_counts = df.groupby(["Week", "Status"]).size().unstack().fillna(0)
    status_counts.plot(kind="bar", stacked=True, figsize=(12, 6))
    plt.title("Weekly Task Status Trends")
    plt.tight_layout()
    plt.savefig("task_trends_weekly.png")

def alert_on_spike():
    df = pd.read_csv(CSV_FILE)
    recent = df[df["Date"] == df["Date"].max()]
    alert_df = recent[(recent["Priority"] == "High") | (recent["Status"] == "Overdue")]
    if len(alert_df) > 0:
        send_email_alert(
            subject=f"🚨 Task Alert: {datetime.date.today()}",
            body="There are high-priority or overdue tasks in Notion.",
            attachment_path="task_trends_weekly.png"
        )
        return True
    return False

def run():
    print("📊 Logging Notion task metrics...")
    df = fetch_tasks()
    append_to_csv(df)
    plot_weekly_summary()
    alert_on_spike()

if __name__ == "__main__":
    run()
