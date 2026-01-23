@echo off
title Run Roblox Downloader Web API
cls

REM Create virtual environment if it doesn't exist
IF NOT EXIST "venv" (
    echo Creating virtual environment...
    python -m venv venv
    IF ERRORLEVEL 1 (
        echo Failed to create virtual environment.
        pause
        exit /b 1
    )
)

echo Activating virtual environment...
call venv\Scripts\activate

echo Installing dependencies (if needed)...
pip install -r requirements.txt

echo Starting Flask API server on http://127.0.0.1:5000
python src\web_server.py
