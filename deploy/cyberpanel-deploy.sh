#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${DOMAIN:-ankitjaiswal.in}"
APP_DIR="${APP_DIR:-/var/www/ankitjaiswal.in}"
WEB_ROOT="${WEB_ROOT:-/home/$DOMAIN/public_html}"
BUILD_PORT="${BUILD_PORT:-4173}"
API_PORT="${API_PORT:-3000}"

log() {
  printf '\n[%s] %s\n' "$(date +'%H:%M:%S')" "$*"
}

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this script as root." >&2
  exit 1
fi

log "Pulling latest code"
git -C "$APP_DIR" fetch origin main
git -C "$APP_DIR" reset --hard origin/main

log "Installing dependencies"
cd "$APP_DIR"
pnpm install --frozen-lockfile

log "Building website and API"
PORT="$BUILD_PORT" BASE_PATH="/" pnpm --filter @workspace/website build
pnpm --filter @workspace/api-server build

log "Publishing static site"
mkdir -p "$WEB_ROOT"
rsync -a --delete --exclude '/assets/images/***' "$APP_DIR/artifacts/website/dist/public/" "$WEB_ROOT/"
cat > "$WEB_ROOT/.htaccess" <<EOF_HTACCESS
RewriteEngine On

RewriteRule ^api/(.*)$ http://127.0.0.1:$API_PORT/api/\$1 [P,L]

RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
EOF_HTACCESS

if id "$DOMAIN" >/dev/null 2>&1; then
  chown -R "$DOMAIN:$DOMAIN" "$WEB_ROOT"
fi

log "Restarting API and web server"
pm2 startOrRestart ecosystem.config.cjs
pm2 save
systemctl restart lsws 2>/dev/null || systemctl restart openlitespeed 2>/dev/null || true

log "Deployment complete"
