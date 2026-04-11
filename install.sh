#!/usr/bin/env bash
# NixPanel Installer
# https://github.com/NixReaper/nixpanel
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'
BOLD='\033[1m'; RESET='\033[0m'

info()    { echo -e "${CYAN}[INFO]${RESET}  $*"; }
success() { echo -e "${GREEN}[OK]${RESET}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
error()   { echo -e "${RED}[ERROR]${RESET} $*" >&2; exit 1; }
step()    { echo -e "\n${BOLD}${CYAN}━━━  $*  ━━━${RESET}"; }

# ── Preflight ──────────────────────────────────────────────────────────────────

[[ $EUID -ne 0 ]] && error "Must be run as root (sudo bash install.sh)"

OS_ID=$(. /etc/os-release && echo "$ID")
OS_VERSION=$(. /etc/os-release && echo "$VERSION_ID")
ARCH=$(uname -m)

[[ "$OS_ID" != "ubuntu" ]]      && error "NixPanel requires Ubuntu 24.04 LTS (detected: $OS_ID)"
[[ "$OS_VERSION" != "24.04" ]]  && error "NixPanel requires Ubuntu 24.04 LTS (detected: Ubuntu $OS_VERSION)"
[[ "$ARCH" != "x86_64" ]]       && error "NixPanel requires x86_64 architecture (detected: $ARCH)"

INSTALL_DIR="/opt/nixpanel"
DATA_DIR="/opt/nixpanel/data"
LOG_DIR="/opt/nixpanel/logs"
STEP_DIR="/var/lib/nixpanel/install"
GITHUB_REPO="NixReaper/nixpanel"

mkdir -p "$STEP_DIR" "$DATA_DIR" "$LOG_DIR"

mark_done()  { touch "$STEP_DIR/$1.done"; }
step_done()  { [[ -f "$STEP_DIR/$1.done" ]]; }

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

# ── Helper: latest release version ────────────────────────────────────────────

get_latest_version() {
  curl -fsSL "https://api.github.com/repos/${GITHUB_REPO}/releases/latest" \
    | grep '"tag_name"' | cut -d'"' -f4
}

# ── System packages ────────────────────────────────────────────────────────────

step "Updating system packages"
if ! step_done "apt_update"; then
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq
  apt-get upgrade -y -qq
  mark_done "apt_update"
fi
success "System packages up to date"

step "Freeing port 53 for PowerDNS"
if ! step_done "resolved_stub"; then
  sed -i 's/#DNSStubListener=yes/DNSStubListener=no/' /etc/systemd/resolved.conf 2>/dev/null || true
  sed -i 's/^DNSStubListener=yes/DNSStubListener=no/' /etc/systemd/resolved.conf 2>/dev/null || true
  echo "DNSStubListener=no" >> /etc/systemd/resolved.conf
  systemctl restart systemd-resolved 2>/dev/null || true
  mark_done "resolved_stub"
fi
success "Port 53 free"

step "Installing service stack"
if ! step_done "packages"; then
  export DEBIAN_FRONTEND=noninteractive
  apt-get install -y -qq \
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
    curl wget git unzip software-properties-common \
    openssl ca-certificates \
    nodejs npm 2>/dev/null || true
  mark_done "packages"
fi
success "Service stack installed"

# ── Apache ─────────────────────────────────────────────────────────────────────

step "Configuring Apache"
if ! step_done "apache"; then
  a2enmod rewrite ssl proxy proxy_http proxy_wstunnel proxy_fcgi headers expires deflate 2>/dev/null || true
  systemctl enable apache2
  systemctl start apache2
  mark_done "apache"
fi
success "Apache configured"

# ── MariaDB ────────────────────────────────────────────────────────────────────

step "Configuring MariaDB"
if ! step_done "mariadb"; then
  systemctl enable mariadb
  systemctl start mariadb
  mark_done "mariadb"
fi
success "MariaDB ready"

# ── PowerDNS ───────────────────────────────────────────────────────────────────

step "Configuring PowerDNS"
if ! step_done "pdns"; then
  systemctl enable pdns
  systemctl start pdns 2>/dev/null || true
  mark_done "pdns"
fi
success "PowerDNS ready"

# ── SpamAssassin ───────────────────────────────────────────────────────────────

step "Configuring SpamAssassin"
if ! step_done "spamd"; then
  systemctl enable spamd
  systemctl start spamd 2>/dev/null || true
  mark_done "spamd"
fi
success "SpamAssassin ready"

# ── Download NixPanel release ──────────────────────────────────────────────────

step "Downloading NixPanel"
if ! step_done "download"; then
  VERSION=$(get_latest_version)
  [[ -z "$VERSION" ]] && error "Could not determine latest NixPanel version"
  info "Latest version: $VERSION"

  mkdir -p "$INSTALL_DIR"
  TMP_DIR=$(mktemp -d)
  TARBALL_URL="https://github.com/${GITHUB_REPO}/releases/download/${VERSION}/nixpanel-${VERSION}-linux-x64.tar.gz"

  info "Downloading release tarball..."
  curl -fsSL "$TARBALL_URL" -o "$TMP_DIR/nixpanel.tar.gz" \
    || error "Failed to download NixPanel $VERSION from GitHub Releases"

  tar -xzf "$TMP_DIR/nixpanel.tar.gz" -C "$TMP_DIR"
  cp -a "$TMP_DIR/nixpanel-${VERSION}"/. "$INSTALL_DIR/"
  rm -rf "$TMP_DIR"
  mark_done "download"
fi
success "NixPanel downloaded"

# ── Environment ────────────────────────────────────────────────────────────────

step "Configuring environment"
if ! step_done "env"; then
  if [[ ! -f "$INSTALL_DIR/.env" ]]; then
    JWT_SECRET=$(openssl rand -hex 32)
    REFRESH_SECRET=$(openssl rand -hex 32)
    DB_PASS=$(openssl rand -hex 16)
    cat > "$INSTALL_DIR/.env" <<EOF
NODE_ENV=production
PORT=4000
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${REFRESH_SECRET}
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
DATABASE_URL=file:/opt/nixpanel/data/nixpanel.db
INSTALL_DIR=/opt/nixpanel
MYSQL_ROOT_PASSWORD=${DB_PASS}
EOF
    chmod 600 "$INSTALL_DIR/.env"
  fi
  mark_done "env"
fi
success "Environment configured"

# ── Database ───────────────────────────────────────────────────────────────────

step "Initialising database"
if ! step_done "db_init"; then
  cd "$INSTALL_DIR/server"
  npx prisma db push 2>/dev/null || true
  mark_done "db_init"
fi
success "Database ready"

# ── Admin account ──────────────────────────────────────────────────────────────

step "Creating admin account"
if ! step_done "admin_account"; then
  echo ""
  echo -e "  ${BOLD}Create your NixServer admin account${RESET}"
  read -rp "  Admin username [admin]: " ADMIN_USER
  ADMIN_USER="${ADMIN_USER:-admin}"
  read -rsp "  Admin password: " ADMIN_PASS
  echo ""
  read -rsp "  Confirm password: " ADMIN_PASS2
  echo ""
  [[ "$ADMIN_PASS" != "$ADMIN_PASS2" ]] && error "Passwords do not match"
  read -rp "  Admin email: " ADMIN_EMAIL

  node "$INSTALL_DIR/scripts/create-admin.js" \
    --username "$ADMIN_USER" \
    --password "$ADMIN_PASS" \
    --email    "$ADMIN_EMAIL" \
    || error "Failed to create admin account"
  mark_done "admin_account"
fi
success "Admin account ready"

# ── Permissions ────────────────────────────────────────────────────────────────

step "Setting permissions"
chmod 755 "$INSTALL_DIR"
[[ -d "$INSTALL_DIR/nixserver/dist" ]] && {
  chmod 755 "$INSTALL_DIR/nixserver"
  find "$INSTALL_DIR/nixserver/dist" -type d -exec chmod 755 {} \;
  find "$INSTALL_DIR/nixserver/dist" -type f -exec chmod 644 {} \;
}
[[ -d "$INSTALL_DIR/nixclient/dist" ]] && {
  chmod 755 "$INSTALL_DIR/nixclient"
  find "$INSTALL_DIR/nixclient/dist" -type d -exec chmod 755 {} \;
  find "$INSTALL_DIR/nixclient/dist" -type f -exec chmod 644 {} \;
}
chmod 755 "$INSTALL_DIR/bin/nixpanel" 2>/dev/null || true
success "Permissions set"

# ── Systemd service ────────────────────────────────────────────────────────────

step "Installing systemd service"
if ! step_done "systemd"; then
  cat > /etc/systemd/system/nixpanel.service <<'EOF'
[Unit]
Description=NixPanel Control Panel
After=network.target mariadb.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/nixpanel
ExecStart=/opt/nixpanel/bin/nixpanel
Restart=always
RestartSec=5
EnvironmentFile=/opt/nixpanel/.env

[Install]
WantedBy=multi-user.target
EOF
  systemctl daemon-reload
  systemctl enable nixpanel
  systemctl start nixpanel
  mark_done "systemd"
fi
success "Service installed and started"

# ── Apache vhosts ──────────────────────────────────────────────────────────────

step "Configuring Apache reverse proxy"
if ! step_done "apache_vhost"; then
  cat > /etc/apache2/sites-available/nixpanel.conf <<'EOF'
# NixServer — Admin Panel (port 2087)
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
</VirtualHost>

# NixClient — User Panel (port 2083)
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
</VirtualHost>
EOF

  echo "Listen 2083" >> /etc/apache2/ports.conf
  echo "Listen 2087" >> /etc/apache2/ports.conf

  a2ensite nixpanel 2>/dev/null || true
  apache2ctl configtest && systemctl reload apache2
  mark_done "apache_vhost"
fi
success "Apache vhosts configured"

# ── Done ───────────────────────────────────────────────────────────────────────

SERVER_IP=$(hostname -I | awk '{print $1}')

echo ""
echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${BOLD}${GREEN}  NixPanel Installation Complete!${RESET}"
echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo ""
echo -e "  ${BOLD}NixServer (Admin):${RESET}  http://${SERVER_IP}:2087"
echo -e "  ${BOLD}NixClient (User):${RESET}   http://${SERVER_IP}:2083"
echo ""
echo -e "  Open your browser and log in with the admin credentials you just created."
echo ""
