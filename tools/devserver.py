"""Local development server for Duskward.

Serves www/ with caching disabled, so edits show up on a plain reload.

Usage: python tools/devserver.py [port]
"""
import contextlib
import functools
import http.server
import pathlib
import socket
import sys

WWW_DIR = pathlib.Path(__file__).resolve().parent.parent / "www"


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


class DualStackServer(http.server.ThreadingHTTPServer):
    address_family = socket.AF_INET6

    def server_bind(self):
        # Accept IPv4 too, so "localhost" works whichever address it resolves to
        with contextlib.suppress(Exception):
            self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
        return super().server_bind()


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8140
    handler = functools.partial(NoCacheHandler, directory=str(WWW_DIR))
    with DualStackServer(("::", port), handler) as server:
        print(f"Serving {WWW_DIR} at http://localhost:{port}", flush=True)
        server.serve_forever()


if __name__ == "__main__":
    main()
