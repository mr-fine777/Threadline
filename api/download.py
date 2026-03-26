import os
import re
import logging
import asyncio
from typing import Any

def handler(request):
    """Vercel Python serverless function for /api/download."""
    try:
        # Parse input
        if request.method == "POST":
            if request.headers.get("content-type", "").startswith("application/json"):
                data = request.json
            else:
                data = request.form
        else:
            return {
                "statusCode": 405,
                "body": "Method Not Allowed"
            }

        clothing = data.get("clothing") if isinstance(data, dict) else None
        if not clothing:
            return {
                "statusCode": 400,
                "body": '{"error": "Please provide clothing id or url in field 'clothing'"}',
                "headers": {"Content-Type": "application/json"}
            }

        # Import here to avoid cold start penalty
        try:
            from roblox_asset_downloader import RobloxAssetDownloader
        except ImportError:
            # Try importing from api/ if not found
            import sys
            sys.path.append(os.path.dirname(__file__))
            from roblox_asset_downloader import RobloxAssetDownloader

        # Run the asynchronous processing synchronously for this endpoint
        downloader = RobloxAssetDownloader()
        try:
            asyncio.run(downloader.process_asset(clothing))
        except Exception:
            logging.exception("Error processing asset")
            return {
                "statusCode": 500,
                "body": '{"error": "Error processing asset"}',
                "headers": {"Content-Type": "application/json"}
            }

        # Determine the numeric asset id from the provided input
        asset_id = re.sub(r"[^0-9]", "", clothing)
        if not asset_id:
            return {
                "statusCode": 400,
                "body": '{"error": "Could not determine numeric asset id from input"}',
                "headers": {"Content-Type": "application/json"}
            }

        downloads_dir = os.environ.get(
            "DOWNLOADS_DIR",
            os.path.join(os.path.dirname(os.path.dirname(__file__)), "downloads"),
        )
        file_path = os.path.join(downloads_dir, f"{asset_id}.png")

        if not os.path.exists(file_path):
            return {
                "statusCode": 500,
                "body": '{"error": "Download finished but output file not found"}',
                "headers": {"Content-Type": "application/json"}
            }

        # Read the file and return as binary
        with open(file_path, "rb") as f:
            file_bytes = f.read()
        return {
            "statusCode": 200,
            "body": file_bytes,
            "isBase64Encoded": True,
            "headers": {
                "Content-Type": "image/png",
                "Content-Disposition": f'attachment; filename="{asset_id}.png"'
            }
        }
    except Exception:
        logging.exception("Unhandled exception in /api/download handler")
        return {
            "statusCode": 500,
            "body": '{"error": "Internal server error"}',
            "headers": {"Content-Type": "application/json"}
        }
