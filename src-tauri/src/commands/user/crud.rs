use tauri::command;
use mongodb::bson::doc;

use crate::db::get_db;
use crate::commands::user::model::{PublicUser, UserRow};

#[command]
pub async fn list_users(page: Option<u64>, per_page: Option<u64>, q: Option<String>) -> Result<Vec<PublicUser>, String> {
    use futures_util::TryStreamExt;

    let db = get_db().await.map_err(|e| e.to_string())?;
    let coll = db.collection::<UserRow>("user");

    let page = page.unwrap_or(1).max(1);
    let per_page = per_page.unwrap_or(10).clamp(1, 100);

    let filter = if let Some(term) = q.filter(|s| !s.trim().is_empty()) {
        let regex = doc! { "$regex": term, "$options": "i" };
        doc! {
            "$or": [
              { "name": &regex },
              { "lastname": &regex },
              { "email": &regex },
              { "username": &regex },
              { "ci": &regex }
            ]
        }
    } else {
        doc! {}
    };

    let projection = doc! {
        "name": 1, "lastname": 1, "ci": 1, "email": 1, "celular": 1,
        "username": 1, "rol": 1, "photo": 1, "active": 1
    };

    let mut cursor = coll
        .find(filter)
        .skip((page - 1) * per_page)
        .limit(per_page as i64)
        .sort(doc! { "lastname": 1, "name": 1 })
        .projection(projection)
        .await
        .map_err(|e| e.to_string())?;

    let mut out = Vec::new();

    while let Some(u) = cursor.try_next().await.map_err(|e| e.to_string())? {
        out.push(PublicUser::from(&u));
    }

    Ok(out)
}
