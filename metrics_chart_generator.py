# metrics_chart_generator.py

import pandas as pd
import matplotlib.pyplot as plt

CSV_FILE = "dashboard_log.csv"

def plot_task_trends():
    df = pd.read_csv(CSV_FILE, parse_dates=["Date"])
    df = df.sort_values("Date")

    statuses = [
        "Not started", "In progress", "In review",
        "Waiting for Emjay", "Rejected – actioned",
        "Rejected – hold", "Done", "Overdue"
    ]

    plt.figure(figsize=(12, 6))
    for status in statuses:
        plt.plot(df["Date"], df[status], label=status)

    plt.title("📊 Task Trends Over Time")
    plt.xlabel("Date")
    plt.ylabel("Task Count")
    plt.legend()
    plt.grid(True)
    plt.tight_layout()
    plt.show()

if __name__ == "__main__":
    plot_task_trends()
