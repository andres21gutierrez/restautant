use mongodb::{
    bson::{doc, oid::ObjectId},
};
use serde::{Serialize, Deserialize};
use chrono::Local;
use std::time::SystemTime;

use crate::db::{orders_col, Order, NewOrder, OrderView, now_dt, products_col};
use crate::state::AppState;

#[derive(Debug, Serialize, Deserialize)]
pub struct Page<T> {
    pub data: Vec<T>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

#[tauri::command]
pub fn create_order(
    state: tauri::State<'_, AppState>,
    session_id: String,
    payload: NewOrder
) -> Result<OrderView, String> {
    let _s = crate::auth::require_session(&state, &session_id)?;

    let client = crate::db::mongo_client(&state.mongo_uri);
    let db = crate::db::database(&client, &state.db_name);
    let col = orders_col(&db);
    let products_col = products_col(&db);

    // 🔹 Calcular inicio y fin del día
    let today = Local::now().date_naive();
    let start_of_day = today.and_hms_opt(0, 0, 0).unwrap();
    let end_of_day = today.and_hms_opt(23, 59, 59).unwrap();

    // convertir a SystemTime y luego a bson::DateTime
    let start_system: SystemTime = start_of_day.and_local_timezone(Local).unwrap().into();
    let end_system: SystemTime = end_of_day.and_local_timezone(Local).unwrap().into();

    let start_bson = mongodb::bson::DateTime::from_system_time(start_system);
    let end_bson = mongodb::bson::DateTime::from_system_time(end_system);

    let last_order = col
        .find_one(
            doc!{
                "tenant_id": &payload.tenant_id,
                "branch_id": &payload.branch_id,
                "created_at": { 
                    "$gte": start_bson,
                    "$lte": end_bson
                }
            }
        )
        .sort(doc!{"order_number": -1})
        .run()
        .map_err(|e| e.to_string())?;

    let order_number = match last_order {
        Some(order) => order.order_number + 1, // Si existe pedido hoy → continuar
        None => 1,                             // Si no hay pedidos hoy → empezar en 1
    };

    let mut total = 0.0;
    let mut items = Vec::new();

    for item in &payload.items {
        let product_id = ObjectId::parse_str(&item.product_id).map_err(|_| "ID de producto inválido")?;
        let product = products_col
            .find_one(doc!{"_id": product_id})
            .run()
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Producto no encontrado")?;

        let subtotal = product.price * item.quantity as f64;
        total += subtotal;

        items.push(crate::db::OrderItem {
            product_id: item.product_id.clone(),
            name: product.name,
            price: product.price,
            quantity: item.quantity,
        });
    }

    let (cash_amount, cash_change) = if payload.payment_method == crate::db::PaymentMethod::CASH {
        let amount = payload.cash_amount.unwrap_or(0.0);
        let change = if amount > total { amount - total } else { 0.0 };
        (Some(amount), Some(change))
    } else {
        (None, None)
    };

    let delivery = payload.delivery.map(|d| crate::db::DeliveryInfo {
        company: d.company,
        address: d.address,
        phone: d.phone,
    });

    let order = Order {
        id: ObjectId::new(),
        tenant_id: payload.tenant_id,
        branch_id: payload.branch_id,
        order_number,
        items,
        total,
        payment_method: payload.payment_method,
        cash_amount,
        cash_change,
        delivery,
        comments: payload.comments,
        status: crate::db::OrderStatus::PENDING,
        created_at: now_dt(),
        updated_at: now_dt(),
    };

    let res = col.insert_one(&order).run();
    match res {
        Ok(_) => Ok(order.into()),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn list_orders(
    state: tauri::State<'_, AppState>,
    session_id: String,
    tenant_id: String,
    branch_id: String,
    status: Option<String>,
    page: Option<i64>,
    page_size: Option<i64>,
    order_number: Option<i64>,
    created_date: Option<String>,
) -> Result<Page<OrderView>, String> {
    let _s = crate::auth::require_session(&state, &session_id)?;

    let client = crate::db::mongo_client(&state.mongo_uri);
    let db = crate::db::database(&client, &state.db_name);
    let col = orders_col(&db);

    let mut filter = doc! {"tenant_id": &tenant_id, "branch_id": &branch_id};

    if let Some(status_str) = status.clone() {
        if !status_str.is_empty() {
            filter.insert("status", status_str);
        }
    }

    if let Some(num) = order_number {
        filter.insert("order_number", num);
    }

    if let Some(date_str) = created_date.clone() {
        if let Ok(date) = chrono::NaiveDate::parse_from_str(&date_str, "%Y-%m-%d") {
            let start = date.and_hms_opt(0, 0, 0).unwrap();
            let end   = date.and_hms_opt(23, 59, 59).unwrap();
            let start_sys: std::time::SystemTime = start.and_local_timezone(chrono::Local).unwrap().into();
            let end_sys:   std::time::SystemTime = end.and_local_timezone(chrono::Local).unwrap().into();
            let start_bson = mongodb::bson::DateTime::from_system_time(start_sys);
            let end_bson   = mongodb::bson::DateTime::from_system_time(end_sys);
            filter.insert("created_at", doc! {"$gte": start_bson, "$lte": end_bson});
        }
    }

    let page = page.unwrap_or(1).max(1);
    let size = page_size.unwrap_or(3).clamp(1, 200);
    let skip = (page - 1) * size;

    let total = col.count_documents(filter.clone()).run().map_err(|e| e.to_string())? as i64;

    let mut cursor = col
        .find(filter)
        .skip(skip as u64)
        .limit(size as i64)
        .sort(doc! {"created_at": -1})
        .run()
        .map_err(|e| e.to_string())?;

    let mut out: Vec<OrderView> = Vec::new();
    while let Some(doc_res) = cursor.next() {
        let o = doc_res.map_err(|e| e.to_string())?;
        out.push(o.into());
    }

    Ok(Page { data: out, total, page, page_size: size })
}


#[tauri::command]
pub fn update_order_status(
    state: tauri::State<'_, AppState>,
    session_id: String,
    order_id: String,
    status: String,
) -> Result<OrderView, String> {
    let _s = crate::auth::require_session(&state, &session_id)?;
    let id = ObjectId::parse_str(&order_id).map_err(|_| "order_id inválido")?;

    let client = crate::db::mongo_client(&state.mongo_uri);
    let db = crate::db::database(&client, &state.db_name);
    let col = orders_col(&db);

    // Acepta alias comunes:
    // PENDING, DISPATCHED->DELIVERED, CANCELED->CANCELLED (inglés británico)
    let status_enum = match status.as_str() {
        "PENDING" => crate::db::OrderStatus::PENDING,
        "DELIVERED" | "DISPATCHED" => crate::db::OrderStatus::DELIVERED,
        "CANCELLED" | "CANCELED" => crate::db::OrderStatus::CANCELLED,
        // Si quieres soportar los intermedios:
        "IN_PROGRESS" => crate::db::OrderStatus::IN_PROGRESS,
        "READY" => crate::db::OrderStatus::READY,
        _ => return Err("Estado inválido".into()),
    };

    let set_doc = doc!{
        "status": mongodb::bson::to_bson(&status_enum).unwrap(),
        "updated_at": now_dt(),
    };

    let res = col
        .find_one_and_update(
            doc!{"_id": &id},
            doc!{"$set": set_doc},
        )
        .return_document(mongodb::options::ReturnDocument::After)
        .run();

    match res {
        Ok(Some(updated)) => Ok(updated.into() ),
        Ok(None) => Err("Pedido no encontrado".into()),
        Err(e) => Err(e.to_string()),
    }
}


#[tauri::command]
pub fn get_order_by_id(
    state: tauri::State<'_, AppState>,
    session_id: String,
    order_id: String
) -> Result<OrderView, String> {
    let _s = crate::auth::require_session(&state, &session_id)?;
    let id = ObjectId::parse_str(&order_id).map_err(|_| "order_id inválido")?;

    let client = crate::db::mongo_client(&state.mongo_uri);
    let db = crate::db::database(&client, &state.db_name);
    let col = orders_col(&db);

    let o = col
        .find_one(doc!{"_id": id})
        .run()
        .map_err(|e| e.to_string())?
        .ok_or("No existe")?;

    Ok(o.into())
}

#[tauri::command]
pub fn print_order_receipt(
    state: tauri::State<'_, AppState>,
    session_id: String,
    order_id: String,
    receipt_type: String,
) -> Result<String, String> {
    let _s = crate::auth::require_session(&state, &session_id)?;
    let id = ObjectId::parse_str(&order_id).map_err(|_| "order_id inválido")?;

    let client = crate::db::mongo_client(&state.mongo_uri);
    let db = crate::db::database(&client, &state.db_name);
    let col = orders_col(&db);

    let order = col
        .find_one(doc!{"_id": id})
        .run()
        .map_err(|e| e.to_string())?
        .ok_or("Pedido no encontrado")?;

    let receipt_content = if receipt_type == "customer" {
        generate_customer_receipt(&order)
    } else {
        generate_kitchen_receipt(&order)
    };

    Ok(receipt_content)
}

fn generate_customer_receipt(order: &Order) -> String {
    let mut receipt = String::new();
    
    receipt.push_str("================================\n");
    receipt.push_str("         EL TITI WINGS         \n");
    receipt.push_str("================================\n");
    receipt.push_str(&format!("Pedido #: {}\n", order.order_number));
    receipt.push_str(&format!("Fecha: {}\n", order.created_at));
    receipt.push_str("--------------------------------\n");
    
    receipt.push_str("PRODUCTO           CANT  PRECIO\n");
    receipt.push_str("--------------------------------\n");
    
    for item in &order.items {
        receipt.push_str(&format!("{:<18} {:>3}  ${:.2}\n", 
            item.name, 
            item.quantity, 
            item.price * item.quantity as f64
        ));
    }
    
    receipt.push_str("--------------------------------\n");
    receipt.push_str(&format!("TOTAL: ${:.2}\n", order.total));
    
    if order.payment_method == crate::db::PaymentMethod::CASH {
        receipt.push_str("--------------------------------\n");
        receipt.push_str(&format!("EFECTIVO: ${:.2}\n", order.cash_amount.unwrap_or(0.0)));
        receipt.push_str(&format!("CAMBIO: ${:.2}\n", order.cash_change.unwrap_or(0.0)));
    }
    
    receipt.push_str("--------------------------------\n");
    
    receipt.push_str(&format!("Método de pago: {:?}\n", order.payment_method));
    
    if let Some(delivery) = &order.delivery {
        receipt.push_str(&format!("Delivery: {}\n", delivery.company));
        if let Some(address) = &delivery.address {
            receipt.push_str(&format!("Dirección: {}\n", address));
        }
        if let Some(phone) = &delivery.phone {
            receipt.push_str(&format!("Teléfono: {}\n", phone));
        }
    }
    
    if let Some(comments) = &order.comments {
        receipt.push_str(&format!("Comentarios: {}\n", comments));
    }
    
    receipt.push_str("================================\n");
    receipt.push_str("      ¡Gracias por su compra!   \n");
    receipt.push_str("================================\n");
    
    receipt
}

fn generate_kitchen_receipt(order: &Order) -> String {
    let mut receipt = String::new();
    
    receipt.push_str("================================\n");
    receipt.push_str("         COCINA - PEDIDO        \n");
    receipt.push_str("================================\n");
    receipt.push_str(&format!("Pedido #: {}\n", order.order_number));
    receipt.push_str(&format!("Fecha: {}\n", order.created_at));
    receipt.push_str("--------------------------------\n");
    
    receipt.push_str("PRODUCTO           CANT  NOTAS\n");
    receipt.push_str("--------------------------------\n");
    
    for item in &order.items {
        receipt.push_str(&format!("{:<18} {:>3}\n", 
            item.name, 
            item.quantity
        ));
    }
    
    receipt.push_str("--------------------------------\n");
    
    if let Some(delivery) = &order.delivery {
        receipt.push_str(&format!("Para delivery: {}\n", delivery.company));
    }
    
    if let Some(comments) = &order.comments {
        receipt.push_str(&format!("Comentarios: {}\n", comments));
    }
    
    receipt.push_str("================================\n");
    
    receipt
}

#[tauri::command]
pub fn delete_order(
    state: tauri::State<'_, AppState>,
    session_id: String,
    order_id: String,
) -> Result<(), String> {
    let _s = crate::auth::require_admin(&state, &session_id)?;
    let id = ObjectId::parse_str(&order_id).map_err(|_| "order_id inválido")?;

    let client = crate::db::mongo_client(&state.mongo_uri);
    let db = crate::db::database(&client, &state.db_name);
    let col = orders_col(&db);

    let res = col.delete_one(doc!{"_id": id}).run();
    match res {
        Ok(_) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}
