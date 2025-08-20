// src/main.rs
#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

mod state;
mod db;
mod auth;
mod users;
mod products;

use state::AppState;
use tauri::Manager;

fn main() {

  dotenv::dotenv().ok();

  tauri::Builder::default()
    .setup(|app| {
      // Lee datos de conexión (puedes hardcodear aquí si prefieres)
      let mongo_uri = std::env::var("MONGO_URI")
        .unwrap_or_else(|_| "mongodb://127.0.0.1:27017".to_string());
      let db_name = std::env::var("MONGO_DB")
        .unwrap_or_else(|_| "restaurant".to_string());

      // Conexión temporal SOLO para tareas de arranque (índices + admin)
      let client = db::mongo_client(&mongo_uri);
      let database = db::database(&client, &db_name);

      // Índices requeridos
      db::ensure_user_indexes(&database)
        .expect("No se pudieron crear los índices de usuarios");

      // Bootstrap admin/admin123 si la colección está vacía
      db::bootstrap_default_admin(&database)
        .expect("No se pudo crear el usuario admin por defecto");

      // Guarda las cadenas en AppState (tu diseño actual)
      let state = AppState::new(mongo_uri.clone(), db_name.clone());
      app.manage(state);

      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      users::get_user_by_id,
      users::create_user,
      users::list_users,
      users::update_user,
      users::toggle_user_active,
      products::create_product,
      products::list_products,
      products::update_product,
      products::get_product_by_id,
      products::delete_product,
      auth::login,
      auth::logout
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
