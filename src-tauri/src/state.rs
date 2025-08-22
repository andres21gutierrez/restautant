use parking_lot::RwLock;
use std::{collections::HashMap, time::{SystemTime}};
use uuid::Uuid;
use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum Role { ADMIN, SELLER }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
  pub session_id: String,
  pub user_id: String,
  pub username: String,
  pub role: Role,
  pub tenant_id: String,
  pub branch_id: String,
  pub expires_at: u64,
}

impl Session {
  pub fn is_valid(&self) -> bool {
    let now = SystemTime::now().duration_since(SystemTime::UNIX_EPOCH).unwrap().as_secs();
    now < self.expires_at
  }
}

pub struct SessionStore {
  pub map: RwLock<HashMap<String, Session>>,
}

impl SessionStore {
  pub fn new() -> Self {
    Self { map: RwLock::new(HashMap::new()) }
  }
  pub fn create(&self, mut s: Session) -> Session {
    s.session_id = Uuid::new_v4().to_string();
    self.map.write().insert(s.session_id.clone(), s.clone());
    s
  }
  pub fn get(&self, sid: &str) -> Option<Session> {
    self.map.read().get(sid).cloned().filter(|s| s.is_valid())
  }
  pub fn delete(&self, sid: &str) {
    self.map.write().remove(sid);
  }
}

pub struct AppState {
  pub mongo_uri: String,
  pub db_name: String,
  pub sessions: SessionStore,
}

impl AppState {
  pub fn new(mongo_uri: String, db_name: String) -> Self {
    Self { mongo_uri, db_name, sessions: SessionStore::new() }
  }
}

pub fn session_lifetime_secs() -> u64 {
  // 12 horas
  12 * 60 * 60
}
