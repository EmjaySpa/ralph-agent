from email_alerts import send_email_alert

send_email_alert(
    subject="✅ Emjay Email Test",
    body="This is a test email from your Notion task alert system.",
    attachment_path="task_trends_weekly.png"  # optional
)
