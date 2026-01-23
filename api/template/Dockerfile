FROM python:3.11-slim

# Install system deps needed by Pillow and any other libs
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libjpeg-dev \
    zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy project files
COPY . /app

# Install Python deps
RUN pip install --no-cache-dir -r requirements.txt

# Expose port
EXPOSE 5000

# Use gunicorn to serve the Flask app (web_server.app)
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "web_server:app"]
