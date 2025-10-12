#!/usr/bin/env python3
from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import hashlib
import hmac

API_KEY = "change-this-to-a-random-string"

class UpdateHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        auth = self.headers.get("Authorization")
        if not auth or auth != f"Bearer {API_KEY}":
            self.send_response(401)
            self.end_headers()
            return
        
        if self.path == "/version":
            with open("version.json") as f:
                data = json.load(f)
            
            # Add signature to verify integrity
            signature = hmac.new(API_KEY.encode(), json.dumps(data).encode(), hashlib.sha256).hexdigest()
            data["signature"] = signature
            
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(data).encode())
        else:
            self.send_response(404)
            self.end_headers()

if __name__ == "__main__":
    server = HTTPServer(("127.0.0.1", 8080), UpdateHandler)
    print("Update server running on port 8080 (localhost only)")
    server.serve_forever()
