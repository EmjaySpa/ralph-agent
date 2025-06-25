from google.oauth2 import service_account
from googleapiclient.discovery import build
from datetime import datetime

# Replace this with your Gmail address
YOUR_EMAIL = 'emjayspas@gmail.com'

# Load service account credentials
creds = service_account.Credentials.from_service_account_file(
    'credentials.json',
    scopes=['https://www.googleapis.com/auth/drive']
)

# Connect to Drive API
service = build('drive', 'v3', credentials=creds)

# Create a new Google Doc
file_metadata = {
    'name': f'Emjay-Test-Doc-{datetime.now().strftime("%Y%m%d-%H%M%S")}',
    'mimeType': 'application/vnd.google-apps.document'
}
file = service.files().create(body=file_metadata, fields='id, webViewLink').execute()

# Share the doc with your Google account
permission = {
    'type': 'user',
    'role': 'writer',
    'emailAddress': YOUR_EMAIL
}
service.permissions().create(fileId=file.get('id'), body=permission, sendNotificationEmail=True).execute()

# Output result
print("✅ Google Doc Created and Shared")
print("🆔 ID:", file.get('id'))
print("🔗 Link:", file.get('webViewLink'))
