# Deployment Guide

**IMPORTANT NOTE FOR ANY AI ASSISTANT (CODEX, CLAUDE, GEMINI, CURSOR, ETC.):**
If you are asked to deploy or push changes to the live website, read this file!

## Server Architecture
This project is hosted on a **CyberPanel / LiteSpeed** server, which has a very specific structure.
- **Git Repository Location:** `/var/www/ankitjaiswal.in`
- **Live Web Root Location:** `/home/ankitjaiswal.in/public_html`

Because of this split, running `pnpm run build` inside the Git repository is **not enough** to update the live site. The compiled files must be explicitly synced to the `public_html` folder, and the LiteSpeed web server must be restarted.

## How to Deploy (The Only Correct Way)
There is an automated script that handles the entire pipeline (Git pull -> dependency install -> build -> rsync to public_html -> restart PM2 and LiteSpeed). 

Whenever you need to push local changes to the live site, follow these exact steps:

1. **Commit and push** your local changes to GitHub (`git add . && git commit -m "..." && git push origin main`).
2. **SSH into the live Contabo server.**
3. Run the following command exactly as written:

```bash
cd /var/www/ankitjaiswal.in && bash deploy/cyberpanel-deploy.sh
```

### What the script does automatically:
1. `git fetch origin main` and hard resets the repo.
2. `pnpm install`
3. `pnpm run build`
4. `rsync` copies `artifacts/website/dist/public/` over to `/home/ankitjaiswal.in/public_html/`.
5. Restarts PM2 (for API) and LiteSpeed (for the frontend).

**DO NOT guess or try to manually copy files.** Always use the `cyberpanel-deploy.sh` script to prevent cache issues or serving old files!
