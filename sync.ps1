# CTRLDONE Git Synchronizer Script

# Ensure git is available
if (!(Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Error "Git is not installed or not in your PATH. Please install Git and try again."
    exit 1
}

# Initialize git repository if not present
if (!(Test-Path .git)) {
    Write-Host "Initializing local git repository..."
    git init
    git branch -M main
}

# Check remote configuration
$remote = git remote get-url origin 2>$null
if ([string]::IsNullOrEmpty($remote)) {
    Write-Warning "No 'origin' remote URL is configured yet."
    Write-Host "To link your repository, run:"
    Write-Host "  git remote add origin <your-repo-url>"
    Write-Host "Then rerun this script to push your updates."
    
    # Stage and commit locally in the meantime
    git add -A
    git commit -m "chore: local staging & configuration"
    Write-Host "All changes staged and committed locally."
    exit 0
}

Write-Host "Staging all changes..."
git add -A

# Commit with timestamped message
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$commitMsg = "update: ctrldone build synchronization at $timestamp"

Write-Host "Committing changes..."
git commit -m $commitMsg

Write-Host "Pushing changes to remote origin (branch: main)..."
git push -u origin main

Write-Host "Sync Complete! CTRLDONE is synchronized with Git remote."
