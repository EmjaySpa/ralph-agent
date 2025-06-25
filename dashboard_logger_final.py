# dashboard_logger_final.py
import os
import matplotlib.pyplot as plt
import pandas as pd
from dotenv import load_dotenv
from utils import get_notion_tasks

load_dotenv()

def run():
    print("📊 Generating Emjay Daily Dashboard...")

    tasks = get_notion_tasks()
    df = pd.DataFrame(tasks)

    if df.empty:
        print("No tasks found.")
        return

    # Count status
    status_counts = df["status"].value_counts()
    plt.figure(figsize=(8, 5))
    status_counts.plot(kind="bar")
    plt.title("Task Status Breakdown")
    plt.ylabel("Count")
    plt.xticks(rotation=45)
    plt.tight_layout()
    plt.savefig("dashboard_chart.png")
    print("✅ Dashboard chart saved as dashboard_chart.png")

if __name__ == "__main__":
    run()
