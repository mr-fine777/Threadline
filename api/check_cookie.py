import os
import re
import asyncio
from flask import Flask, request, jsonify
# If APIHandler is in another file, make sure to copy it to /api or adjust import
from api_handler import APIHandler

app = Flask(__name__)

@app.route("/", methods=["GET"])
def check_cookie():
    """Check whether ROBLOX_COOKIE is set in the environment and test asset access."""
    try:
        asset_id = request.args.get("asset_id", "1818")
        asset_id = re.sub(r"[^0-9]", "", asset_id)
        test_url = f"https://assetdelivery.roblox.com/v1/asset/?id={asset_id}"

        has_cookie = bool(os.environ.get("ROBLOX_COOKIE") or os.environ.get("ROBLOSECURITY"))

        handler = APIHandler()
        try:
            result = asyncio.run(handler.fetch_json(test_url))
            if result is None:
                return jsonify({
                    "has_cookie": has_cookie,
                    "asset_status": "non-200 or error",
                    "message": "Asset request returned non-200 or could not be parsed",
                }), 200
            return jsonify({
                "has_cookie": has_cookie,
                "asset_status": 200,
                "message": "Asset request succeeded (JSON)",
                "sample_keys": list(result.keys()) if isinstance(result, dict) else None,
            }), 200
        finally:
            try:
                asyncio.run(handler.close())
            except Exception:
                pass
    except Exception:
        return jsonify({"error": "Internal server error"}), 500

def handler(environ, start_response):
    return app(environ, start_response)
