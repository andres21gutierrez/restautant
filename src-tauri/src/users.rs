// src/users.rs
use mongodb::{bson::{doc, oid::ObjectId}};
use serde::{Serialize, Deserialize};
use crate::db::{users_col, User, NewUser, UpdateUser, UserView, now_dt};
use crate::auth::hash_password;
use crate::state::AppState;

#[derive(Debug, Serialize, Deserialize)]
pub struct Page<T> {
  pub data: Vec<T>,
  pub total: i64,
  pub page: i64,
  pub page_size: i64,
}

#[tauri::command]
pub fn create_user(state: tauri::State<'_, AppState>, session_id: String, payload: NewUser) -> Result<UserView, String> {
  let _s = crate::auth::require_admin(&state, &session_id)?;

  let client = crate::db::mongo_client(&state.mongo_uri);
  let db = crate::db::database(&client, &state.db_name);
  let col = users_col(&db);

  let hash = hash_password(&payload.password)?;
  let user = User {
    id: ObjectId::new(),
    tenant_id: payload.tenant_id,
    branch_id: payload.branch_id,
    name: payload.name,
    username: payload.username,
    role: payload.role,
    active: payload.active,
    password_hash: hash,
    created_at: now_dt(),
    updated_at: now_dt(),
  };

  col.insert_one(&user)
    .run()
    .map_err(|e| {
      let s = e.to_string();
      if s.contains("E11000") { "Username ya existe en esta sucursal".into() } else { s }
    })?;

  Ok(user.into())
}

#[tauri::command]
pub fn list_users(
  state: tauri::State<'_, AppState>,
  session_id: String,
  tenant_id: String,
  branch_id: String,
  search: Option<String>,
  page: Option<i64>,
  page_size: Option<i64>,
  only_active: Option<bool>,
) -> Result<Page<UserView>, String> {
  let _s = crate::auth::require_admin(&state, &session_id)?;

  let client = crate::db::mongo_client(&state.mongo_uri);
  let db = crate::db::database(&client, &state.db_name);
  let col = users_col(&db);

  let mut filter = doc!{ "tenant_id": &tenant_id, "branch_id": &branch_id };
  if let Some(s) = search {
    if !s.is_empty() {
      filter.insert("$or", vec![
        doc!{"name": doc!{"$regex": &s, "$options":"i"}},
        doc!{"username": doc!{"$regex": &s, "$options":"i"}},
      ]);
    }
  }
  if let Some(true) = only_active { filter.insert("active", true); }

  let page = page.unwrap_or(1).max(1);
  let size = page_size.unwrap_or(20).clamp(1, 200);
  let skip = (page - 1) * size;

  let total = col.count_documents(filter.clone()).run().map_err(|e| e.to_string())? as i64;

  let mut cursor = col
    .find(filter)
    .skip(skip as u64)
    .limit(size as i64)
    .sort(doc!{"created_at": -1})
    .run()
    .map_err(|e| e.to_string())?;

  let mut out: Vec<UserView> = Vec::new();
  while let Some(doc_res) = cursor.next() {
    let u = doc_res.map_err(|e| e.to_string())?;
    out.push(u.into());
  }

  Ok(Page { data: out, total, page, page_size: size })
}

#[tauri::command]
pub fn update_user(
  state: tauri::State<'_, AppState>,
  session_id: String,
  user_id: String,
  changes: UpdateUser
) -> Result<UserView, String> {
  let _s = crate::auth::require_admin(&state, &session_id)?;
  let id = ObjectId::parse_str(&user_id).map_err(|_| "user_id inválido")?;

  let client = crate::db::mongo_client(&state.mongo_uri);
  let db = crate::db::database(&client, &state.db_name);
  let col = users_col(&db);

  let mut set_doc = doc!{};
  if let Some(v) = changes.name { set_doc.insert("name", v); }
  if let Some(v) = changes.username { set_doc.insert("username", v); }
  if let Some(v) = changes.role { set_doc.insert("role", mongodb::bson::to_bson(&v).unwrap()); }
  if let Some(v) = changes.active { set_doc.insert("active", v); }
  if let Some(pw) = changes.new_password {
    let hash = hash_password(&pw)?;
    set_doc.insert("password_hash", hash);
  }
  set_doc.insert("updated_at", now_dt());

  let res = col
    .find_one_and_update(
      doc!{"_id": &id},
      doc!{"$set": set_doc},
    )
    .return_document(mongodb::options::ReturnDocument::After)
    .run()
    .map_err(|e| e.to_string())?
    .ok_or("Usuario no encontrado")?;

  Ok(res.into())
}

#[tauri::command]
pub fn toggle_user_active(
  state: tauri::State<'_, AppState>,
  session_id: String,
  user_id: String,
  active: bool
) -> Result<UserView, String> {
  update_user(state, session_id, user_id, crate::db::UpdateUser { active: Some(active), ..Default::default() })
}

#[tauri::command]
pub fn get_user_by_id(
  state: tauri::State<'_, AppState>,
  session_id: String,
  user_id: String
) -> Result<UserView, String> {
  let _s = crate::auth::require_admin(&state, &session_id)?;
  let id = ObjectId::parse_str(&user_id).map_err(|_| "user_id inválido")?;

  let client = crate::db::mongo_client(&state.mongo_uri);
  let db = crate::db::database(&client, &state.db_name);
  let col = users_col(&db);

  let u = col.find_one(doc!{"_id": id})
    .run()
    .map_err(|e| e.to_string())?
    .ok_or("No existe")?;
  Ok(u.into())
}
