#!/usr/bin/env bash
set -euo pipefail

APP_NAME="ankitjaiswal"
DOMAIN="ankitjaiswal.in"
SERVER_IP="2.59.156.27"
APP_DIR="/var/www/ankitjaiswal.in"
REPO_URL="https://github.com/ankit-codespace/ankitjaiswal.in.git"
API_PORT="3000"
BUILD_PORT="4173"
DB_NAME="ankitjaiswal"
DB_USER="ankitjaiswal"
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

install_system_packages() {
  log "Installing system packages"
  apt-get update
  apt-get install -y ca-certificates curl git nginx postgresql postgresql-contrib build-essential openssl
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

start_services() {
  log "Starting API with PM2"
  cd "$APP_DIR"
  pm2 startOrRestart ecosystem.config.cjs
  pm2 save
  pm2 startup systemd -u root --hp /root >/dev/null 2>&1 || true
}

write_nginx_config() {
  log "Writing Nginx config"
  cat > "/etc/nginx/sites-available/$DOMAIN" <<EOF_NGINX
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;

    root $APP_DIR/artifacts/website/dist/public;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:$API_PORT/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|webp|ico|svg|mp3|woff2?)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
        try_files \$uri =404;
    }
}
EOF_NGINX

  ln -sfn "/etc/nginx/sites-available/$DOMAIN" "/etc/nginx/sites-enabled/$DOMAIN"
  rm -f /etc/nginx/sites-enabled/default
  nginx -t
  systemctl enable --now nginx
  systemctl reload nginx
}

try_https() {
  local resolved=""
  resolved="$(getent ahostsv4 "$DOMAIN" | awk '{print $1; exit}' || true)"
  if [ "$resolved" != "$SERVER_IP" ]; then
    log "Skipping HTTPS for now: $DOMAIN resolves to '${resolved:-nothing}', not $SERVER_IP"
    return 0
  fi

  log "Attempting Let's Encrypt HTTPS"
  apt-get install -y certbot python3-certbot-nginx
  certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" \
    --email "contact@$DOMAIN" \
    --agree-tos \
    --non-interactive \
    --redirect || log "HTTPS setup failed; HTTP deployment is still live"
}

main() {
  require_root
  install_system_packages
  install_node_tools
  checkout_app
  setup_database
  write_env
  build_app
  write_pm2_config
  start_services
  write_nginx_config
  try_https
  log "Done. Site files are in $APP_DIR and the API is running as ankitjaiswal-api."
}

main "$@"
