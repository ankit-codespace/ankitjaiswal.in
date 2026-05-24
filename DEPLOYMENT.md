# Deployment & Server Setup Guide

> **CRITICAL:** DO NOT DELETE THIS FILE. It is required for all AI assistants to understand the deployment process and server setup.

**IMPORTANT NOTE FOR ANY AI ASSISTANT (CODEX, CLAUDE, GEMINI, CURSOR, ETC.):**
If the user asks to push changes to the live website, OR if you complete a task that should be deployed, follow this protocol EXACTLY:

## 1. Daily Deployment Workflow (For Existing Sites)

This project is hosted on a **CyberPanel / LiteSpeed** server. 
The Git repository is stored safely in `/var/www/ankitjaiswal.in` while the live web files are in `/home/ankitjaiswal.in/public_html`.

**YOUR RESPONSIBILITY AS AN AGENT:**
1. **You must push the code yourself.** Do not just tell the user to run `git push`. You must use your `run_command` tool to execute the git push on the user's machine automatically (the user will approve the tool call).
   ```bash
   git add .
   git commit -m "Your commit message"
   git push origin main
   ```
2. **Provide the SSH Command.** After initiating the tool call, provide the user with the following command to run on their server:
   ```bash
   cd /var/www/ankitjaiswal.in && bash deploy/cyberpanel-deploy.sh
   ```

*(This automated script pulls the code, builds it outside the web root, and rsyncs the compiled output to `public_html`, ensuring zero-downtime and keeping source files secure).*

---

## 2. Server Setup Guide (For New Contabo Sites)

If the user is setting up a **brand new website** on their Contabo server, do NOT use CyberPanel's built-in Git manager. Follow these enterprise-grade steps to create a safe `/var/www/` pipeline:

### Step A: Clone the Repository
SSH into the server and clone the repo via HTTPS into `/var/www/`:
```bash
cd /var/www/
git clone https://github.com/ankit-codespace/[repo-name].git [domain.com]
cd [domain.com]
```

### Step B: Cache GitHub Credentials (Crucial!)
Because the repo is private, it requires a GitHub Personal Access Token (PAT). To prevent the server from asking for a password on every single deployment:
```bash
git config credential.helper store
```
*(The first time you run `git pull` or `git fetch`, it will ask for the username and PAT. After that, it will never ask again.)*

### Step C: Create the Deploy Script
Create the deployment folder and script:
```bash
mkdir -p deploy
nano deploy/cyberpanel-deploy.sh
```

Paste a customized version of this script (adjust paths based on whether it's Vite, Next.js, etc.):
```bash
#!/bin/bash
echo "=== Starting Deployment ==="

# 1. Pull latest
git fetch origin
git reset --hard origin/main

# 2. Go to the project directory containing package.json
# cd [path-to-package-json-if-nested]

# 3. Install and build
pnpm install
pnpm run build

# 4. Sync compiled files to live webroot
# (For Vite, the output is usually dist/ or dist/public/)
rsync -av --delete dist/public/ /home/[domain.com]/public_html/

# 5. Restart LiteSpeed
systemctl restart lsws

echo "=== Deployment Complete! ==="
```

### Step D: Make Executable
```bash
chmod +x deploy/cyberpanel-deploy.sh
```

The pipeline is now complete and highly secure.
