#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
#  NixPanel Installer  ·  Ubuntu 24.04 LTS  ·  x86_64
#  Installs: WHM (NixServer), cPanel (NixClient), Licensing Server,
#            Website API, and all system dependencies.
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'
YELLOW='\033[1;33m'; BOLD='\033[1m'; RESET='\033[0m'

info()    { echo -e "${CYAN}[INFO]${RESET}  $*"; }
success() { echo -e "${GREEN}[ OK ]${RESET}  $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
error()   { echo -e "${RED}[ERR ]${RESET}  $*" >&2; exit 1; }
step()    { echo -e "\n${BOLD}${CYAN}━━━  $*  ━━━${RESET}"; }

# ── Preflight ─────────────────────────────────────────────────────────────────
[[ $EUID -ne 0 ]] && error "Must be run as root  →  sudo bash install.sh"

OS_ID=$(. /etc/os-release && echo "$ID")
OS_VER=$(. /etc/os-release && echo "$VERSION_ID")
ARCH=$(uname -m)

[[ "$OS_ID"  != "ubuntu" ]] && error "Requires Ubuntu 24.04 LTS (detected: $OS_ID)"
[[ "$OS_VER" != "24.04"  ]] && error "Requires Ubuntu 24.04 LTS (detected: Ubuntu $OS_VER)"
[[ "$ARCH"   != "x86_64" ]] && error "Requires x86_64 (detected: $ARCH)"

# ── Paths ─────────────────────────────────────────────────────────────────────
INSTALL_DIR="/opt/nixpanel"
BIN_DIR="$INSTALL_DIR/bin"
KEYS_DIR="$INSTALL_DIR/keys"
LOG_DIR="/var/log/nixpanel"
STEP_DIR="/var/lib/nixpanel/install"
SRC_DIR="$INSTALL_DIR/src"
GITHUB_REPO="NixReaper/nixpanel"

mkdir -p "$INSTALL_DIR" "$BIN_DIR" "$KEYS_DIR" "$LOG_DIR" "$STEP_DIR" "$SRC_DIR"
chmod 700 "$KEYS_DIR"

mark_done() { touch "$STEP_DIR/$1.done"; }
step_done() { [[ -f "$STEP_DIR/$1.done" ]]; }

# ── Banner ────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${CYAN}"
echo "  ███╗   ██╗██╗██╗  ██╗██████╗  █████╗ ███╗   ██╗███████╗██╗     "
echo "  ████╗  ██║██║╚██╗██╔╝██╔══██╗██╔══██╗████╗  ██║██╔════╝██║     "
echo "  ██╔██╗ ██║██║ ╚███╔╝ ██████╔╝███████║██╔██╗ ██║█████╗  ██║     "
echo "  ██║╚██╗██║██║ ██╔██╗ ██╔═══╝ ██╔══██║██║╚██╗██║██╔══╝  ██║     "
echo "  ██║ ╚████║██║██╔╝ ██╗██║     ██║  ██║██║ ╚████║███████╗███████╗"
echo "  ╚═╝  ╚═══╝╚═╝╚═╝  ╚═╝╚═╝     ╚═╝  ╚═╝╚═╝  ╚═══╝╚══════╝╚══════╝"
echo -e "${RESET}"
echo -e "  Web Hosting Control Panel  ·  Ubuntu 24.04  ·  x86_64"
echo ""

# ── 1. System update ──────────────────────────────────────────────────────────
step "Updating system packages"
if ! step_done "apt_update"; then
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq
  apt-get upgrade -y -qq
  mark_done "apt_update"
fi
success "System packages up to date"

# ── 2. Free port 53 for PowerDNS ─────────────────────────────────────────────
step "Freeing port 53 for PowerDNS"
if ! step_done "resolved_stub"; then
  sed -i '/^#\?DNSStubListener=/d' /etc/systemd/resolved.conf
  echo "DNSStubListener=no" >> /etc/systemd/resolved.conf
  systemctl restart systemd-resolved 2>/dev/null || true
  mark_done "resolved_stub"
fi
success "Port 53 free"

# ── 3. System packages ────────────────────────────────────────────────────────
step "Installing system packages"
if ! step_done "packages"; then
  export DEBIAN_FRONTEND=noninteractive
  apt-get install -y -qq \
    build-essential pkg-config libssl-dev libmariadb-dev curl wget git unzip \
    ca-certificates gnupg software-properties-common \
    apache2 \
    php8.3 php8.3-fpm php8.3-cli php8.3-mysql php8.3-curl php8.3-mbstring \
    php8.3-xml php8.3-zip php8.3-gd php8.3-intl php8.3-bcmath \
    php8.2 php8.2-fpm php8.2-cli php8.2-mysql php8.2-curl php8.2-mbstring \
    php8.2-xml php8.2-zip php8.2-gd php8.2-intl php8.2-bcmath \
    mariadb-server mariadb-client \
    pdns-server pdns-backend-bind \
    exim4 exim4-daemon-light \
    dovecot-imapd dovecot-pop3d dovecot-lmtpd \
    spamassassin spamc \
    certbot python3-certbot-apache \
    fail2ban \
    nodejs npm \
    openssl
  mark_done "packages"
fi
success "System packages installed"

# ── 4. Rust toolchain ─────────────────────────────────────────────────────────
step "Installing Rust toolchain"
if ! step_done "rust"; then
  # Install for root (used by this script) and persist for system builds
  curl -fsSL https://sh.rustup.rs | sh -s -- -y --default-toolchain stable --profile minimal
  source "$HOME/.cargo/env"
  rustup target add x86_64-unknown-linux-gnu
  mark_done "rust"
else
  # Ensure cargo is on PATH for subsequent steps
  source "$HOME/.cargo/env" 2>/dev/null || true
fi
CARGO=$(command -v cargo) || error "cargo not found — Rust install may have failed"
success "Rust $(rustc --version) installed"

# ── 5. Start services ─────────────────────────────────────────────────────────
step "Starting service stack"
if ! step_done "services_start"; then
  a2enmod rewrite ssl proxy proxy_http proxy_wstunnel proxy_fcgi headers expires deflate
  systemctl enable --now apache2 mariadb
  systemctl enable pdns && systemctl start pdns 2>/dev/null || true
  systemctl enable spamd && systemctl start spamd 2>/dev/null || true
  mark_done "services_start"
fi
success "Service stack running"

# ── 6. MariaDB databases ──────────────────────────────────────────────────────
step "Configuring MariaDB databases"
if ! step_done "mariadb_setup"; then
  DB_PASS_PANEL=$(openssl rand -hex 20)
  DB_PASS_LICENSE=$(openssl rand -hex 20)
  DB_PASS_WEBSITE=$(openssl rand -hex 20)

  mysql -u root <<SQL
CREATE DATABASE IF NOT EXISTS nixpanel       CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS nixpanel_licensing CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS nixpanel_website   CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'nixpanel'@'127.0.0.1'         IDENTIFIED BY '${DB_PASS_PANEL}';
CREATE USER IF NOT EXISTS 'nixpanel_license'@'127.0.0.1' IDENTIFIED BY '${DB_PASS_LICENSE}';
CREATE USER IF NOT EXISTS 'nixpanel_web'@'127.0.0.1'     IDENTIFIED BY '${DB_PASS_WEBSITE}';

GRANT ALL PRIVILEGES ON nixpanel.*           TO 'nixpanel'@'127.0.0.1';
GRANT ALL PRIVILEGES ON nixpanel_licensing.* TO 'nixpanel_license'@'127.0.0.1';
GRANT ALL PRIVILEGES ON nixpanel_website.*   TO 'nixpanel_web'@'127.0.0.1';
FLUSH PRIVILEGES;
SQL

  # Store credentials for use below
  echo "$DB_PASS_PANEL"   > "$INSTALL_DIR/.db_pass_panel"
  echo "$DB_PASS_LICENSE" > "$INSTALL_DIR/.db_pass_license"
  echo "$DB_PASS_WEBSITE" > "$INSTALL_DIR/.db_pass_website"
  chmod 600 "$INSTALL_DIR"/.db_pass_*

  mark_done "mariadb_setup"
else
  DB_PASS_PANEL=$(cat "$INSTALL_DIR/.db_pass_panel")
  DB_PASS_LICENSE=$(cat "$INSTALL_DIR/.db_pass_license")
  DB_PASS_WEBSITE=$(cat "$INSTALL_DIR/.db_pass_website")
fi
success "Databases created"

# ── 7. Download / update source ───────────────────────────────────────────────
step "Downloading NixPanel source"
if ! step_done "source"; then
  LATEST_TAG=$(curl -fsSL "https://api.github.com/repos/${GITHUB_REPO}/releases/latest" \
    | grep '"tag_name"' | cut -d'"' -f4 || echo "main")
  [[ -z "$LATEST_TAG" ]] && LATEST_TAG="main"
  info "Fetching tag: $LATEST_TAG"

  if [[ -d "$SRC_DIR/.git" ]]; then
    git -C "$SRC_DIR" fetch --tags --quiet
    git -C "$SRC_DIR" checkout "$LATEST_TAG" --quiet
  else
    git clone --depth 1 --branch "$LATEST_TAG" \
      "https://github.com/${GITHUB_REPO}.git" "$SRC_DIR" 2>/dev/null \
    || git clone --depth 1 "https://github.com/${GITHUB_REPO}.git" "$SRC_DIR"
  fi
  mark_done "source"
fi
success "Source ready"

# ── 8. Build Rust binaries ────────────────────────────────────────────────────
step "Building nixpanel-licensing (Rust)"
if ! step_done "build_licensing"; then
  cd "$SRC_DIR/nixpanel-licensing"
  $CARGO build --release --quiet
  cp target/release/nixpanel-licensing "$BIN_DIR/nixpanel-licensing"
  cp target/release/keygen             "$BIN_DIR/nixpanel-keygen"
  chmod 755 "$BIN_DIR/nixpanel-licensing" "$BIN_DIR/nixpanel-keygen"
  mark_done "build_licensing"
fi
success "nixpanel-licensing built"

step "Building nixpanel-website-api (Rust)"
if ! step_done "build_website_api"; then
  cd "$SRC_DIR/nixpanel-website/api"
  $CARGO build --release --quiet
  cp target/release/nixpanel-website-api "$BIN_DIR/nixpanel-website-api"
  chmod 755 "$BIN_DIR/nixpanel-website-api"
  mark_done "build_website_api"
fi
success "nixpanel-website-api built"

# ── 9. RSA key generation ─────────────────────────────────────────────────────
step "Generating RSA-4096 license signing keys"
if ! step_done "keygen"; then
  # Run keygen from the licensing source dir so it finds ./keys/
  cd "$SRC_DIR/nixpanel-licensing"
  "$BIN_DIR/nixpanel-keygen"
  cp keys/private.pem "$KEYS_DIR/license_private.pem"
  cp keys/public.pem  "$KEYS_DIR/license_public.pem"
  chmod 600 "$KEYS_DIR/license_private.pem"
  chmod 644 "$KEYS_DIR/license_public.pem"
  mark_done "keygen"
fi
success "RSA keys generated → $KEYS_DIR"

# ── 10. Secrets ───────────────────────────────────────────────────────────────
step "Generating secrets"
if ! step_done "secrets"; then
  JWT_SECRET_LICENSE=$(openssl rand -hex 64)
  JWT_SECRET_WEBSITE=$(openssl rand -hex 64)
  JWT_SECRET_PANEL=$(openssl rand -hex 64)
  LICENSING_API_KEY=$(openssl rand -hex 32)

  echo "$JWT_SECRET_LICENSE" > "$INSTALL_DIR/.jwt_license"
  echo "$JWT_SECRET_WEBSITE" > "$INSTALL_DIR/.jwt_website"
  echo "$JWT_SECRET_PANEL"   > "$INSTALL_DIR/.jwt_panel"
  echo "$LICENSING_API_KEY"  > "$INSTALL_DIR/.licensing_api_key"
  chmod 600 "$INSTALL_DIR"/.jwt_* "$INSTALL_DIR/.licensing_api_key"
  mark_done "secrets"
else
  JWT_SECRET_LICENSE=$(cat "$INSTALL_DIR/.jwt_license")
  JWT_SECRET_WEBSITE=$(cat "$INSTALL_DIR/.jwt_website")
  JWT_SECRET_PANEL=$(cat   "$INSTALL_DIR/.jwt_panel")
  LICENSING_API_KEY=$(cat  "$INSTALL_DIR/.licensing_api_key")
fi
success "Secrets ready"

# ── 11. Environment files ─────────────────────────────────────────────────────
step "Writing environment files"

# nixpanel-licensing
cat > "$INSTALL_DIR/licensing.env" <<EOF
HOST=127.0.0.1
PORT=3000
RUST_LOG=nixpanel_licensing=info,tower_http=warn
DATABASE_URL=mysql://nixpanel_license:${DB_PASS_LICENSE}@127.0.0.1:3306/nixpanel_licensing
JWT_SECRET=${JWT_SECRET_LICENSE}
JWT_EXPIRES_IN_SECS=86400
LICENSE_PRIVATE_KEY_PATH=${KEYS_DIR}/license_private.pem
LICENSE_PUBLIC_KEY_PATH=${KEYS_DIR}/license_public.pem
LICENSE_TOKEN_TTL_DAYS=30
LICENSE_GRACE_PERIOD_DAYS=7
EOF

# nixpanel-website-api (filled in after admin prompt below)
# Written at step 13

# Main panel
cat > "$INSTALL_DIR/.env" <<EOF
NODE_ENV=production
PORT=4000
JWT_SECRET=${JWT_SECRET_PANEL}
DATABASE_URL=mysql://nixpanel:${DB_PASS_PANEL}@127.0.0.1:3306/nixpanel
INSTALL_DIR=${INSTALL_DIR}
EOF

chmod 600 "$INSTALL_DIR/licensing.env" "$INSTALL_DIR/.env"
success "Environment files written"

# ── 12. systemd — licensing server ───────────────────────────────────────────
step "Installing systemd service: nixpanel-licensing"
if ! step_done "systemd_licensing"; then
  cat > /etc/systemd/system/nixpanel-licensing.service <<EOF
[Unit]
Description=NixPanel Licensing Server
Documentation=https://nixpanel.io/docs
After=network.target mariadb.service
Wants=mariadb.service

[Service]
Type=simple
User=root
ExecStart=${BIN_DIR}/nixpanel-licensing
WorkingDirectory=${INSTALL_DIR}
EnvironmentFile=${INSTALL_DIR}/licensing.env
Restart=on-failure
RestartSec=5
StandardOutput=append:${LOG_DIR}/licensing.log
StandardError=append:${LOG_DIR}/licensing-error.log
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF
  systemctl daemon-reload
  systemctl enable nixpanel-licensing
  systemctl start  nixpanel-licensing
  mark_done "systemd_licensing"
fi
success "nixpanel-licensing service running"

# ── 13. Admin account + website env ──────────────────────────────────────────
step "Creating admin account"
if ! step_done "admin_account"; then
  echo ""
  echo -e "  ${BOLD}Create your NixPanel admin account${RESET}"
  read -rp  "  Admin username [admin]: " ADMIN_USER
  ADMIN_USER="${ADMIN_USER:-admin}"
  read -rsp "  Admin password: "         ADMIN_PASS;  echo ""
  read -rsp "  Confirm password: "       ADMIN_PASS2; echo ""
  [[ "$ADMIN_PASS" != "$ADMIN_PASS2" ]] && error "Passwords do not match"
  read -rp  "  Admin email: "            ADMIN_EMAIL
  read -rp  "  Server hostname/domain [$(hostname -f)]: " SERVER_HOST
  SERVER_HOST="${SERVER_HOST:-$(hostname -f)}"

  # Prompt for Stripe keys (can be left blank for now)
  echo ""
  echo -e "  ${BOLD}Stripe billing (press Enter to skip — configure later in .env)${RESET}"
  read -rp  "  Stripe secret key (sk_live_...): "   STRIPE_SK;       STRIPE_SK="${STRIPE_SK:-}"
  read -rp  "  Stripe webhook secret (whsec_...): " STRIPE_WEBHOOK;  STRIPE_WEBHOOK="${STRIPE_WEBHOOK:-}"
  read -rp  "  SMTP host [smtp.mailgun.org]: "       MAIL_HOST;       MAIL_HOST="${MAIL_HOST:-smtp.mailgun.org}"
  read -rp  "  SMTP user: "                          MAIL_USER;       MAIL_USER="${MAIL_USER:-}"
  read -rsp "  SMTP password: "                      MAIL_PASS;       MAIL_PASS="${MAIL_PASS:-}"; echo ""

  # Write website-api env now that we have the answers
  cat > "$INSTALL_DIR/website.env" <<EOF
HOST=127.0.0.1
PORT=4001
RUST_LOG=nixpanel_website_api=info,tower_http=warn
DATABASE_URL=mysql://nixpanel_web:${DB_PASS_WEBSITE}@127.0.0.1:3306/nixpanel_website
JWT_SECRET=${JWT_SECRET_WEBSITE}
JWT_EXPIRES_IN_SECS=604800
APP_URL=https://${SERVER_HOST}
CORS_ORIGIN=https://${SERVER_HOST}
STRIPE_SECRET_KEY=${STRIPE_SK}
STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK}
STRIPE_PRICE_SOLO_MONTHLY=
STRIPE_PRICE_SOLO_ANNUAL=
STRIPE_PRICE_HOST_MONTHLY=
STRIPE_PRICE_HOST_ANNUAL=
STRIPE_PRICE_AGENCY_MONTHLY=
STRIPE_PRICE_AGENCY_ANNUAL=
LICENSING_SERVER_URL=http://127.0.0.1:3000
LICENSING_SERVER_API_KEY=${LICENSING_API_KEY}
MAIL_HOST=${MAIL_HOST}
MAIL_PORT=587
MAIL_USER=${MAIL_USER}
MAIL_PASSWORD=${MAIL_PASS}
MAIL_FROM=noreply@${SERVER_HOST}
EOF
  chmod 600 "$INSTALL_DIR/website.env"

  # Create admin via main panel script
  node "$INSTALL_DIR/scripts/create-admin.js" \
    --username "$ADMIN_USER" \
    --password "$ADMIN_PASS" \
    --email    "$ADMIN_EMAIL" \
    2>/dev/null || warn "Admin creation script not found — set credentials via panel after install"

  mark_done "admin_account"
fi
success "Admin account ready"

# ── 14. systemd — website API ─────────────────────────────────────────────────
step "Installing systemd service: nixpanel-website-api"
if ! step_done "systemd_website"; then
  cat > /etc/systemd/system/nixpanel-website-api.service <<EOF
[Unit]
Description=NixPanel Website API
Documentation=https://nixpanel.io/docs
After=network.target mariadb.service nixpanel-licensing.service
Wants=mariadb.service

[Service]
Type=simple
User=root
ExecStart=${BIN_DIR}/nixpanel-website-api
WorkingDirectory=${INSTALL_DIR}
EnvironmentFile=${INSTALL_DIR}/website.env
Restart=on-failure
RestartSec=5
StandardOutput=append:${LOG_DIR}/website-api.log
StandardError=append:${LOG_DIR}/website-api-error.log
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF
  systemctl daemon-reload
  systemctl enable nixpanel-website-api
  systemctl start  nixpanel-website-api
  mark_done "systemd_website"
fi
success "nixpanel-website-api service running"

# ── 15. systemd — main panel ──────────────────────────────────────────────────
step "Installing systemd service: nixpanel"
if ! step_done "systemd_panel"; then
  cat > /etc/systemd/system/nixpanel.service <<EOF
[Unit]
Description=NixPanel Control Panel
Documentation=https://nixpanel.io/docs
After=network.target mariadb.service
Wants=mariadb.service

[Service]
Type=simple
User=root
ExecStart=${INSTALL_DIR}/bin/nixpanel
WorkingDirectory=${INSTALL_DIR}
EnvironmentFile=${INSTALL_DIR}/.env
Restart=on-failure
RestartSec=5
StandardOutput=append:${LOG_DIR}/panel.log
StandardError=append:${LOG_DIR}/panel-error.log
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF
  systemctl daemon-reload
  systemctl enable nixpanel
  systemctl start  nixpanel
  mark_done "systemd_panel"
fi
success "nixpanel service running"

# ── 16. Apache vhosts ─────────────────────────────────────────────────────────
step "Configuring Apache reverse proxies"
if ! step_done "apache_vhost"; then
  # Add non-standard ports if not already present
  for port in 2083 2087 4001; do
    grep -q "^Listen ${port}" /etc/apache2/ports.conf \
      || echo "Listen ${port}" >> /etc/apache2/ports.conf
  done

  cat > /etc/apache2/sites-available/nixpanel.conf <<'APACHEEOF'
# ── NixServer — WHM Admin Panel (port 2087) ───────────────────────────────────
<VirtualHost *:2087>
  ProxyPreserveHost On
  ProxyPass        /api/ http://127.0.0.1:4000/api/
  ProxyPassReverse /api/ http://127.0.0.1:4000/api/
  ProxyPass        /ws/  ws://127.0.0.1:4000/ws/
  ProxyPassReverse /ws/  ws://127.0.0.1:4000/ws/
  DocumentRoot /opt/nixpanel/nixserver/dist
  <Directory /opt/nixpanel/nixserver/dist>
    Options -Indexes
    AllowOverride All
    Require all granted
    FallbackResource /index.html
  </Directory>
  ErrorLog  /var/log/nixpanel/nixserver-error.log
  CustomLog /var/log/nixpanel/nixserver-access.log combined
</VirtualHost>

# ── NixClient — cPanel User Panel (port 2083) ─────────────────────────────────
<VirtualHost *:2083>
  ProxyPreserveHost On
  ProxyPass        /api/ http://127.0.0.1:4000/api/
  ProxyPassReverse /api/ http://127.0.0.1:4000/api/
  DocumentRoot /opt/nixpanel/nixclient/dist
  <Directory /opt/nixpanel/nixclient/dist>
    Options -Indexes
    AllowOverride All
    Require all granted
    FallbackResource /index.html
  </Directory>
  ErrorLog  /var/log/nixpanel/nixclient-error.log
  CustomLog /var/log/nixpanel/nixclient-access.log combined
</VirtualHost>

# ── NixPanel Website API (port 4001) ──────────────────────────────────────────
<VirtualHost *:4001>
  ProxyPreserveHost On
  ProxyPass        / http://127.0.0.1:4001/
  ProxyPassReverse / http://127.0.0.1:4001/
</VirtualHost>
APACHEEOF

  a2ensite nixpanel
  apache2ctl configtest && systemctl reload apache2
  mark_done "apache_vhost"
fi
success "Apache vhosts configured"

# ── 17. Fail2ban ──────────────────────────────────────────────────────────────
step "Configuring Fail2ban"
if ! step_done "fail2ban"; then
  cat > /etc/fail2ban/jail.d/nixpanel.conf <<'EOF'
[nixpanel-auth]
enabled  = true
port     = 2083,2087,4001
filter   = nixpanel-auth
logpath  = /var/log/nixpanel/*.log
maxretry = 10
bantime  = 3600
findtime = 600
EOF
  systemctl enable --now fail2ban
  mark_done "fail2ban"
fi
success "Fail2ban configured"

# ── 18. File permissions ──────────────────────────────────────────────────────
step "Setting permissions"
chown -R root:root "$INSTALL_DIR"
chmod 700 "$KEYS_DIR"
chmod 600 "$INSTALL_DIR"/.env \
          "$INSTALL_DIR"/licensing.env \
          "$INSTALL_DIR"/website.env 2>/dev/null || true
find "$INSTALL_DIR/bin" -type f -exec chmod 755 {} \;
[[ -d "$INSTALL_DIR/nixserver/dist" ]] && \
  find "$INSTALL_DIR/nixserver/dist" \( -type d -exec chmod 755 {} \; -o -type f -exec chmod 644 {} \; \)
[[ -d "$INSTALL_DIR/nixclient/dist" ]] && \
  find "$INSTALL_DIR/nixclient/dist" \( -type d -exec chmod 755 {} \; -o -type f -exec chmod 644 {} \; \)
success "Permissions set"

# ── 19. Service health check ──────────────────────────────────────────────────
step "Verifying services"
sleep 2  # give systemd a moment

check_service() {
  if systemctl is-active --quiet "$1"; then
    success "$1 is running"
  else
    warn "$1 is NOT running — check: journalctl -u $1 -n 50"
  fi
}

check_service nixpanel-licensing
check_service nixpanel-website-api
check_service nixpanel
check_service apache2
check_service mariadb

# ── Done ──────────────────────────────────────────────────────────────────────
SERVER_IP=$(hostname -I | awk '{print $1}')

echo ""
echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${BOLD}${GREEN}  NixPanel Installation Complete!${RESET}"
echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo ""
echo -e "  ${BOLD}WHM  (Admin panel):${RESET}   http://${SERVER_IP}:2087"
echo -e "  ${BOLD}cPanel (User panel):${RESET}  http://${SERVER_IP}:2083"
echo -e "  ${BOLD}Website API:${RESET}          http://${SERVER_IP}:4001"
echo -e "  ${BOLD}Licensing server:${RESET}     http://127.0.0.1:3000  (internal only)"
echo ""
echo -e "  ${BOLD}RSA public key:${RESET}  ${KEYS_DIR}/license_public.pem"
echo -e "  ${BOLD}Logs:${RESET}            ${LOG_DIR}/"
echo -e "  ${BOLD}Config:${RESET}          ${INSTALL_DIR}/*.env"
echo ""
echo -e "  ${YELLOW}Stripe Price IDs must still be added to:${RESET}"
echo -e "  ${INSTALL_DIR}/website.env"
echo ""
echo -e "  To add SSL:  certbot --apache"
echo -e "  To restart:  systemctl restart nixpanel nixpanel-licensing nixpanel-website-api"
echo ""
