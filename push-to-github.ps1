<#
Helper PowerShell script to initialize a git repo, commit the current workspace,
and push to a remote GitHub repository.

USAGE (interactive):
1. Open PowerShell in Administrator or normal shell (no special rights required).
2. Run: .\push-to-github.ps1
3. When prompted, enter the HTTPS remote URL for your repo, for example:
   https://github.com/mr-fine777/snookie-online.git

Notes:
- This script will NOT store any token. If Git asks for credentials when pushing,
  enter your GitHub username and use a Personal Access Token (PAT) as the password.
- If you prefer SSH, add the remote URL as an SSH URL when prompted.
#>

param()

$cwd = Split-Path -Path $MyInvocation.MyCommand.Definition -Parent
Set-Location $cwd

Write-Host "Working in: $cwd"

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Error "Git is not installed or not in PATH. Install Git and re-run this script: https://git-scm.com/downloads"
    exit 1
}

# Initialize repo if needed
if (-not (Test-Path .git)) {
    Write-Host "No .git found — initializing new repository..."
    git init
} else {
    Write-Host "Found existing .git (repository already initialized)."
}

# Create useful files if missing
if (-not (Test-Path .gitignore)) {
    Write-Host "Creating default .gitignore"
    @"node_modules/
.env
*.log
converter-server/node_modules/
converter-server/yt-dlp.exe
"@ | Out-File -FilePath .gitignore -Encoding utf8
}

if (-not (Test-Path README.md)) {
    Write-Host "Creating README.md"
    "# snookie-online" | Out-File -FilePath README.md -Encoding utf8
}

# Stage files
Write-Host "Staging files..."
# Be explicit about what we add
git add .gitignore README.md index.html styles.css converter-server img files ytmp3_files || git add -A

# Commit
$commitMessage = Read-Host "Enter commit message (default: 'Initial commit: front-end + converter server')"
if ([string]::IsNullOrWhiteSpace($commitMessage)) { $commitMessage = 'Initial commit: front-end + converter server' }

# If there are no changes, skip commit
$changes = git status --porcelain
if ([string]::IsNullOrWhiteSpace($changes)) {
    Write-Host "No changes to commit."
} else {
    git commit -m "$commitMessage"
}

# Set branch to main
git branch -M main

# Add remote
$remoteUrl = Read-Host "Enter remote repository URL (HTTPS or SSH), e.g. https://github.com/youruser/yourrepo.git"
if ([string]::IsNullOrWhiteSpace($remoteUrl)) {
    Write-Error "No remote URL provided — aborting."
    exit 1
}

# If remote already exists, update it
$existing = git remote
if ($existing -contains 'origin') {
    Write-Host "Remote 'origin' exists — updating URL"
    git remote set-url origin $remoteUrl
} else {
    git remote add origin $remoteUrl
}

Write-Host "Now pushing to origin/main. You may be prompted for credentials (GitHub username + PAT)."
# Perform push (interactive)
git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "Push successful."
} else {
    Write-Error "Push failed. Check remote URL and credentials, then try: git push -u origin main"
}
