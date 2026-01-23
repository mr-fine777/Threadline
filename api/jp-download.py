import os
import re
import asyncio
import json
from roblox_asset_downloader import RobloxAssetDownloader

def handler(request, response):
    """
    Vercel Python handler for asset download.
    Accepts POST with JSON or form-data: {"clothing": <id or url>}.
    Returns PNG file or JSON error.
    """
    try:
        if request.method != "POST":
            response.status_code = 405
            response.body = json.dumps({"error": "Method not allowed"})
            response.headers["Content-Type"] = "application/json"
            return response

        try:
            data = request.json() if request.headers.get("content-type", "").startswith("application/json") else request.form()
        except Exception:
            data = {}

        clothing = data.get("clothing") if isinstance(data, dict) else None
        if not clothing:
            response.status_code = 400
            response.body = json.dumps({"error": "Please provide clothing id or url in field 'clothing'"})
            response.headers["Content-Type"] = "application/json"
            return response

        downloader = RobloxAssetDownloader()
        try:
            asyncio.run(downloader.process_asset(clothing))
        except Exception:
            response.status_code = 500
            response.body = json.dumps({"error": "Error processing asset"})
            response.headers["Content-Type"] = "application/json"
            return response

        asset_id = re.sub(r"[^0-9]", "", clothing)
        if not asset_id:
            response.status_code = 400
            response.body = json.dumps({"error": "Could not determine numeric asset id from input"})
            response.headers["Content-Type"] = "application/json"
            return response

        downloads_dir = os.environ.get(
            "DOWNLOADS_DIR",
            os.path.join(os.path.dirname(os.path.dirname(__file__)), "downloads"),
        )
        file_path = os.path.join(downloads_dir, f"{asset_id}.png")

        if not os.path.exists(file_path):
            response.status_code = 500
            response.body = json.dumps({"error": "Download finished but output file not found"})
            response.headers["Content-Type"] = "application/json"
            return response

        with open(file_path, "rb") as f:
            file_bytes = f.read()
        response.status_code = 200
        response.body = file_bytes
        response.headers["Content-Type"] = "image/png"
        response.headers["Content-Disposition"] = f"attachment; filename={asset_id}.png"
        return response
    except Exception:
        response.status_code = 500
        response.body = json.dumps({"error": "Internal server error"})
        response.headers["Content-Type"] = "application/json"
        return response
