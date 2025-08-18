// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod db;

use std::sync::Mutex;

use commands::user::auth::{self};
use commands::user::crud::{self};

fn main() {
    let _ = dotenv::dotenv();
    
    tauri::Builder::default()
    .manage(Mutex::new(auth::Session::default()))
    .invoke_handler(tauri::generate_handler![
        auth::login_user,
        auth::logout_user,
        auth::get_current_user,
        
        crud::list_users,
    ]).run(tauri::generate_context!()).expect("error al iniciar tauri")
}