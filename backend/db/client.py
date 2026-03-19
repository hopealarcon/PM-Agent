import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()


def get_client() -> Client:
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    client = create_client(url, key)
    # Force HTTP/1.1 to avoid HTTP/2 StreamReset issues
    client.postgrest.session.headers.update({"connection": "close"})
    return client
