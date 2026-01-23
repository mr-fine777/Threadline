"""
Vercel WSGI entrypoint.

Vercel's Python runtime will look for a WSGI callable named `app`.
We attempt to import the Flask `app` from `src/web_server.py`. If the
import fails (for example due to an exception at module import-time), we
create a minimal Flask application that returns a 500 error and logs the
original exception. This prevents the serverless function from crashing
at import time and gives clearer error responses in the deployment logs.
"""

import logging
import traceback

from flask import Flask, jsonify

try:
	# Attempt to import the real app
	from web_server import app  # type: ignore
except Exception as exc:  # pragma: no cover - helpful for runtime debugging
	# Log the import error with traceback so it appears in Vercel build logs
	logging.exception("Failed to import web_server.app for Vercel WSGI entrypoint")
	tb = traceback.format_exc()

	# Create a minimal Flask app that returns a helpful 500 response
	app = Flask(__name__)

	@app.route("/__vercel_healthcheck")
	def _health():
		return jsonify({"ok": False, "error": "web_server import failed"}), 500

	@app.route("/")
	def _root():
		return (
			"<h1>Application error</h1>"
			"<p>The Flask application failed to initialize on import. Check logs.</p>"
			"<pre>" + tb + "</pre>",
			500,
		)

