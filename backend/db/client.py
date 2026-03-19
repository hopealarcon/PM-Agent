import os
import requests
from dotenv import load_dotenv

load_dotenv()


class SupabaseClient:
    def __init__(self, url: str, key: str):
        self.base_url = f"{url}/rest/v1"
        self.headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }

    def insert(self, table: str, data: dict) -> dict:
        res = requests.post(f"{self.base_url}/{table}", json=data, headers=self.headers)
        res.raise_for_status()
        return res.json()[0]

    def insert_many(self, table: str, data: list) -> list:
        res = requests.post(f"{self.base_url}/{table}", json=data, headers=self.headers)
        res.raise_for_status()
        return res.json()

    def select(self, table: str, columns: str = "*", filters: dict | None = None,
               order: str | None = None, limit: int | None = None) -> list:
        params: dict = {"select": columns}
        if filters:
            params.update(filters)
        if order:
            params["order"] = order
        if limit:
            params["limit"] = str(limit)
        res = requests.get(f"{self.base_url}/{table}", params=params, headers=self.headers)
        res.raise_for_status()
        return res.json()


def get_client() -> SupabaseClient:
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    return SupabaseClient(url, key)
