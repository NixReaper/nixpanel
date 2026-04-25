-- Users (panel logins: admin + per-account users)
CREATE TABLE IF NOT EXISTS users (
    id            BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
    username      VARCHAR(64)      NOT NULL,
    email         VARCHAR(255)     NOT NULL,
    password_hash VARCHAR(255)     NOT NULL,
    role          ENUM('admin','user') NOT NULL DEFAULT 'user',
    created_at    DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_username (username),
    UNIQUE KEY uq_email    (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Hosting accounts
CREATE TABLE IF NOT EXISTS accounts (
    id              BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
    user_id         BIGINT UNSIGNED,
    username        VARCHAR(64)      NOT NULL,
    domain          VARCHAR(255)     NOT NULL,
    email           VARCHAR(255)     NOT NULL,
    password_hash   VARCHAR(255)     NOT NULL,
    package_name    VARCHAR(64)      NOT NULL DEFAULT 'Default',
    disk_quota_mb   INT              NOT NULL DEFAULT 10240,
    bandwidth_mb    INT              NOT NULL DEFAULT 0,
    status          ENUM('active','suspended','terminated') NOT NULL DEFAULT 'active',
    created_at      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_username (username),
    UNIQUE KEY uq_domain   (domain),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Domains / DNS zones
CREATE TABLE IF NOT EXISTS domains (
    id          BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
    account_id  BIGINT UNSIGNED,
    name        VARCHAR(255)     NOT NULL,
    type        ENUM('main','addon','parked','subdomain') NOT NULL DEFAULT 'main',
    status      ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_at  DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_name (name),
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- DNS records
CREATE TABLE IF NOT EXISTS dns_records (
    id          BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
    domain_id   BIGINT UNSIGNED  NOT NULL,
    type        VARCHAR(10)      NOT NULL,  -- A, AAAA, CNAME, MX, TXT, NS, SRV
    name        VARCHAR(255)     NOT NULL,
    content     VARCHAR(512)     NOT NULL,
    ttl         INT              NOT NULL DEFAULT 3600,
    priority    INT,
    created_at  DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- MySQL/MariaDB databases owned by accounts
CREATE TABLE IF NOT EXISTS account_databases (
    id          BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
    account_id  BIGINT UNSIGNED  NOT NULL,
    db_name     VARCHAR(64)      NOT NULL,
    db_user     VARCHAR(64)      NOT NULL,
    created_at  DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_db_name (db_name),
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Email accounts
CREATE TABLE IF NOT EXISTS email_accounts (
    id            BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
    account_id    BIGINT UNSIGNED  NOT NULL,
    address       VARCHAR(255)     NOT NULL,
    password_hash VARCHAR(255)     NOT NULL,
    quota_mb      INT              NOT NULL DEFAULT 1024,
    created_at    DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_address (address),
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- FTP accounts
CREATE TABLE IF NOT EXISTS ftp_accounts (
    id          BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
    account_id  BIGINT UNSIGNED  NOT NULL,
    username    VARCHAR(64)      NOT NULL,
    home_dir    VARCHAR(512)     NOT NULL,
    created_at  DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_username (username),
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- SSL certificates
CREATE TABLE IF NOT EXISTS ssl_certificates (
    id          BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
    account_id  BIGINT UNSIGNED,
    domain      VARCHAR(255)     NOT NULL,
    issuer      VARCHAR(64)      NOT NULL DEFAULT 'letsencrypt',
    cert_path   VARCHAR(512),
    key_path    VARCHAR(512),
    expires_at  DATETIME,
    auto_renew  TINYINT(1)       NOT NULL DEFAULT 1,
    created_at  DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_domain (domain),
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Backup jobs
CREATE TABLE IF NOT EXISTS backups (
    id          BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
    account_id  BIGINT UNSIGNED,
    type        ENUM('full','incremental') NOT NULL DEFAULT 'full',
    status      ENUM('pending','running','completed','failed') NOT NULL DEFAULT 'pending',
    size_bytes  BIGINT,
    path        VARCHAR(512),
    created_at  DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    PRIMARY KEY (id),
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
