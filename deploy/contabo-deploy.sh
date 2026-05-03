#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/var/www/ankitjaiswal.in"
BUILD_PORT="4173"

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

log "Restarting API and reloading Nginx"
pm2 startOrRestart ecosystem.config.cjs
pm2 save
nginx -t
systemctl reload nginx

log "Deployment complete"
