import os
import re
import asyncio
from flask import Flask, request, send_file, jsonify
from roblox_asset_downloader import RobloxAssetDownloader

app = Flask(__name__)

@app.route("/", methods=["POST"])
def download_api():
    """Accept a JSON body or form field 'clothing' (ID or URL), process the asset, and return the resulting PNG as an attachment."""
    try:
        if request.is_json:
            data = request.get_json()
        else:
            data = request.form.to_dict()

        clothing = data.get("clothing") if isinstance(data, dict) else None
        if not clothing:
            return jsonify({"error": "Please provide clothing id or url in field 'clothing'"}), 400

        downloader = RobloxAssetDownloader()
        try:
            asyncio.run(downloader.process_asset(clothing))
        except Exception:
            return jsonify({"error": "Error processing asset"}), 500

        asset_id = re.sub(r"[^0-9]", "", clothing)
        if not asset_id:
            return jsonify({"error": "Could not determine numeric asset id from input"}), 400

        downloads_dir = os.environ.get(
            "DOWNLOADS_DIR",
            os.path.join(os.path.dirname(os.path.dirname(__file__)), "downloads"),
        )
        file_path = os.path.join(downloads_dir, f"{asset_id}.png")

        if not os.path.exists(file_path):
            return jsonify({"error": "Download finished but output file not found"}), 500

        return send_file(
            file_path, mimetype="image/png", as_attachment=True, download_name=f"{asset_id}.png"
        )
    except Exception:
        return jsonify({"error": "Internal server error"}), 500

def handler(environ, start_response):
    return app(environ, start_response)
