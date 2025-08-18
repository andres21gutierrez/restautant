use mongodb::bson::oid::ObjectId;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct User {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub name: String,
    pub lastname: String,
    pub ci: String,
    pub email: String,
    pub celular: u64,        // ⚠️ Recomendado: String para no perder ceros ni "+"
    pub username: String,
    pub password: String,    // ⚠️ Mejor usar password_hash (Argon2) y nunca exponerlo
    pub rol: u64,            // ⚠️ Recomendado: String o enum ("admin", "usuario"...)
    pub photo: Option<String>,
    pub active: bool,
}

#[derive(Debug, Serialize, Clone)]
pub struct PublicUserSession {
    pub id: Option<ObjectId>,
    pub name: String,
    pub lastname: String,
    pub ci: String,
    pub email: String,
    pub celular: u64,
    pub rol: u64,
    pub photo: Option<String>,
    pub active: bool,
}

impl From<&User> for PublicUserSession {
    fn from(user: &User) -> Self {
        PublicUserSession {
            id: user.id.clone(),
            name: user.name.clone(),
            lastname: user.lastname.clone(),
            ci: user.ci.clone(),
            email: user.email.clone(),
            celular: user.celular,
            rol: user.rol,
            photo: user.photo.clone(),
            active: user.active,
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UserRow {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub name: String,
    pub lastname: String,
    pub ci: String,
    pub email: String,
    pub celular: u64,        // ⚠️ Recomendado: String para no perder ceros ni "+"
    pub username: String,
    pub rol: u64,            // ⚠️ Recomendado: String o enum ("admin", "usuario"...)
    pub photo: Option<String>,
    pub active: bool,
}


#[derive(Debug, Serialize, Clone)]
pub struct PublicUser {
    pub id: Option<ObjectId>, // ⚠️ Recomendado: Option<String> con to_hex() para enviar al front
    pub name: String,
    pub lastname: String,
    pub ci: String,
    pub email: String,
    pub celular: u64,
    pub rol: u64,
    pub username: String,
    pub photo: Option<String>,
    pub active: bool,
}


impl From<&UserRow> for PublicUser {
    fn from(user: &UserRow) -> Self {
        PublicUser {
            id: user.id.clone(),
            name: user.name.clone(),
            lastname: user.lastname.clone(),
            ci: user.ci.clone(),
            email: user.email.clone(),
            celular: user.celular,
            username: user.username.clone(),
            rol: user.rol,
            photo: user.photo.clone(),
            active: user.active,
        }
    }
}
