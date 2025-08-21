// src/auth.rs
use argon2::{Argon2, PasswordHasher, PasswordVerifier};
use password_hash::{SaltString, PasswordHash};
use password_hash::rand_core::OsRng; // <-- clave
use mongodb::bson::doc;
use serde::{Serialize, Deserialize};
use crate::db::{users_col};
use crate::state::{AppState, Role, Session, session_lifetime_secs};

#[derive(Debug, Serialize, Deserialize)]
pub struct LoginInput {
  pub username: String,
  pub password: String,
  pub tenant_id: String,
  pub branch_id: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SessionView {
  pub session_id: String,
  pub user_id: String,
  pub username: String,
  pub role: Role,
  pub tenant_id: String,
  pub branch_id: String,
  pub expires_at: u64,
}

fn verify_password(hash: &str, password: &str) -> bool {
  let parsed = PasswordHash::new(hash).ok();
  match parsed {
    Some(ph) => Argon2::default().verify_password(password.as_bytes(), &ph).is_ok(),
    None => false,
  }
}

pub fn hash_password(plain: &str) -> Result<String, String> {
  let salt = SaltString::generate(&mut OsRng);
  Argon2::default()
    .hash_password(plain.as_bytes(), &salt)
    .map(|p| p.to_string())
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn login(state: tauri::State<'_, AppState>, input: LoginInput) -> Result<SessionView, String> {
  let client = crate::db::mongo_client(&state.mongo_uri);
  let db = crate::db::database(&client, &state.db_name);
  let col = users_col(&db);

  let user = col
  .find_one(doc!{
    "tenant_id": &input.tenant_id,
    "branch_id": &input.branch_id,
    "username": &input.username,
    "active": true
  })
  .run()                              // <-- antes pusimos execute(); cámbialo a run()
  .map_err(|e| e.to_string())?
  .ok_or("Usuario no encontrado o inactivo")?;

  if !verify_password(&user.password_hash, &input.password) {
    return Err("Credenciales inválidas".into());
  }

  let now = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs();
  let sess = Session {
    session_id: "".into(),
    user_id: user.id.to_hex(),
    username: user.username.clone(),
    role: user.role.clone(),
    tenant_id: user.tenant_id.clone(),
    branch_id: user.branch_id.clone(),
    expires_at: now + session_lifetime_secs(),
  };

  let created = state.sessions.create(sess);
  Ok(SessionView {
    session_id: created.session_id,
    user_id: created.user_id,
    username: created.username,
    role: created.role,
    tenant_id: created.tenant_id,
    branch_id: created.branch_id,
    expires_at: created.expires_at,
  })
}

#[tauri::command]
pub fn logout(state: tauri::State<'_, AppState>, session_id: String) -> Result<(), String> {
  state.sessions.delete(&session_id);
  Ok(())
}

pub fn require_session(state: &AppState, session_id: &str) -> Result<Session, String> {
  state.sessions.get(session_id).ok_or_else(|| "Sesión inválida o expirada".to_string())
}

pub fn require_admin(state: &AppState, session_id: &str) -> Result<Session, String> {
  let s = require_session(state, session_id)?;
  match s.role {
    Role::ADMIN => Ok(s),
    _ => Err("No autorizado: requiere rol ADMIN".into())
  }
}

pub fn require_any(state: &AppState, session_id: &str) -> Result<Session, String> {
  let s = state.sessions.get(session_id).ok_or("Sesión inválida")?;
  Ok(s)
}

pub fn touch_user_updated(db: &mongodb::sync::Database, user_id: &mongodb::bson::oid::ObjectId) -> Result<(), String> {
  let col = users_col(db);
  col.update_one(
      doc!{"_id": user_id},
      doc!{"$set": {"updated_at": crate::db::now_dt()}}
    ) 
    .run()
    .map_err(|e| e.to_string())?;
  Ok(())
}
