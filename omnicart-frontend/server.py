#!/usr/bin/env python3
"""
High-Performance Local Development HTTP Server for OmniCart
Features:
- Multi-threaded request handling (no blocking on concurrent asset downloads)
- Static asset caching headers (instant subsequent loads from browser memory/disk cache)
- Clean CORS headers
- Quiet console logging to eliminate Windows console stdout pause/lockup
"""

import os
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler
from socketserver import ThreadingMixIn

class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True

class FastCachedHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        ext = os.path.splitext(self.path.split('?')[0])[1].lower()
        if ext in ('.js', '.css', '.html', '') or self.path.endswith('/'):
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.send_header('Pragma', 'no-cache')
            self.send_header('Expires', '0')
        elif ext in ('.png', '.jpg', '.jpeg', '.webp', '.svg', '.ico', '.woff2', '.ttf'):
            self.send_header('Cache-Control', 'public, max-age=3600')
        
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

    def log_message(self, format, *args):
        # Skip verbose request logging to avoid terminal blocking on Windows
        pass

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 3000
    web_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(web_dir)
    server = ThreadedHTTPServer(('0.0.0.0', port), FastCachedHandler)
    print(f"[OmniCart Fast Server] Listening on http://localhost:{port} (serving {web_dir})")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
