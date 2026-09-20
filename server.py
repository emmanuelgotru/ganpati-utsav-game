#!/usr/bin/env python3
"""Static file server with strict no-cache headers (prevents stale-asset black screens)."""
import http.server, socketserver, os

os.chdir(os.path.dirname(os.path.abspath(__file__)))

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

socketserver.TCPServer.allow_reuse_address = True
with socketserver.ThreadingTCPServer(('0.0.0.0', 3000), NoCacheHandler) as httpd:
    print('serving on :3000 (no-cache)')
    httpd.serve_forever()
