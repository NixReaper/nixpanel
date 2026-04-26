#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
#  NixPanel Installer  ·  Ubuntu 24.04 LTS  ·  x86_64
#  Installs the NixPanel control panel (WHM + cPanel) on a customer server.
#  License validation runs against https://license.nixpanel.io
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Self-update ───────────────────────────────────────────────────────────────
# Always re-exec from the latest version on GitHub so stale local copies
# never silently run outdated logic.
SELF_URL="https://raw.githubusercontent.com/NixReaper/nixpanel/main/install.sh"
if [[ -z "${NIXPANEL_SELF_UPDATED:-}" ]]; then
  echo "Fetching latest installer from GitHub…"
  LATEST_SCRIPT=$(curl -fsSL "$SELF_URL") \
    || { echo "[WARN] Could not reach GitHub — running local copy"; LATEST_SCRIPT=""; }
  if [[ -n "$LATEST_SCRIPT" ]]; then
    export NIXPANEL_SELF_UPDATED=1
    exec bash <(printf '%s' "$LATEST_SCRIPT") "$@"
  fi
fi

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
LOG_DIR="/var/log/nixpanel"
STEP_DIR="/var/lib/nixpanel/install"
SRC_DIR="$INSTALL_DIR/src"
GITHUB_REPO="NixReaper/nixpanel"
LICENSING_URL="https://license.nixpanel.io"

mkdir -p "$INSTALL_DIR" "$BIN_DIR" "$LOG_DIR" "$STEP_DIR" "$SRC_DIR"

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

  # Prereqs for add-apt-repository
  apt-get install -y -qq ca-certificates gnupg software-properties-common

  # Node.js 20 LTS via NodeSource (required for UI builds)
  if ! command -v node &>/dev/null; then
    info "Adding NodeSource Node.js 20 LTS repository…"
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - 2>/dev/null
    success "NodeSource repository added"
  else
    info "Node.js $(node --version) already present"
  fi

  # ondrej/php PPA is required for PHP 8.2 on Ubuntu 24.04
  if ! grep -rq "ondrej/php" /etc/apt/sources.list /etc/apt/sources.list.d/ 2>/dev/null; then
    info "Adding ondrej/php PPA (required for PHP 8.2 on Ubuntu 24.04)…"
    add-apt-repository -y ppa:ondrej/php
    apt-get update -qq
    success "ondrej/php PPA added"
  else
    info "ondrej/php PPA already present"
  fi

  apt-get install -y -qq \
    build-essential pkg-config libssl-dev libmariadb-dev curl wget git unzip \
    ca-certificates gnupg software-properties-common nodejs \
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
    openssl

  mark_done "packages"
fi
success "System packages installed"

# ── 4. Node.js 20 LTS ─────────────────────────────────────────────────────────
step "Installing Node.js"
if ! step_done "nodejs"; then
  export DEBIAN_FRONTEND=noninteractive
  if ! command -v node &>/dev/null || [[ "$(node --version | cut -d. -f1 | tr -d 'v')" -lt 18 ]]; then
    info "Installing Node.js 20 LTS via NodeSource…"
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - 2>/dev/null
    apt-get install -y -qq nodejs
  fi
  mark_done "nodejs"
fi
success "Node.js $(node --version) / npm $(npm --version) ready"

# ── 5. Rust toolchain ─────────────────────────────────────────────────────────
step "Installing Rust toolchain"
if ! step_done "rust"; then
  curl -fsSL https://sh.rustup.rs | sh -s -- -y --default-toolchain stable --profile minimal
  source "$HOME/.cargo/env"
  mark_done "rust"
else
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

# ── 6. MariaDB — panel database only ─────────────────────────────────────────
step "Configuring MariaDB"
if ! step_done "mariadb_setup"; then
  DB_PASS_PANEL=$(openssl rand -hex 20)

  mysql -u root <<SQL
CREATE DATABASE IF NOT EXISTS nixpanel CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'nixpanel'@'127.0.0.1' IDENTIFIED BY '${DB_PASS_PANEL}';
GRANT ALL PRIVILEGES ON nixpanel.* TO 'nixpanel'@'127.0.0.1';
FLUSH PRIVILEGES;
SQL

  echo "$DB_PASS_PANEL" > "$INSTALL_DIR/.db_pass_panel"
  chmod 600 "$INSTALL_DIR/.db_pass_panel"
  mark_done "mariadb_setup"
else
  DB_PASS_PANEL=$(cat "$INSTALL_DIR/.db_pass_panel")
fi
success "Database ready"

# ── 7. Download / update panel source ────────────────────────────────────────
step "Downloading NixPanel source"
if ! step_done "source"; then
  LATEST_TAG=$(curl -fsSL "https://api.github.com/repos/${GITHUB_REPO}/releases/latest" \
    | grep '"tag_name"' | cut -d'"' -f4 || true)
  [[ -z "$LATEST_TAG" ]] && LATEST_TAG="main"
  info "Fetching tag: $LATEST_TAG"

  # Always do a clean clone when re-running this step — avoids stale .git configs
  # (e.g. old clones that tracked 'master' before the branch was renamed to 'main')
  rm -rf "$SRC_DIR"
  git clone --depth 1 --branch "$LATEST_TAG" \
    "https://github.com/${GITHUB_REPO}.git" "$SRC_DIR"
  mark_done "source"
fi
success "Source ready"

# ── 8. Build panel UIs (React apps) ───────────────────────────────────────────
step "Building NixServer & NixClient UIs"
if ! step_done "build_uis"; then
  cd "$SRC_DIR"

  # Build NixServer (WHM admin panel)
  if [[ -f "nixserver/package.json" ]]; then
    info "Building NixServer…"
    cd "$SRC_DIR/nixserver"
    npm install --legacy-peer-deps
    npm run build
    mkdir -p "$INSTALL_DIR/nixserver/dist"
    cp -r dist/* "$INSTALL_DIR/nixserver/dist/"
    success "NixServer built"
  fi

  # Build NixClient (cPanel user panel)
  if [[ -f "$SRC_DIR/nixclient/package.json" ]]; then
    info "Building NixClient…"
    cd "$SRC_DIR/nixclient"
    npm install --legacy-peer-deps
    npm run build
    mkdir -p "$INSTALL_DIR/nixclient/dist"
    cp -r dist/* "$INSTALL_DIR/nixclient/dist/"
    success "NixClient built"
  fi

  mark_done "build_uis"
fi

# ── 9. Build panel binary ─────────────────────────────────────────────────────
step "Building nixpanel (Rust)"
if ! step_done "build_panel"; then
  if [[ -f "$SRC_DIR/Cargo.toml" ]]; then
    cd "$SRC_DIR"
    info "Compiling nixpanel workspace (this may take a few minutes on first build)…"
    $CARGO build --release

    # Install UPX if available for binary compression
    if ! command -v upx &>/dev/null; then
      apt-get install -y -qq upx-ucl 2>/dev/null || true
    fi

    # Main API binary — stop service first so the file isn't busy
    if [[ -f "target/release/nixpanel" ]]; then
      systemctl stop nixpanel 2>/dev/null || true
      cp target/release/nixpanel "$BIN_DIR/nixpanel"
      chmod 755 "$BIN_DIR/nixpanel"
      command -v upx &>/dev/null && upx --best --quiet "$BIN_DIR/nixpanel" 2>/dev/null || true
      success "nixpanel binary installed"
    fi

    # Section binaries — each section is a separate compressed executable
    mkdir -p "$BIN_DIR"
    for section_bin in target/release/nixpanel-*; do
      [[ -f "$section_bin" ]] || continue
      # Skip debug/metadata files produced by UPX (.d files etc.)
      [[ "$section_bin" == *.* ]] && continue
      bin_name=$(basename "$section_bin")
      cp "$section_bin" "$BIN_DIR/$bin_name"
      chmod 755 "$BIN_DIR/$bin_name"
      command -v upx &>/dev/null && upx --best --quiet "$BIN_DIR/$bin_name" 2>/dev/null || true
      success "Section binary installed: $bin_name"
    done
    # Remove any UPX metadata files
    rm -f "$BIN_DIR"/*.d

    mark_done "build_panel"
    success "Panel binaries built and compressed"
  else
    warn "Panel Rust backend not yet present in repo — skipping build"
    warn "This is expected during early development. Re-run installer when source is ready."
  fi
fi

# ── 9. Secrets ────────────────────────────────────────────────────────────────
step "Generating secrets"
if ! step_done "secrets"; then
  JWT_SECRET_PANEL=$(openssl rand -hex 64)
  echo "$JWT_SECRET_PANEL" > "$INSTALL_DIR/.jwt_panel"
  chmod 600 "$INSTALL_DIR/.jwt_panel"
  mark_done "secrets"
else
  JWT_SECRET_PANEL=$(cat "$INSTALL_DIR/.jwt_panel")
fi
success "Secrets ready"

# ── 10. Admin setup ───────────────────────────────────────────────────────────
step "Panel configuration"
if ! step_done "admin_account"; then
  ADMIN_USER="admin"
  ADMIN_PASS=$(openssl rand -base64 16 | tr -d '/+=' | head -c 20)
  ADMIN_EMAIL="admin@$(hostname -f)"
  SERVER_HOST=$(hostname -f)

  echo "$SERVER_HOST"  > "$INSTALL_DIR/.server_host"
  echo ""              > "$INSTALL_DIR/.license_key"   # set via nixpanel.io after install
  echo "$ADMIN_USER"   > "$INSTALL_DIR/.admin_user"
  echo "$ADMIN_PASS"   > "$INSTALL_DIR/.admin_pass"
  chmod 600 "$INSTALL_DIR/.server_host" "$INSTALL_DIR/.license_key" \
            "$INSTALL_DIR/.admin_user"  "$INSTALL_DIR/.admin_pass"

  mark_done "admin_account"
else
  SERVER_HOST=$(cat "$INSTALL_DIR/.server_host" 2>/dev/null || hostname -f)
  ADMIN_USER=$(cat "$INSTALL_DIR/.admin_user"   2>/dev/null || echo "admin")
  ADMIN_PASS=$(cat "$INSTALL_DIR/.admin_pass"   2>/dev/null || echo "(see /opt/nixpanel/.admin_pass)")
fi
success "Panel configuration done"

# ── 11. Environment file ──────────────────────────────────────────────────────
step "Writing environment file"
cat > "$INSTALL_DIR/.env" <<EOF
RUST_LOG=nixpanel=info,tower_http=warn
PORT=4000
JWT_SECRET=${JWT_SECRET_PANEL}
DATABASE_URL=mysql://nixpanel:${DB_PASS_PANEL}@127.0.0.1:3306/nixpanel
SERVER_HOST=${SERVER_HOST:-$(hostname -f)}
LICENSING_SERVER_URL=${LICENSING_URL}
LICENSE_KEY_PATH=${INSTALL_DIR}/.license_key
INSTALL_DIR=${INSTALL_DIR}
EOF
chmod 600 "$INSTALL_DIR/.env"
success "Environment file written"

# ── 12. systemd — panel ───────────────────────────────────────────────────────
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
ExecStart=${BIN_DIR}/nixpanel
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
  # Only start if the binary exists
  if [[ -f "$BIN_DIR/nixpanel" ]]; then
    systemctl start nixpanel
  else
    warn "Panel binary not built yet — service enabled but not started"
    warn "Re-run installer after panel source is added to the repo"
  fi
  mark_done "systemd_panel"
fi
success "nixpanel service configured"

# ── 13. Apache vhosts ─────────────────────────────────────────────────────────
step "Configuring Apache reverse proxies"
if ! step_done "apache_vhost"; then
  for port in 2083 2087; do
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
APACHEEOF

  a2ensite nixpanel
  apache2ctl configtest && systemctl reload apache2
  mark_done "apache_vhost"
fi
success "Apache vhosts configured"

# ── 14. Fail2ban ──────────────────────────────────────────────────────────────
step "Configuring Fail2ban"
if ! step_done "fail2ban"; then
  cat > /etc/fail2ban/jail.d/nixpanel.conf <<'EOF'
[nixpanel-auth]
enabled  = true
port     = 2083,2087
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

# ── 15. File permissions ──────────────────────────────────────────────────────
step "Setting permissions"
chown -R root:root "$INSTALL_DIR"
chmod 600 "$INSTALL_DIR/.env" 2>/dev/null || true
find "$INSTALL_DIR/bin" -type f -exec chmod 755 {} \; 2>/dev/null || true
[[ -d "$INSTALL_DIR/nixserver/dist" ]] && \
  find "$INSTALL_DIR/nixserver/dist" \( -type d -exec chmod 755 {} \; -o -type f -exec chmod 644 {} \; \)
[[ -d "$INSTALL_DIR/nixclient/dist" ]] && \
  find "$INSTALL_DIR/nixclient/dist" \( -type d -exec chmod 755 {} \; -o -type f -exec chmod 644 {} \; \)
success "Permissions set"

# ── 16. Service health check ──────────────────────────────────────────────────
step "Verifying services"
sleep 2

check_service() {
  if systemctl is-active --quiet "$1"; then
    success "$1 is running"
  else
    warn "$1 is NOT running — check: journalctl -u $1 -n 50"
  fi
}

check_service apache2
check_service mariadb
check_service fail2ban

if [[ -f "$BIN_DIR/nixpanel" ]]; then
  check_service nixpanel
fi

# ── Done ──────────────────────────────────────────────────────────────────────
SERVER_IP=$(hostname -I | awk '{print $1}')

echo ""
echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${BOLD}${GREEN}  NixPanel Installation Complete!${RESET}"
echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo ""
echo -e "  ${BOLD}NixServer  (Admin):${RESET}    http://${SERVER_IP}:2087"
echo -e "  ${BOLD}NixClient  (Users):${RESET}    http://${SERVER_IP}:2083"
echo ""
echo -e "  ${BOLD}${YELLOW}Login credentials (save these!):${RESET}"
echo -e "  ${BOLD}Username:${RESET}  ${ADMIN_USER}"
echo -e "  ${BOLD}Password:${RESET}  ${ADMIN_PASS}"
echo ""
echo -e "  ${BOLD}Logs:${RESET}    ${LOG_DIR}/"
echo -e "  ${BOLD}Config:${RESET}  ${INSTALL_DIR}/.env"
echo ""
echo -e "  To add SSL:  certbot --apache"
echo -e "  To restart:  systemctl restart nixpanel"
echo ""
