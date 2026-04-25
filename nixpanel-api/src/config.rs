use std::env;

#[derive(Clone, Debug)]
pub struct Config {
    pub port:         u16,
    pub jwt_secret:   String,
    pub database_url: String,
    pub install_dir:  String,
    pub bin_dir:      String,
}

impl Config {
    pub fn from_env() -> anyhow::Result<Self> {
        Ok(Self {
            port:         env::var("PORT").unwrap_or_else(|_| "4000".into()).parse()?,
            jwt_secret:   env::var("JWT_SECRET").unwrap_or_else(|_| "change-me-in-production".into()),
            database_url: env::var("DATABASE_URL")?,
            install_dir:  env::var("INSTALL_DIR").unwrap_or_else(|_| "/opt/nixpanel".into()),
            bin_dir:      env::var("INSTALL_DIR")
                              .map(|d| format!("{}/bin", d))
                              .unwrap_or_else(|_| "/opt/nixpanel/bin".into()),
        })
    }
}
