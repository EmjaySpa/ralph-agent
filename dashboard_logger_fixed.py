import pandas as pd
import os
import datetime
from notion_client import Client
import matplotlib.pyplot as plt
from dotenv import load_dotenv

load_dotenv()

NOTION_TOKEN = os.getenv("NOTION_TOKEN")
DATABASE_ID = os.getenv("NOTION_DATABASE_ID")

notion = Client(auth=NOTION_TOKEN)
CSV_FILE = "dashboard_log.csv"

def fetch_tasks():
    results = notion.databases.query(database_id=DATABASE_ID)["results"]
    task_data = []
    for task in results:
        props = task.get("properties", {})
        name = props.get("Task name", {}).get("title", [{}])[0].get("plain_text", "")
        status = props.get("Status", {}).get("status", {}).get("name", "Unknown")

        due_prop = props.get("Due")
        due = due_prop["date"]["start"] if due_prop and due_prop.get("date") else None

        priority_prop = props.get("Priority")
        priority = priority_prop.get("select", {}).get("name") if priority_prop else "None"

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
        print("🚨 ALERT: High-priority or overdue spike detected.")
        return True
    return False

def run():
    print("📊 Logging Notion task metrics...")
    df = fetch_tasks()
    append_to_csv(df)
    plot_weekly_summary()
    if alert_on_spike():
        pass

if __name__ == "__main__":
    run()
