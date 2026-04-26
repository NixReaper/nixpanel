mod auth;
mod config;
mod error;
mod routes;
mod section;
mod state;

use std::sync::Arc;
use std::net::SocketAddr;

use axum::{
    routing::{delete, get, post},
    Router,
};
use tower_http::cors::{Any, CorsLayer};
use tracing::info;

use config::Config;
use state::AppState;

/* ── DB schema bootstrap ────────────────────────────────────────────── */

async fn run_migrations(pool: &sqlx::MySqlPool) -> anyhow::Result<()> {
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS _schema_version (
            version   INT          NOT NULL,
            applied_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (version)
         ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    ).execute(pool).await?;

    let current: i32 = sqlx::query_scalar(
        "SELECT COALESCE(MAX(version), 0) FROM _schema_version"
    ).fetch_one(pool).await.unwrap_or(0);

    if current < 1 {
        info!("Running migration 1: initial schema");
        for stmt in include_str!("../migrations/0001_initial.sql")
            .split(";\n")
            .map(str::trim)
            .filter(|s| !s.is_empty())
        {
            sqlx::query(stmt).execute(pool).await?;
        }
        sqlx::query("INSERT INTO _schema_version (version) VALUES (1)")
            .execute(pool).await?;
    }

    Ok(())
}

/* ── Admin user seeding ─────────────────────────────────────────────── */

async fn seed_admin(pool: &sqlx::MySqlPool, install_dir: &str) -> anyhow::Result<()> {
    use argon2::{
        password_hash::{rand_core::OsRng, PasswordHasher, SaltString},
        Argon2,
    };

    let count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM users WHERE role = 'admin'"
    ).fetch_one(pool).await.unwrap_or(0);

    if count > 0 {
        return Ok(()); // already seeded
    }

    let username = std::fs::read_to_string(format!("{}/.admin_user", install_dir))
        .unwrap_or_else(|_| "admin".into())
        .trim()
        .to_string();

    let password = std::fs::read_to_string(format!("{}/.admin_pass", install_dir))
        .unwrap_or_else(|_| "changeme".into())
        .trim()
        .to_string();

    let email = format!("{}@localhost", username);

    let salt = SaltString::generate(&mut OsRng);
    let hash = Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .map_err(|e| anyhow::anyhow!("argon2: {}", e))?
        .to_string();

    sqlx::query(
        "INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, 'admin')"
    )
    .bind(&username)
    .bind(&email)
    .bind(&hash)
    .execute(pool)
    .await?;

    info!("Seeded admin user: {}", username);
    Ok(())
}

/* ── Router ─────────────────────────────────────────────────────────── */

fn build_router(state: AppState) -> Router {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    Router::new()
        // Auth (public)
        .route("/api/auth/login", post(routes::auth::login))
        // Dashboard
        .route("/api/dashboard", get(routes::dashboard::get_dashboard))
        // Services
        .route("/api/services",                get(routes::services::list_services))
        .route("/api/services/:name/:action", post(routes::services::service_action))
        // Accounts — list / create
        .route("/api/accounts",
               get(routes::accounts::list_accounts)
               .post(routes::accounts::create_account))
        // Accounts — per-account actions
        .route("/api/accounts/:username",
               get(routes::accounts::get_account)
               .delete(routes::accounts::terminate_account))
        .route("/api/accounts/:username/suspend",
               post(routes::accounts::suspend_account))
        .route("/api/accounts/:username/unsuspend",
               post(routes::accounts::unsuspend_account))
        // DNS
        .route("/api/dns",                    get(routes::dns::list_zones))
        .route("/api/dns/:domain",
               get(routes::dns::list_zone_records)
               .post(routes::dns::add_record)
               .delete(routes::dns::delete_record))
        // Email accounts
        .route("/api/email",                  post(routes::email::create_email_account))
        .route("/api/email/:username",        get(routes::email::list_email_accounts))
        .route("/api/email/id/:id",           delete(routes::email::delete_email_account))
        // Profile / password
        .route("/api/me/password",            post(routes::me::change_password))
        .with_state(state)
        .layer(cors)
}

/* ── Entry point ────────────────────────────────────────────────────── */

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Load .env if present (production uses EnvironmentFile= in systemd)
    let _ = dotenvy::dotenv();

    tracing_subscriber::fmt()
        .with_env_filter(
            std::env::var("RUST_LOG")
                .unwrap_or_else(|_| "nixpanel=info,tower_http=warn".into())
        )
        .init();

    let config = Config::from_env()?;
    info!("NixPanel API starting on port {}", config.port);

    // Connect to MariaDB
    let pool = sqlx::MySqlPool::connect(&config.database_url).await?;

    // Migrations
    run_migrations(&pool).await?;

    // Seed admin on first run
    seed_admin(&pool, &config.install_dir).await
        .unwrap_or_else(|e| tracing::warn!("Admin seed skipped: {}", e));

    let state = AppState {
        db:     pool,
        config: Arc::new(config.clone()),
    };

    let addr = SocketAddr::from(([127, 0, 0, 1], config.port));
    let listener = tokio::net::TcpListener::bind(addr).await?;
    info!("Listening on {}", addr);

    axum::serve(listener, build_router(state)).await?;
    Ok(())
}
