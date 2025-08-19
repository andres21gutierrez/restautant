// src/db.rs
use mongodb::{
  sync::{Client, Database, Collection},
  bson::{doc, oid::ObjectId, DateTime},
};
use serde::{Serialize, Deserialize};
use std::time::{SystemTime, UNIX_EPOCH}; // para epoch secs
use crate::state::Role;
use mongodb::options::IndexOptions;
use mongodb::{IndexModel};
use anyhow::anyhow;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
  #[serde(rename = "_id")]
  pub id: ObjectId,
  pub tenant_id: String,
  pub branch_id: String,
  pub name: String,
  pub username: String,
  pub role: Role,
  pub active: bool,
  pub password_hash: String,
  pub created_at: DateTime,
  pub updated_at: DateTime,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewUser {
  pub tenant_id: String,
  pub branch_id: String,
  pub name: String,
  pub username: String,
  pub role: Role,
  pub password: String,
  pub active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct UpdateUser {
  pub name: Option<String>,
  pub username: Option<String>,
  pub role: Option<Role>,
  pub active: Option<bool>,
  pub new_password: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserView {
  pub id: String,
  pub tenant_id: String,
  pub branch_id: String,
  pub name: String,
  pub username: String,
  pub role: Role,
  pub active: bool,
  pub created_at: i64,
  pub updated_at: i64,
}

impl From<User> for UserView {
  fn from(u: User) -> Self {
    // DateTime -> epoch seconds (vía SystemTime)
    let created_secs = u.created_at.to_system_time()
      .duration_since(UNIX_EPOCH).unwrap().as_secs() as i64;
    let updated_secs = u.updated_at.to_system_time()
      .duration_since(UNIX_EPOCH).unwrap().as_secs() as i64;

    Self {
      id: u.id.to_hex(),
      tenant_id: u.tenant_id,
      branch_id: u.branch_id,
      name: u.name,
      username: u.username,
      role: u.role,
      active: u.active,
      created_at: created_secs,
      updated_at: updated_secs,
    }
  }
}

pub fn mongo_client(uri: &str) -> Client {
  Client::with_uri_str(uri).expect("Mongo connection failed")
}

pub fn database(client: &Client, name: &str) -> Database {
  client.database(name)
}

pub fn users_col(db: &Database) -> Collection<User> {
  db.collection::<User>("users")
}

pub fn ensure_user_indexes(db: &Database) -> anyhow::Result<()> {
    let col = super::db::users_col(db);

    let idx = IndexModel::builder()
        .keys(doc! { "tenant_id": 1, "branch_id": 1, "username": 1 })
        .options(
            IndexOptions::builder()
                .unique(true)
                .name(Some("uniq_tenant_branch_username".to_string())) 
                .build(),
        )
        .build();

    col.create_index(idx).run()?;

    Ok(())
}

pub fn now_dt() -> DateTime {
  DateTime::now()
}



pub fn bootstrap_default_admin(db: &Database) -> anyhow::Result<()> {
    let col = users_col(db);

    // ¿Hay usuarios?
    let count = col.count_documents(doc!{}).run()?;
    if count > 0 {
        return Ok(()); // ya hay usuarios, no hacemos nada
    }

    // Hash de la contraseña por defecto
    let hash = crate::auth::hash_password("admin123")
        .map_err(|e| anyhow!(e))?;

    // Usuario admin por defecto
    let user = User {
        id: ObjectId::new(),
        tenant_id: "T1".to_string(),
        branch_id: "B1".to_string(),
        name: "Administrador".to_string(),
        username: "admin".to_string(),
        role: Role::ADMIN,
        active: true,
        password_hash: hash,
        created_at: now_dt(),
        updated_at: now_dt(),
    };

    // Inserta
    col.insert_one(user).run()?;
    Ok(())
}
