"""Tiny static server for the fixture sites.

Serves a directory tree on 127.0.0.1 with two extras the fixtures need:
redirect rules from _rules.json, and correct content types for XML.
"""
from __future__ import annotations

import json
import os
import socket
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from typing import Dict, Tuple


def free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


class FixtureHandler(SimpleHTTPRequestHandler):
    rules: Dict[str, object] = {}

    def __init__(self, *args, directory: str = None, **kwargs):
        self._rules_path = os.path.join(directory or ".", "_rules.json")
        super().__init__(*args, directory=directory, **kwargs)

    def _load_rules(self) -> Dict[str, object]:
        try:
            with open(self._rules_path, "r", encoding="utf-8") as handle:
                return json.load(handle)
        except (OSError, ValueError):
            return {}

    def do_GET(self) -> None:  # noqa: N802 (stdlib naming)
        if self._handle_rules():
            return
        super().do_GET()

    def do_HEAD(self) -> None:  # noqa: N802
        if self._handle_rules():
            return
        super().do_HEAD()

    def _handle_rules(self) -> bool:
        rules = self._load_rules()
        path = self.path.split("?")[0]
        redirects = rules.get("redirects") or {}
        if path in redirects:
            target, status = redirects[path]
            self.send_response(int(status))
            self.send_header("Location", target)
            self.send_header("Content-Length", "0")
            self.end_headers()
            return True
        if path in (rules.get("gone") or []):
            self.send_error(410, "Gone")
            return True
        return False

    def guess_type(self, path):  # noqa: D102
        if str(path).endswith(".xml"):
            return "application/xml"
        return super().guess_type(path)

    def log_message(self, *args) -> None:  # keep the test output readable
        return


def serve(directory: str, port: int) -> Tuple[ThreadingHTTPServer, threading.Thread]:
    handler = partial(FixtureHandler, directory=directory)
    server = ThreadingHTTPServer(("127.0.0.1", port), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server, thread
