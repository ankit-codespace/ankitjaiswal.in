#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${DOMAIN:-ankitjaiswal.in}"
APP_DIR="${APP_DIR:-/var/www/ankitjaiswal.in}"
WEB_ROOT="${WEB_ROOT:-/home/$DOMAIN/public_html}"
REPO_URL="${REPO_URL:-https://github.com/ankit-codespace/ankitjaiswal.in.git}"
API_PORT="${API_PORT:-3000}"
BUILD_PORT="${BUILD_PORT:-4173}"
DB_NAME="${DB_NAME:-ankitjaiswal}"
DB_USER="${DB_USER:-ankitjaiswal}"
ENV_FILE="$APP_DIR/.env"

log() {
  printf '\n[%s] %s\n' "$(date +'%H:%M:%S')" "$*"
}

require_root() {
  if [ "$(id -u)" -ne 0 ]; then
    echo "Run this script as root." >&2
    exit 1
  fi
}

install_packages() {
  log "Installing required packages"
  apt-get update
  apt-get install -y ca-certificates curl git postgresql postgresql-contrib build-essential openssl rsync
}

install_node_tools() {
  local node_major=""
  if command -v node >/dev/null 2>&1; then
    node_major="$(node -p "process.versions.node.split('.')[0]" 2>/dev/null || true)"
  fi

  if [ -z "$node_major" ] || [ "$node_major" -lt 20 ]; then
    log "Installing Node.js 22"
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt-get install -y nodejs
  fi

  if ! command -v pnpm >/dev/null 2>&1; then
    log "Installing pnpm"
    corepack enable || true
    corepack prepare pnpm@latest --activate || npm install -g pnpm
  fi

  if ! command -v pm2 >/dev/null 2>&1; then
    log "Installing pm2"
    npm install -g pm2
  fi
}

checkout_app() {
  log "Checking out application"
  mkdir -p "$(dirname "$APP_DIR")"

  if [ -d "$APP_DIR/.git" ]; then
    git -C "$APP_DIR" fetch origin main
    git -C "$APP_DIR" reset --hard origin/main
  else
    rm -rf "$APP_DIR"
    git clone "$REPO_URL" "$APP_DIR"
  fi
}

setup_database() {
  log "Preparing PostgreSQL"
  systemctl enable --now postgresql

  local db_password="${DB_PASSWORD:-}"
  if [ -f "$ENV_FILE" ]; then
    db_password="$(grep -E '^DB_PASSWORD=' "$ENV_FILE" | tail -n1 | cut -d= -f2- || true)"
  fi
  if [ -z "$db_password" ]; then
    db_password="$(openssl rand -base64 32 | tr -dc 'A-Za-z0-9' | head -c 24)"
  fi

  sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '$DB_USER') THEN
    CREATE USER $DB_USER WITH PASSWORD '$db_password';
  ELSE
    ALTER USER $DB_USER WITH PASSWORD '$db_password';
  END IF;
END
\$\$;
SQL

  if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1; then
    sudo -u postgres createdb -O "$DB_USER" "$DB_NAME"
  fi

  DATABASE_URL="postgresql://$DB_USER:$db_password@127.0.0.1:5432/$DB_NAME"
  DB_PASSWORD="$db_password"
}

write_env() {
  log "Writing server environment"
  local resend_key="${RESEND_API_KEY:-}"
  local from_email="${FEEDBACK_FROM_EMAIL:-Ankit Jaiswal Site <contact@ankitjaiswal.in>}"

  cat > "$ENV_FILE" <<EOF_ENV
NODE_ENV=production
PORT=$API_PORT
BASE_PATH=/
DATABASE_URL=$DATABASE_URL
DB_PASSWORD=$DB_PASSWORD
RESEND_API_KEY=$resend_key
FEEDBACK_FROM_EMAIL=$from_email
EOF_ENV
  chmod 600 "$ENV_FILE"
}

build_app() {
  log "Installing dependencies and building"
  cd "$APP_DIR"
  pnpm install --frozen-lockfile
  PORT="$BUILD_PORT" BASE_PATH="/" pnpm --filter @workspace/website build
  pnpm --filter @workspace/api-server build
}

write_pm2_config() {
  log "Writing PM2 config"
  cat > "$APP_DIR/ecosystem.config.cjs" <<'EOF_PM2'
const fs = require("node:fs");
const path = require("node:path");

const envPath = path.join(__dirname, ".env");
const env = {};

for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
  if (!line || line.trim().startsWith("#")) continue;
  const idx = line.indexOf("=");
  if (idx === -1) continue;
  env[line.slice(0, idx)] = line.slice(idx + 1);
}

module.exports = {
  apps: [
    {
      name: "ankitjaiswal-api",
      cwd: __dirname,
      script: "artifacts/api-server/dist/index.mjs",
      exec_mode: "fork",
      instances: 1,
      env,
      max_memory_restart: "350M",
    },
  ],
};
EOF_PM2
}

publish_static_site() {
  log "Publishing static site to CyberPanel web root"
  if [ ! -d "$WEB_ROOT" ]; then
    mkdir -p "$WEB_ROOT"
  fi

  rsync -a --delete "$APP_DIR/artifacts/website/dist/public/" "$WEB_ROOT/"

  cat > "$WEB_ROOT/.htaccess" <<EOF_HTACCESS
RewriteEngine On

RewriteRule ^api/(.*)$ http://127.0.0.1:$API_PORT/api/\$1 [P,L]

RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
EOF_HTACCESS

  if id "$DOMAIN" >/dev/null 2>&1; then
    chown -R "$DOMAIN:$DOMAIN" "$WEB_ROOT"
  elif id nobody >/dev/null 2>&1; then
    chown -R nobody:nogroup "$WEB_ROOT" 2>/dev/null || true
  fi
}

start_api() {
  log "Starting API with PM2"
  cd "$APP_DIR"
  pm2 startOrRestart ecosystem.config.cjs
  pm2 save
  pm2 startup systemd -u root --hp /root >/dev/null 2>&1 || true
}

restart_web_server() {
  log "Restarting CyberPanel/OpenLiteSpeed web server"
  systemctl restart lsws 2>/dev/null || systemctl restart openlitespeed 2>/dev/null || true
}

main() {
  require_root
  install_packages
  install_node_tools
  checkout_app
  setup_database
  write_env
  build_app
  write_pm2_config
  start_api
  publish_static_site
  restart_web_server
  log "Done. Static site published to $WEB_ROOT and API is running on 127.0.0.1:$API_PORT."
}

main "$@"
