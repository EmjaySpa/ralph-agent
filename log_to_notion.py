def log_to_notion(task_title, task_body, doc_url):
    notion_url = "https://api.notion.com/v1/pages"
    headers = {
        "Authorization": f"Bearer {NOTION_TOKEN}",
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28"
    }

    due_date = (datetime.datetime.utcnow() + datetime.timedelta(days=3)).strftime("%Y-%m-%d")
    assignee_name = determine_assignee(task_title, task_body)

    # fallback to None if URL is empty
    doc_link_value = doc_url if doc_url.startswith("http") else None

    data = {
        "parent": {"database_id": NOTION_DATABASE_ID},
        "properties": {
            "Task name": {"title": [{"text": {"content": task_title}}]},
            "Summary": {"rich_text": [{"text": {"content": task_body}}]},
            "Status": {"status": {"name": "Not started"}},
            "Due": {"date": {"start": due_date}},
            "Doc Link": {"url": doc_link_value}
        }
    }

    # Only try to assign if it's Emjay Spa & Wellness
    if assignee_name == "Emjay Spa & Wellness":
        data["properties"]["Assignee"] = {"people": []}  # Empty but valid

    response = requests.post(notion_url, headers=headers, json=data)
    print("🔍 Notion response status code:", response.status_code)
    print("📦 Notion response content:", response.text)
    return response.status_code == 200
