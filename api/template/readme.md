# Roblox Clothing Downloader - Web UI

This adds a small web UI to call the existing downloader and return the processed PNG directly to your browser.

Files added:

- `src/web_server.py` - a small Flask server that exposes `/` (UI) and `/download` endpoints.
- `src/static/index.html` - the frontend page where you enter a clothing ID or URL.

Quick start (Windows PowerShell):

1. Create and activate a virtual environment (optional but recommended):

```powershell
python -m venv venv; .\venv\Scripts\Activate.ps1
```

2. Install dependencies:

```powershell
pip install -r requirements.txt
```

3. Run the web server:

```powershell
python src\web_server.py
```

4. Open your browser to http://localhost:5000 and enter a clothing ID or URL.

Notes / assumptions:
- The web server uses the existing downloader code (it calls the same async functions). The server runs the async downloader synchronously via `asyncio.run` per request.
- The downloader saves the resulting PNG in the `downloads/` folder; the web endpoint returns that PNG as an attachment.
- For production usage, run behind a proper ASGI/WSGI server and consider converting to an async web framework (FastAPI + uvicorn) for better concurrency.

Running with Apache/XAMPP (recommended flow for local dev web hosting)
---------------------------------------------------------------

Goal: Serve the static UI from Apache's htdocs and proxy API calls to the Python server.

Steps:

1. Copy `src/static` into your XAMPP htdocs directory (for example `C:\xampp\htdocs\roblox_downloader`). You should end up with `C:\xampp\htdocs\roblox_downloader\index.html` and supporting assets.

   Example PowerShell command (adjust XAMPP path if different):

```powershell
# Create target folder and copy files (adjust path if XAMPP installed elsewhere)
$dst = 'C:\xampp\htdocs\roblox_downloader'
if(-not (Test-Path $dst)) { New-Item -ItemType Directory -Path $dst -Force }
Copy-Item -Path .\src\static\* -Destination $dst -Recurse -Force
```

2. Start the Python API server (it listens on localhost:5000):

```powershell
.\run_web.bat
```

3. Configure Apache to proxy API calls to the local Python server.
   Edit your Apache config (httpd.conf or create a new included conf) and ensure these modules are enabled:

```
LoadModule proxy_module modules/mod_proxy.so
LoadModule proxy_http_module modules/mod_proxy_http.so
```


```
<Location /roblox_downloader/api>
    ProxyPass http://127.0.0.1:5000/api
    ProxyPassReverse http://127.0.0.1:5000/api
</Location>
```

   Or use ProxyPass and ProxyPassReverse directly:

```
ProxyPass /roblox_downloader/api http://127.0.0.1:5000/api
ProxyPassReverse /roblox_downloader/api http://127.0.0.1:5000/api
```

4. Restart Apache (XAMPP control panel -> Stop/Start Apache).

5. Open the browser to:

```
http://localhost/roblox_downloader/index.html
```

   The frontend will POST to `/download`. If you're serving the static site under `/roblox_downloader/` you should edit the JavaScript endpoint to point to `/roblox_downloader/api/download` or use the Apache proxying path above that maps to `/api/download` on the Flask side.
- You may need to adjust the JS in `index.html` (under `src/static`) to post to the proxied path. For convenience, if you copy the static files to `/roblox_downloader/`, update the fetch call in `index.html` from `/download` to `/roblox_downloader/api/download`.
- For production-like setups, consider running the Python service under a Windows service or use a proper WSGI/ASGI server and secure the API.
If you want, I can:
- Update `index.html` automatically to use a configurable base path.
- Create an Apache-ready `.conf` you can drop into `C:\xampp\apache\conf\extra` and include from `httpd.conf`.
- Convert the Python server to FastAPI + uvicorn for better async handling behind Apache.

Deployment options (no local BAT files required)
------------------------------------------------
1) Recommended — Docker (portable, host anywhere with container support)

   - Build image:
     ```powershell
     docker build -t roblox-downloader:latest .
     ```

   - Run container:
     ```powershell
     docker run -p 5000:5000 --name roblox-downloader -d roblox-downloader:latest
     ```

   - Serve the static `src/static` files from your website (or from another nginx container) and proxy `/api/download` to the container (http://your-host:5000/api/download).

2) Apache + mod_wsgi (hosted on a webhost that supports Python/mod_wsgi)

   - Copy `src/static` into your webroot (example: `/var/www/your-site/roblox_downloader/` or `C:/xampp/htdocs/roblox_downloader/`).
   - Place this repository on the server and install requirements into a virtualenv.
   - Use `wsgi.py` (this repository includes a simple `wsgi.py`) and configure Apache to point to it. Example snippet for `httpd.conf`:

```
LoadModule wsgi_module modules/mod_wsgi.so
LoadModule proxy_module modules/mod_proxy.so
LoadModule proxy_http_module modules/mod_proxy_http.so

WSGIDaemonProcess roblox_downloader python-home=/path/to/venv python-path=/path/to/repo/api/src
WSGIScriptAlias /roblox_downloader /path/to/repo/api/src/wsgi.py

<Directory /path/to/repo/api/src>
    Require all granted
</Directory>

Alias /roblox_downloader/static /path/to/your/webroot/roblox_downloader
<Directory /path/to/your/webroot/roblox_downloader>
    Require all granted
</Directory>
```

   - Restart Apache. The UI will be at `https://your-site/roblox_downloader/index.html` and the API at `https://your-site/roblox_downloader/api/download`.

3) Gunicorn/NGINX (Linux host)

   - Install and configure a systemd unit to run the app with `gunicorn web_server:app`.
   - Configure nginx to serve the static files and proxy `/api/download` to gunicorn on port 5000.

Notes:
- If you're hosting on shared hosting without Python support, you'll need a host that supports Python web apps or use the Docker approach on a VPS or cloud provider.
- The backend requires Python and network access to Roblox. If the host blocks outbound connections or required ports, the downloader will fail.

If you want, I can also wire this into `run.bat` or create a separate `run_web.bat` to start the web server.
# Roblox Clothing Scraper
## TODO

- **Code Cleanup**: Refactor and optimize existing code for improved readability and maintainability.
- **GUI**: Develop a graphical user interface (GUI) to make the application more accessible to users unfamiliar with CLI.
- **Improved File Management**: Enhance file organization for downloaded assets, such as categorizing by asset type, date, or other metadata.
- **Download clothing metadata**: Retrieve and store additional information about downloaded assets, such as asset name, creator, price, etc.

   Local npm server for quick testing (optional)
   -------------------------------------------
   If you prefer to run a small Node-based server locally to test the frontend without configuring Apache or running the Python backend, this repo now includes a lightweight server.

   Steps:

   1. Install Node.js (recommended >=14) and npm.
   2. From the `api` folder, run:

   ```powershell
   npm install
   npm start
   ```

   3. Open `http://localhost:3000/` to view the UI. The server serves the static UI from `src/static/`.

   Behavior:
   - When you POST from the UI to `/api/download`, the server will try to proxy the request to a Python backend at `http://127.0.0.1:5000/api/download`. If that backend is running, the npm server forwards the response (image) to the browser.
   - If the Python backend is not available, the npm server returns a small placeholder PNG so you can validate the UI flow without Python.

   This npm approach is intended for local testing only; for production hosting use the Apache/mod_wsgi or another proper Python hosting option described earlier.
- **Single Asset Download**: Download individual clothing items by providing their ID or URL.

## Quick Start

1. **Clone the repository:**
    ```sh
    git clone <repository-url>
    cd <repository-directory>
    ```

2. **Run the `run.bat` script**:
    - The `run.bat` script automates setup and execution.
    - It will:
        - Create and activate a virtual environment.
        - Install necessary dependencies.
        - Launch the console interface.

    ```sh
    run.bat
    ```

3. **Follow On-Screen Instructions**:
   - Enter an asset ID or URL to download individual items.
   - Enter a group ID or URL to download all clothing items from a group.

## Project Structure

```plaintext
.
├── src/
│   ├── api_handler.py            # Manages API interactions with Roblox
│   ├── asset_type.py             # Defines asset types for processing
│   ├── console_interface.py      # Provides the CLI for user interaction
│   ├── constants.py              # Contains constants used across the project
│   ├── custom_logger.py          # Implements custom logging
│   ├── file_handler.py           # Manages file operations for saving assets
│   ├── group_handler.py          # Handles group-related operations
│   ├── main.py                   # Main entry point of the application
│   ├── roblox_asset_downloader.py # Downloads assets from Roblox
│   └── utils.py                  # Utility functions (e.g., validation)
├── downloads/                    # Folder where downloaded assets are stored
├── requirements.txt              # Lists all dependencies
├── run.bat                       # Batch script for running and setting up the project
└── README.md                     # Project documentation
```

## Installation and Setup

1. **Clone the repository**:
   ```sh
   git clone <repository-url>
   cd <repository-directory>
   ```

2. **Install Dependencies**:
   - Run `run.bat` to create a virtual environment and install dependencies, or manually use:
     ```sh
     python -m venv venv
     venv\Scripts\activate  # On Windows
     pip install -r requirements.txt
     ```

3. **Run the Application**:
   ```sh
   run.bat
   ```

## Requirements

- Python 3.x
- **Dependencies**:
  - Install via `requirements.txt`

## Modules Overview

| Module                   | Description                                                 |
|--------------------------|-------------------------------------------------------------|
| **`api_handler.py`**     | Handles API calls to Roblox for retrieving asset data.      |
| **`asset_type.py`**      | Defines asset processing types (e.g., shirts, pants).       |
| **`console_interface.py`** | Provides a user interface for entering asset and group data. |
| **`constants.py`**       | Holds constant values (URLs, retry settings).               |
| **`custom_logger.py`**   | Manages custom logging for the application.                 |
| **`file_handler.py`**    | Saves downloaded assets as PNG files in the `downloads/` folder. |
| **`group_handler.py`**   | Fetches all clothing assets in a group and initiates download. |
| **`main.py`**            | Main entry point for the CLI application.                   |
| **`roblox_asset_downloader.py`** | Downloads individual assets from Roblox.            |
| **`utils.py`**           | Helper functions for input validation and ID extraction.    |

## License

This project is licensed under the MIT License. See the LICENSE file for details.