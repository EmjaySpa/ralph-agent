# email_parser.py

import re
from bs4 import BeautifulSoup

def parse_email(email):
    subject = email["subject"]
    body_html = email["body"]
    soup = BeautifulSoup(body_html, "html.parser")
    body_text = soup.get_text()

    task = {
        "Task name": subject.strip(),
        "Due": extract_due_date(body_text),
        "Tags": extract_tags(body_text),
        "Priority": extract_priority(body_text),
        "Content": body_text
    }

    return task

def extract_due_date(text):
    match = re.search(r"due[:\- ]+(\d{4}-\d{2}-\d{2})", text)
    return match.group(1) if match else None

def extract_tags(text):
    keywords = ["marketing", "growth", "client", "urgent"]
    return [word for word in keywords if word in text.lower()]

def extract_priority(text):
    for p in ["High", "Medium", "Low"]:
        if p.lower() in text.lower():
            return p
    return "Medium"
