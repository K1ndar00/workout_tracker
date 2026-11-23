"""Tests for fetch_data.py against a tiny local fake of the Supabase HTTP API. Run: pytest"""
import json
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

import pytest

import fetch_data

ROWS = [{c: f"{c}-{i}" for c in fetch_data.COLUMNS} for i in range(5)]
seen = {"auth": [], "ranges": [], "query": []}


class Fake(BaseHTTPRequestHandler):
    def log_message(self, *a):  # keep test output quiet
        pass

    def _send(self, status, body):
        data = json.dumps(body).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_POST(self):  # login
        body = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        if body["password"] != "right":
            return self._send(400, {"error": "invalid_grant", "echo": body})
        self._send(200, {"access_token": "TOKEN"})

    def do_GET(self):  # paged data
        seen["auth"].append((self.headers.get("apikey"), self.headers.get("Authorization")))
        seen["query"].append(self.path)
        start, end = map(int, self.headers["Range"].split("-"))
        seen["ranges"].append((start, end))
        self._send(206, ROWS[start : end + 1])


@pytest.fixture()
def server():
    srv = HTTPServer(("127.0.0.1", 0), Fake)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    seen.update(auth=[], ranges=[], query=[])
    yield f"http://127.0.0.1:{srv.server_port}"
    srv.shutdown()


def test_login_returns_token(server):
    assert fetch_data.login(server, "ANON", "me@example.com", "right") == "TOKEN"


def test_login_failure_exits_without_leaking_the_response(server, capsys):
    with pytest.raises(SystemExit) as e:
        fetch_data.login(server, "ANON", "me@example.com", "wrong")
    assert "Login failed" in str(e.value) and "wrong" not in str(e.value)


def test_fetch_reads_every_page(server, monkeypatch):
    monkeypatch.setattr(fetch_data, "PAGE", 2)  # 5 rows -> pages of 2, 2, 1
    df = fetch_data.fetch_sets(server, "ANON", "TOKEN")
    assert len(df) == 5 and list(df.columns) == fetch_data.COLUMNS
    assert seen["ranges"] == [(0, 1), (2, 3), (4, 5)]
    assert all(a == ("ANON", "Bearer TOKEN") for a in seen["auth"])
    assert "completed=eq.true" in seen["query"][0]  # only completed sets are requested


def test_fetch_with_exactly_one_full_page_asks_for_the_next(server, monkeypatch):
    monkeypatch.setattr(fetch_data, "PAGE", 5)
    assert len(fetch_data.fetch_sets(server, "ANON", "TOKEN")) == 5
    assert seen["ranges"] == [(0, 4), (5, 9)]  # an empty second page ends the loop
