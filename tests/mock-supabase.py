#!/usr/bin/env python3
"""Small in-memory PostgREST stand-in for the browser sync smoke test."""

import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse


TABLES = {"trip_events": {}, "trip_expenses": {}}


class Handler(BaseHTTPRequestHandler):
    def send_json_headers(self, status=200):
        self.send_response(status)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "apikey, authorization, content-type, prefer")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Content-Type", "application/json")
        self.end_headers()

    def do_OPTIONS(self):
        self.send_json_headers(204)

    def do_GET(self):
        table = urlparse(self.path).path.rsplit("/", 1)[-1]
        if table not in TABLES:
            self.send_json_headers(404)
            return
        self.send_json_headers()
        self.wfile.write(json.dumps(list(TABLES[table].values())).encode())

    def do_POST(self):
        table = urlparse(self.path).path.rsplit("/", 1)[-1]
        if table not in TABLES:
            self.send_json_headers(404)
            return
        length = int(self.headers.get("Content-Length", "0"))
        rows = json.loads(self.rfile.read(length) or b"[]")
        if isinstance(rows, dict):
            rows = [rows]
        ignore = "ignore-duplicates" in self.headers.get("Prefer", "")
        returned = []
        for row in rows:
            key = (row["trip_id"], row["id"])
            if ignore:
                TABLES[table].setdefault(key, row)
            else:
                TABLES[table][key] = row
                returned.append(row)
        if "return=minimal" in self.headers.get("Prefer", ""):
            self.send_json_headers(204)
            return
        self.send_json_headers()
        self.wfile.write(json.dumps(returned).encode())

    def log_message(self, *_):
        return


if __name__ == "__main__":
    ThreadingHTTPServer(("127.0.0.1", 4180), Handler).serve_forever()
