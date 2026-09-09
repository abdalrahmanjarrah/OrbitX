#!/usr/bin/env python3
"""
Site Blocker Backend
لوحة تحكم لت/blocking المواقع على الجهاز
"""

import json
import os
import subprocess
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

HOSTS_FILE = "/etc/hosts"
CONFIG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "config.json")
BLOCKER_MARKER_START = "# === Site Blocker Start ==="
BLOCKER_MARKER_END = "# === Site Blocker End ==="

def load_config():
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, "r") as f:
            return json.load(f)
    return {
        "blocked_sites": [],
        "enabled": True,
        "schedule": {"enabled": False, "start": "09:00", "end": "17:00"},
        "password_protect": False,
        "password": ""
    }

def save_config(config):
    with open(CONFIG_FILE, "w") as f:
        json.dump(config, f, indent=2)

def apply_to_hosts(config):
    try:
        with open(HOSTS_FILE, "r") as f:
            content = f.read()
    except PermissionError:
        return False, "ما عندي صلاحية لتعديل /etc/hosts — شغّل السيرفر بـ sudo"

    # Remove old entries
    if BLOCKER_MARKER_START in content:
        start = content.index(BLOCKER_MARKER_START)
        end = content.index(BLOCKER_MARKER_END) + len(BLOCKER_MARKER_END)
        content = content[:start] + content[end:]

    if config["enabled"] and config["blocked_sites"]:
        lines = [BLOCKER_MARKER_START]
        for site in config["blocked_sites"]:
            lines.append(f"127.0.0.1 {site}")
            lines.append(f"127.0.0.1 www.{site}")
        lines.append(BLOCKER_MARKER_END)
        content = content.rstrip() + "\n" + "\n".join(lines) + "\n"

    try:
        with open(HOSTS_FILE, "w") as f:
            f.write(content)
        return True, "تم التحديث بنجاح"
    except PermissionError:
        return False, "ما عندي صلاحية — شغّل السيرفر بـ sudo"

def install_startup_service():
    service_content = f"""[Unit]
Description=Site Blocker - Apply blocked sites on boot
After=network.target

[Service]
Type=oneshot
ExecStart=/usr/bin/python3 {os.path.dirname(os.path.abspath(__file__))}/server.py --apply-only
User=root

[Install]
WantedBy=multi-user.target
"""
    service_path = "/etc/systemd/system/site-blocker.service"
    try:
        with open(service_path, "w") as f:
            f.write(service_content)
        subprocess.run(["systemctl", "daemon-reload"], capture_output=True)
        subprocess.run(["systemctl", "enable", "site-blocker"], capture_output=True)
        return True, "تم تثبيت خدمة الحظر الدائم — يشتغل حتى بعد إعادة التشغيل!"
    except PermissionError:
        return False, "ما عندي صلاحية — شغّل السيرفر بـ sudo"

class BlockerHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)

        if parsed.path == "/":
            self.path = "/index.html"
            return super().do_GET()

        elif parsed.path == "/api/config":
            config = load_config()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(config).encode())

        elif parsed.path == "/api/status":
            config = load_config()
            try:
                with open(HOSTS_FILE, "r") as f:
                    hosts = f.read()
                is_active = BLOCKER_MARKER_START in hosts and config["enabled"]
            except:
                is_active = False
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({"active": is_active, "blocked_count": len(config["blocked_sites"])}).encode())

        elif parsed.path == "/api/apply":
            config = load_config()
            ok, msg = apply_to_hosts(config)
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({"success": ok, "message": msg}).encode())

        elif parsed.path == "/api/install-service":
            ok, msg = install_startup_service()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({"success": ok, "message": msg}).encode())

        else:
            return super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length)
        data = json.loads(body) if body else {}

        config = load_config()

        if parsed.path == "/api/add-site":
            site = data.get("site", "").strip().lower()
            site = site.replace("https://", "").replace("http://", "").replace("www.", "").rstrip("/")
            if site and site not in config["blocked_sites"]:
                config["blocked_sites"].append(site)
                save_config(config)
                ok, msg = apply_to_hosts(config)
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"success": True, "message": f"تم حظر {site}", "config": config}).encode())
            else:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "message": "الموقع موجود أصلاً أو فاضي"}).encode())

        elif parsed.path == "/api/remove-site":
            site = data.get("site", "")
            if site in config["blocked_sites"]:
                config["blocked_sites"].remove(site)
                save_config(config)
                apply_to_hosts(config)
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "config": config}).encode())

        elif parsed.path == "/api/toggle":
            config["enabled"] = data.get("enabled", config["enabled"])
            save_config(config)
            apply_to_hosts(config)
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "config": config}).encode())

        elif parsed.path == "/api/update-schedule":
            config["schedule"] = data.get("schedule", config["schedule"])
            save_config(config)
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "config": config}).encode())

        elif parsed.path == "/api/unblock-all":
            config["blocked_sites"] = []
            save_config(config)
            apply_to_hosts(config)
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "config": config}).encode())

        elif parsed.path == "/api/set-password":
            config["password_protect"] = data.get("enabled", False)
            config["password"] = data.get("password", "")
            save_config(config)
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({"success": True}).encode())

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def log_message(self, format, *args):
        pass

if __name__ == "__main__":
    if "--apply-only" in sys.argv:
        config = load_config()
        apply_to_hosts(config)
        sys.exit(0)

    server = HTTPServer(("0.0.0.0", 8080), BlockerHandler)
    print("🛡️ Site Blocker شغّال على: http://localhost:8080")
    print("📋 للحظر الدائم: شغّل: sudo python3 server.py --install-service")
    server.serve_forever()
