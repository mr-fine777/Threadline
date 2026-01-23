"""
WSGI entrypoint for Apache/mod_wsgi deployments.

Usage (Apache):
  WSGIScriptAlias /roblox_downloader C:/path/to/repo/api/src/wsgi.py
  <Directory "C:/path/to/repo/api/src">
      Require all granted
  </Directory>

This file exposes a `application` object that mod_wsgi will use.
"""
from web_server import app as application
