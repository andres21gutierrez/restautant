use mongodb::{
  bson::{doc, oid::ObjectId},
};
use serde::{Serialize, Deserialize};
use crate::db::{products_col, Product, NewProduct, UpdateProduct, ProductView, now_dt};
use crate::state::AppState;

#[derive(Debug, Serialize, Deserialize)]
pub struct Page<T> {
  pub data: Vec<T>,
  pub total: i64,
  pub page: i64,
  pub page_size: i64,
}

#[tauri::command]
pub fn create_product(
  state: tauri::State<'_, AppState>,
  session_id: String,
  payload: NewProduct
) -> Result<ProductView, String> {
  let _s = crate::auth::require_admin(&state, &session_id)?;

  let client = crate::db::mongo_client(&state.mongo_uri);
  let db = crate::db::database(&client, &state.db_name);
  let col = products_col(&db);

  let product = Product {
    id: ObjectId::new(),
    tenant_id: payload.tenant_id,
    branch_id: payload.branch_id,
    name: payload.name,
    photo_base64: payload.photo_base64,
    price: payload.price,
    description: payload.description,
    created_at: now_dt(),
    updated_at: now_dt(),
  };

  let res = col.insert_one(&product).run();
  match res {
    Ok(_) => Ok(product.into()),
    Err(e) => Err(e.to_string()),
  }
}

#[tauri::command]
pub fn list_products(
  state: tauri::State<'_, AppState>,
  session_id: String,
  tenant_id: String,
  branch_id: String,
  search: Option<String>,
  page: Option<i64>,
  page_size: Option<i64>,
) -> Result<Page<ProductView>, String> {
  let _s = crate::auth::require_session(&state, &session_id)?;

  let client = crate::db::mongo_client(&state.mongo_uri);
  let db = crate::db::database(&client, &state.db_name);
  let col = products_col(&db);

  let mut filter = doc!{ "tenant_id": &tenant_id, "branch_id": &branch_id };
  if let Some(s) = search {
    if !s.is_empty() {
      filter.insert("name", doc!{"$regex": &s, "$options":"i"});
    }
  }

  let page = page.unwrap_or(1).max(1);
  let size = page_size.unwrap_or(20).clamp(1, 200);
  let skip = (page - 1) * size;

  let total = col.count_documents(filter.clone())
    .run()
    .map_err(|e| e.to_string())? as i64;

  let mut cursor = col
    .find(filter)
    .skip(skip as u64)
    .limit(size as i64)
    .sort(doc!{"created_at": -1})
    .run()
    .map_err(|e| e.to_string())?;

  let mut out: Vec<ProductView> = Vec::new();
  while let Some(doc_res) = cursor.next() {
    let p = doc_res.map_err(|e| e.to_string())?;
    out.push(p.into());
  }

  Ok(Page { data: out, total, page, page_size: size })
}

#[tauri::command]
pub fn update_product(
  state: tauri::State<'_, AppState>,
  session_id: String,
  product_id: String,
  changes: UpdateProduct
) -> Result<ProductView, String> {
  let _s = crate::auth::require_admin(&state, &session_id)?;
  let id = ObjectId::parse_str(&product_id).map_err(|_| "product_id inválido")?;

  let client = crate::db::mongo_client(&state.mongo_uri);
  let db = crate::db::database(&client, &state.db_name);
  let col = products_col(&db);

  let mut set_doc = doc!{};
  if let Some(v) = changes.name { set_doc.insert("name", v); }
  if let Some(v) = changes.photo_base64 { set_doc.insert("photo_base64", v); }
  if let Some(v) = changes.price { set_doc.insert("price", v); }
  if let Some(v) = changes.description { set_doc.insert("description", v); }
  set_doc.insert("updated_at", now_dt());

  let res = col
    .find_one_and_update(
      doc!{"_id": &id},
      doc!{"$set": set_doc},
    )
    .return_document(mongodb::options::ReturnDocument::After)
    .run();

  match res {
    Ok(Some(updated)) => Ok(updated.into()),
    Ok(None) => Err("Producto no encontrado".into()),
    Err(e) => Err(e.to_string()),
  }
}

#[tauri::command]
pub fn get_product_by_id(
  state: tauri::State<'_, AppState>,
  session_id: String,
  product_id: String
) -> Result<ProductView, String> {
  let _s = crate::auth::require_session(&state, &session_id)?;
  let id = ObjectId::parse_str(&product_id).map_err(|_| "product_id inválido")?;

  let client = crate::db::mongo_client(&state.mongo_uri);
  let db = crate::db::database(&client, &state.db_name);
  let col = products_col(&db);

  let p = col
    .find_one(doc!{"_id": id})
    .run()
    .map_err(|e| e.to_string())?
    .ok_or("No existe")?;

  Ok(p.into())
}