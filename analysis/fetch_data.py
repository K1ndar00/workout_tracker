"""Download your completed sets from Supabase into data/sets.csv.

Read-only. It logs in as you (email + password) with the public anon key, so Row Level Security
applies exactly as in the web app: you can only ever get your own data. No database password is used.

    python fetch_data.py
"""
import getpass
import os
import sys
from pathlib import Path

import pandas as pd
import requests
from dotenv import load_dotenv

OUT = Path(__file__).parent / "data" / "sets.csv"
PAGE = 1000  # Supabase returns at most 1000 rows per request, so we read page by page
COLUMNS = ["date", "workout_id", "exercise_id", "exercise_name", "part", "set_id", "weight_kg", "reps", "volume_kg"]


def login(base: str, anon_key: str, email: str, password: str) -> str:
    """Returns an access token (a JWT) for the user."""
    r = requests.post(
        f"{base}/auth/v1/token",
        params={"grant_type": "password"},
        headers={"apikey": anon_key},
        json={"email": email, "password": password},
        timeout=30,
    )
    if r.status_code != 200:
        # Do not print the response body: it can echo what was sent.
        sys.exit(f"Login failed (HTTP {r.status_code}). Check WT_EMAIL / WT_PASSWORD and SUPABASE_URL.")
    return r.json()["access_token"]


def fetch_sets(base: str, anon_key: str, token: str) -> pd.DataFrame:
    """All completed sets (view v_set_facts), oldest first."""
    headers = {"apikey": anon_key, "Authorization": f"Bearer {token}", "Range-Unit": "items"}
    params = {"select": ",".join(COLUMNS), "completed": "eq.true", "order": "date.asc,set_id.asc"}
    rows: list[dict] = []
    start = 0
    while True:
        headers["Range"] = f"{start}-{start + PAGE - 1}"
        r = requests.get(f"{base}/rest/v1/v_set_facts", headers=headers, params=params, timeout=60)
        if r.status_code not in (200, 206):
            sys.exit(f"Fetching data failed (HTTP {r.status_code}): {r.text[:200]}")
        page = r.json()
        rows.extend(page)
        if len(page) < PAGE:
            return pd.DataFrame(rows, columns=COLUMNS)
        start += PAGE


def main() -> None:
    load_dotenv(Path(__file__).parent / ".env")
    base = os.environ.get("SUPABASE_URL", "").rstrip("/")
    anon_key = os.environ.get("SUPABASE_ANON_KEY", "")
    email = os.environ.get("WT_EMAIL", "")
    if not (base and anon_key and email):
        sys.exit("Set SUPABASE_URL, SUPABASE_ANON_KEY and WT_EMAIL (see .env.example).")
    password = os.environ.get("WT_PASSWORD") or getpass.getpass("Password: ")

    df = fetch_sets(base, anon_key, login(base, anon_key, email, password))
    OUT.parent.mkdir(exist_ok=True)
    df.to_csv(OUT, index=False)
    print(f"Saved {len(df)} sets to {OUT}")


if __name__ == "__main__":
    main()
