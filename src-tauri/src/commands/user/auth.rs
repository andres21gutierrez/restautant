use tauri::command;
use mongodb::bson::doc;
use crate::db::get_db;
use serde::Deserialize;
use super::model::{PublicUserSession, User};

use std::sync::Mutex;

// Estructura para datos del login
#[derive(Debug, Deserialize)]
pub struct LoginData {
    pub username: String,
    pub password: String,
}

// Estado global de sesión
#[derive(Default)]
pub struct Session {
    pub user: Option<User>,
}

#[command]
pub async fn login_user(
    data: LoginData,
    state: tauri::State<'_, Mutex<Session>>,
) -> Result<String, String> {
    let db = get_db().await.map_err(|e| e.to_string())?;
    let users = db.collection::<User>("user");

    let filter = doc! {
        "username": &data.username,
        "password": &data.password,
    };

    let user = users.find_one(filter).await.map_err(|e| e.to_string())?;

    match user {
        Some(u) => {
            let mut session = state.lock().unwrap();
            session.user = Some(u.clone());
            Ok(format!("Bienvenido, {}", u.username))
        }
        None => Err("Usuario o contraseña incorrectos".into()),
    }
}

#[command]
pub fn logout_user(state: tauri::State<'_, Mutex<Session>>) -> Result<(), String> {
    let mut session = state.lock().unwrap();
    session.user = None;
    Ok(())
}

#[command]
pub fn get_current_user(state: tauri::State<'_, Mutex<Session>>) -> Result<PublicUserSession, String> {
    let session = state.lock().unwrap();
    match &session.user {
        Some(user) => Ok(PublicUserSession::from(user)),
        None => Err("No hay sesión activa".into()),
    }
}
