# doc_creator.py

from googleapiclient.discovery import build
from google_auth import get_credentials  # you must set this up
import json

def create_doc(title, body_text, share_with_email):
    creds = get_credentials()
    service = build("docs", "v1", credentials=creds)

    doc = service.documents().create(body={"title": title}).execute()
    doc_id = doc["documentId"]

    # insert text
    service.documents().batchUpdate(
        documentId=doc_id,
        body={"requests": [{"insertText": {"location": {"index": 1}, "text": body_text}}]}
    ).execute()

    # Share via Drive API
    drive_service = build("drive", "v3", credentials=creds)
    drive_service.permissions().create(
        fileId=doc_id,
        body={"type": "user", "role": "writer", "emailAddress": share_with_email},
        fields="id"
    ).execute()

    return f"https://docs.google.com/document/d/{doc_id}/edit"
