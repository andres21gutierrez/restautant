use mongodb::{
    sync::{Database, Collection},
    bson::{self, doc, oid::ObjectId, Bson, Document},
};

use serde::{Deserialize, Serialize};
use chrono::{Local, NaiveDate};
use std::time::SystemTime;

use crate::db::{now_dt, orders_col, Expense, ExpenseView, NewExpense};
use crate::db::expenses_col;
use crate::state::AppState;

#[derive(Debug, Serialize, Deserialize)]
pub struct Page<T> {
    pub data: Vec<T>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MethodTotal { pub method: String, pub amount: f64 }

#[derive(Debug, Serialize, Deserialize)]
pub struct CategoryTotal { pub category: String, pub amount: f64 }

#[derive(Debug, Serialize, Deserialize)]
pub struct Point { pub date: String, pub amount: f64 }

#[derive(Debug, Serialize, Deserialize)]
pub struct TopProduct { pub name: String, pub qty: i64, pub sales: f64 }

#[derive(Debug, Serialize, Deserialize)]
pub struct SalesOverview {
    pub total_sales: f64,
    pub orders: i64,
    pub avg_ticket: f64,
    pub by_method: Vec<MethodTotal>,
    pub by_category: Vec<CategoryTotal>,
    pub timeseries: Vec<Point>,
    pub top_products: Vec<TopProduct>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProfitLoss {
    pub ingresos: f64,
    pub egresos: f64,
    pub neto: f64,
    pub ingresos_series: Vec<Point>,
    pub egresos_series: Vec<Point>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ExpenseDoc {
    #[serde(rename = "_id")]
    pub id: ObjectId,
    pub tenant_id: String,
    pub branch_id: String,
    pub amount: f64,
    pub description: String,
    pub category: Option<String>,
    pub created_at: bson::DateTime,
    pub date: bson::DateTime,
    pub created_by: Option<String>,
}



#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CashMovement {
    pub kind: String,                 // "IN" | "OUT"
    pub amount: f64,
    pub note: Option<String>,         // nota libre
    pub source: Option<String>,       // "ORDER" | "MANUAL"
    pub ref_order_id: Option<String>, // id del pedido si source="ORDER"
    pub at: bson::DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Denomination {
    pub value: f64,
    pub qty: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CashShift {
    #[serde(rename = "_id")]
    pub id: ObjectId,
    pub tenant_id: String,
    pub branch_id: String,
    pub user_id: String,
    pub username: String,
    pub opened_at: bson::DateTime,
    pub closed_at: Option<bson::DateTime>,
    pub opening_float: f64,
    pub movements: Vec<CashMovement>,
    pub counted: Option<f64>,
    pub denominations: Option<Vec<Denomination>>,
    pub expected: Option<f64>,
    pub difference: Option<f64>,
    pub status: String,
    pub notes: Option<String>,

    pub manual_ins: Option<f64>,
  pub manual_outs: Option<f64>,
  pub cash_sales: Option<f64>,
}

pub(crate) fn cash_shifts_col(db: &Database) -> Collection<CashShift> {
    db.collection::<CashShift>("cash_shifts")
}

fn range_bounds(from_date: &str, to_date: &str) -> Result<(bson::DateTime, bson::DateTime), String> {
    let from = NaiveDate::parse_from_str(from_date, "%Y-%m-%d").map_err(|_| "from_date inválido")?;
    let to   = NaiveDate::parse_from_str(to_date, "%Y-%m-%d").map_err(|_| "to_date inválido")?;
    let s = from.and_hms_opt(0,0,0).unwrap();
    let e = to.and_hms_opt(23,59,59).unwrap();
    let s_sys: SystemTime = s.and_local_timezone(Local).unwrap().into();
    let e_sys: SystemTime = e.and_local_timezone(Local).unwrap().into();
    Ok((bson::DateTime::from_system_time(s_sys), bson::DateTime::from_system_time(e_sys)))
}


#[tauri::command]
pub fn report_sales_overview(
    state: tauri::State<'_, AppState>,
    session_id: String,
    tenant_id: String,
    branch_id: String,
    from_date: String,
    to_date: String  
) -> Result<SalesOverview, String> {
    let _s = crate::auth::require_session(&state, &session_id)?;

    let client = crate::db::mongo_client(&state.mongo_uri);
    let db = crate::db::database(&client, &state.db_name);
    let col = orders_col(&db);

    let (from_bson, to_bson) = range_bounds(&from_date, &to_date)?;

    let base_match = doc! {
        "tenant_id": &tenant_id,
        "branch_id": &branch_id,
        "status": "DELIVERED",
        "created_at": { "$gte": from_bson.clone(), "$lte": to_bson.clone() }
    };

    let kpi_pipeline = vec![
        doc!{ "$match": base_match.clone() },
        doc!{ "$group": { "_id": null, "total_sales": { "$sum": "$total" }, "orders": { "$sum": 1 } } },
        doc!{ "$project": {
            "_id": 0,
            "total_sales": 1,
            "orders": 1,
            "avg_ticket": { "$cond": [{ "$gt": ["$orders", 0] }, { "$divide": ["$total_sales", "$orders"] }, 0] }
        } },
    ];
    let mut total_sales = 0.0_f64; let mut orders = 0_i64; let mut avg_ticket = 0.0_f64;
    let mut cur = col.aggregate(kpi_pipeline).run().map_err(|e| e.to_string())?;
    if let Some(Ok(d)) = cur.next() {
        total_sales = d.get_f64("total_sales").unwrap_or(0.0);
        orders = d.get_i32("orders").unwrap_or(0) as i64;
        avg_ticket = d.get_f64("avg_ticket").unwrap_or(0.0);
    }

    let by_method_pipeline = vec![
        doc!{ "$match": base_match.clone() },
        doc!{ "$group": { "_id": "$payment_method", "amount": { "$sum": "$total" } } },
        doc!{ "$project": { "_id": 0, "method": "$_id", "amount": 1 } },
    ];
    let mut by_method = Vec::<MethodTotal>::new();
    for r in col.aggregate(by_method_pipeline).run().map_err(|e| e.to_string())? {
        let d = r.map_err(|e| e.to_string())?;
        by_method.push(MethodTotal {
            method: d.get_str("method").unwrap_or("UNK").to_string(),
            amount: d.get_f64("amount").unwrap_or(0.0),
        });
    }

    let by_category_pipeline = vec![
        doc!{ "$match": base_match.clone() },
        doc!{ "$unwind": "$items" },
        doc!{ "$addFields": { "item_oid": { "$toObjectId": "$items.product_id" } } },
        doc!{ "$lookup": {
            "from": "products",
            "localField": "item_oid",
            "foreignField": "_id",
            "as": "prod"
        }},
        doc!{ "$unwind": "$prod" },
        doc!{ "$group": {
            "_id": "$prod.category",
            "amount": { "$sum": { "$multiply": ["$items.price", "$items.quantity"] } }
        }},
        doc!{ "$project": { "_id": 0, "category": "$_id", "amount": 1 } },
    ];
    let mut by_category = Vec::<CategoryTotal>::new();
    for r in col.aggregate(by_category_pipeline).run().map_err(|e| e.to_string())? {
        let d = r.map_err(|e| e.to_string())?;
        by_category.push(CategoryTotal {
            category: d.get_str("category").unwrap_or("SIN_CAT").to_string(),
            amount: d.get_f64("amount").unwrap_or(0.0),
        });
    }

    let timeseries_pipeline = vec![
        doc!{ "$match": base_match.clone() },
        doc!{ "$group": {
            "_id": {
                "y": { "$year": "$created_at" },
                "m": { "$month": "$created_at" },
                "d": { "$dayOfMonth": "$created_at" },
            },
            "amount": { "$sum": "$total" }
        }},
        doc!{ "$sort": { "_id.y": 1, "_id.m": 1, "_id.d": 1 } },
        doc!{ "$project": {
            "_id": 0,
            "date": { "$concat": [
                { "$toString": "$_id.y" }, "-",
                { "$toString": { "$cond":[{ "$lt": ["$_id.m",10]}, { "$concat": ["0", { "$toString": "$_id.m"}]}, { "$toString": "$_id.m"} ] }}, "-",
                { "$toString": { "$cond":[{ "$lt": ["$_id.d",10]}, { "$concat": ["0", { "$toString": "$_id.d"}]}, { "$toString": "$_id.d"} ] }}
            ]},
            "amount": 1
        }},
    ];
    let mut timeseries = Vec::<Point>::new();
    for r in col.aggregate(timeseries_pipeline).run().map_err(|e| e.to_string())? {
        let d = r.map_err(|e| e.to_string())?;
        timeseries.push(Point {
            date: d.get_str("date").unwrap_or("").to_string(),
            amount: d.get_f64("amount").unwrap_or(0.0),
        });
    }

    let top_products_pipeline = vec![
        doc!{ "$match": base_match },
        doc!{ "$unwind": "$items" },
        doc!{ "$group": {
            "_id": "$items.name",
            "qty": { "$sum": "$items.quantity" },
            "sales": { "$sum": { "$multiply": ["$items.price", "$items.quantity"] } }
        }},
        doc!{ "$sort": { "qty": -1 } },
        doc!{ "$limit": 10 },
        doc!{ "$project": { "_id": 0, "name": "$_id", "qty": 1, "sales": 1 } },
    ];
    let mut top_products = Vec::<TopProduct>::new();
    for r in col.aggregate(top_products_pipeline).run().map_err(|e| e.to_string())? {
        let d = r.map_err(|e| e.to_string())?;
        top_products.push(TopProduct {
            name: d.get_str("name").unwrap_or("").to_string(),
            qty: d.get_i32("qty").unwrap_or(0) as i64,
            sales: d.get_f64("sales").unwrap_or(0.0),
        });
    }

    Ok(SalesOverview { total_sales, orders, avg_ticket, by_method, by_category, timeseries, top_products })
}

#[tauri::command]
pub fn report_profit_and_loss(
    state: tauri::State<'_, AppState>,
    session_id: String,
    tenant_id: String,
    branch_id: String,
    from_date: String,
    to_date: String,
) -> Result<ProfitLoss, String> {
    let _s = crate::auth::require_session(&state, &session_id)?;
    let client = crate::db::mongo_client(&state.mongo_uri);
    let db = crate::db::database(&client, &state.db_name);
    let orders = orders_col(&db);
    let expenses = expenses_col(&db);

    let (from_bson, to_bson) = range_bounds(&from_date, &to_date)?;

    let inc_match = doc! {
        "tenant_id": &tenant_id,
        "branch_id": &branch_id,
        "status": "DELIVERED",
        "created_at": { "$gte": from_bson.clone(), "$lte": to_bson.clone() }
    };

    let inc_total_pipeline = vec![
        doc!{ "$match": inc_match.clone() },
        doc!{ "$group": { "_id": null, "amount": { "$sum": "$total" } } },
    ];
    let mut ingresos = 0.0_f64;
    let mut cur = orders.aggregate(inc_total_pipeline).run().map_err(|e| e.to_string())?;
    if let Some(Ok(d)) = cur.next() {
        ingresos = d.get_f64("amount").unwrap_or(0.0);
    }

    let inc_series_pipeline = vec![
        doc!{ "$match": inc_match },
        doc!{ "$group": {
            "_id": {
                "y": { "$year": "$created_at" },
                "m": { "$month": "$created_at" },
                "d": { "$dayOfMonth": "$created_at" },
            },
            "amount": { "$sum": "$total" }
        }},
        doc!{ "$sort": { "_id.y": 1, "_id.m": 1, "_id.d": 1 } },
        doc!{ "$project": {
            "_id": 0,
            "date": { "$concat": [
                { "$toString": "$_id.y" }, "-",
                { "$toString": { "$cond":[{ "$lt": ["$_id.m",10]}, { "$concat": ["0", { "$toString": "$_id.m"}]}, { "$toString": "$_id.m"} ] }}, "-",
                { "$toString": { "$cond":[{ "$lt": ["$_id.d",10]}, { "$concat": ["0", { "$toString": "$_id.d"}]}, { "$toString": "$_id.d"} ] }}
            ]},
            "amount": 1
        }},
    ];
    let mut ingresos_series = Vec::<Point>::new();
    for r in orders.aggregate(inc_series_pipeline).run().map_err(|e| e.to_string())? {
        let d = r.map_err(|e| e.to_string())?;
        ingresos_series.push(Point {
            date: d.get_str("date").unwrap_or("").to_string(),
            amount: d.get_f64("amount").unwrap_or(0.0),
        });
    }

    let eg_match = doc!{
        "tenant_id": &tenant_id,
        "branch_id": &branch_id,
        "date": { "$gte": from_bson, "$lte": to_bson }
    };

    let eg_total_pipeline = vec![
        doc!{ "$match": eg_match.clone() },
        doc!{ "$group": { "_id": null, "amount": { "$sum": "$amount" } } },
    ];
    let mut egresos = 0.0_f64;
    let mut cur2 = expenses.aggregate(eg_total_pipeline).run().map_err(|e| e.to_string())?;
    if let Some(Ok(d)) = cur2.next() {
        egresos = d.get_f64("amount").unwrap_or(0.0);
    }

    let eg_series_pipeline = vec![
        doc!{ "$match": eg_match },
        doc!{ "$group": {
            "_id": {
                "y": { "$year": "$date" },
                "m": { "$month": "$date" },
                "d": { "$dayOfMonth": "$date" },
            },
            "amount": { "$sum": "$amount" }
        }},
        doc!{ "$sort": { "_id.y": 1, "_id.m": 1, "_id.d": 1 } },
        doc!{ "$project": {
            "_id": 0,
            "date": { "$concat": [
                { "$toString": "$_id.y" }, "-",
                { "$toString": { "$cond":[{ "$lt": ["$_id.m",10]}, { "$concat": ["0", { "$toString": "$_id.m"}]}, { "$toString": "$_id.m"} ] }}, "-",
                { "$toString": { "$cond":[{ "$lt": ["$_id.d",10]}, { "$concat": ["0", { "$toString": "$_id.d"}]}, { "$toString": "$_id.d"} ] }}
            ]},
            "amount": 1
        }},
    ];
    let mut egresos_series = Vec::<Point>::new();
    for r in expenses.aggregate(eg_series_pipeline).run().map_err(|e| e.to_string())? {
        let d = r.map_err(|e| e.to_string())?;
        egresos_series.push(Point {
            date: d.get_str("date").unwrap_or("").to_string(),
            amount: d.get_f64("amount").unwrap_or(0.0),
        });
    }

    Ok(ProfitLoss {
        ingresos,
        egresos,
        neto: ingresos - egresos,
        ingresos_series,
        egresos_series
    })
}

#[tauri::command]
pub fn expense_create(
    state: tauri::State<'_, AppState>,
    session_id: String,
    payload: NewExpense,
) -> Result<ExpenseView, String> {
    let _s = crate::auth::require_session(&state, &session_id)?;
    
    let client = crate::db::mongo_client(&state.mongo_uri);
    let db = crate::db::database(&client, &state.db_name);
    let col = crate::db::expenses_col(&db);

    let e = crate::db::Expense {
        id: ObjectId::new(),
        tenant_id: payload.tenant_id,
        branch_id: payload.branch_id,
        description: payload.description,
        amount: payload.amount,
        created_at: crate::db::now_dt(),
        updated_at: crate::db::now_dt(),
    };

    col.insert_one(&e).run().map_err(|e| e.to_string())?;

    Ok(e.into())
}

#[tauri::command]
pub fn expense_delete(
    state: tauri::State<'_, AppState>,
    session_id: String,
    expense_id: String
) -> Result<(), String> {
    let _s = crate::auth::require_admin(&state, &session_id)?;
    let id = ObjectId::parse_str(&expense_id).map_err(|_| "expense_id inválido")?;
    let client = crate::db::mongo_client(&state.mongo_uri);
    let db = crate::db::database(&client, &state.db_name);
    let col = expenses_col(&db);
    col.delete_one(doc!{ "_id": id }).run().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn expenses_list(
    state: tauri::State<'_, AppState>,
    session_id: String,
    tenant_id: String,
    branch_id: String,
    from_date: String,
    to_date: String,
    page: Option<i64>,
    page_size: Option<i64>,
) -> Result<Page<Expense>, String> {
    let _s = crate::auth::require_session(&state, &session_id)?;
    let (from_bson, to_bson) = range_bounds(&from_date, &to_date)?;
    let client = crate::db::mongo_client(&state.mongo_uri);
    let db = crate::db::database(&client, &state.db_name);
    let col = expenses_col(&db);

    let filter = doc!{
        "tenant_id": &tenant_id,
        "branch_id": &branch_id,
        "date": { "$gte": from_bson, "$lte": to_bson }
    };

    let page = page.unwrap_or(1).max(1);
    let size = page_size.unwrap_or(20).clamp(1, 200);
    let skip = (page - 1) * size;

    let total = col.count_documents(filter.clone()).run().map_err(|e| e.to_string())? as i64;
    let mut cursor = col
        .find(filter)
        .skip(skip as u64)
        .limit(size as i64)
        .sort(doc!{"date": -1, "_id": -1})
        .run()
        .map_err(|e| e.to_string())?;

    let mut out: Vec<Expense> = Vec::new();
    while let Some(doc_res) = cursor.next() {
        let e = doc_res.map_err(|e| e.to_string())?;
        out.push(e);
    }

    Ok(Page { data: out, total, page, page_size: size })
}


#[tauri::command]
pub fn cash_open_shift(
    state: tauri::State<'_, AppState>,
    session_id: String,
    tenant_id: String,
    branch_id: String,
    opening_float: f64,
) -> Result<String, String> {
    let s = crate::auth::require_session(&state, &session_id)?;
    if opening_float < 0.0 { return Err("Monto de apertura inválido".into()); }

    let client = crate::db::mongo_client(&state.mongo_uri);
    let db = crate::db::database(&client, &state.db_name);
    let col = cash_shifts_col(&db);

    let exists = col
        .find_one(doc!{
            "tenant_id": &tenant_id,
            "branch_id": &branch_id,
            "status": "OPEN"
        })
        .run()
        .map_err(|e| e.to_string())?;
    if exists.is_some() {
        return Err("Ya existe una caja abierta".into());
    }

    let shift = CashShift {
        id: ObjectId::new(),
        tenant_id,
        branch_id,
        user_id: s.user_id.clone(),
        username: s.username.clone(),
        opened_at: now_dt(),
        closed_at: None,
        opening_float,
        movements: vec![],
        counted: None,
        denominations: None,
        expected: None,
        difference: None,
        status: "OPEN".to_string(),
        notes: None,

        manual_ins: None,
        manual_outs: None,
        cash_sales: None,
    };

    col.insert_one(&shift).run().map_err(|e| e.to_string())?;
    Ok(shift.id.to_hex())
}


#[tauri::command]
pub fn cash_get_active_shift(
    state: tauri::State<'_, AppState>,
    session_id: String,
    tenant_id: String,
    branch_id: String,
) -> Result<Option<CashShift>, String> {
    let _s = crate::auth::require_session(&state, &session_id)?;
    let client = crate::db::mongo_client(&state.mongo_uri);
    let db = crate::db::database(&client, &state.db_name);
    let col = cash_shifts_col(&db);

    let sh = col
        .find_one(doc!{
            "tenant_id": &tenant_id,
            "branch_id": &branch_id,
            "status": "OPEN"
        })
        .run()
        .map_err(|e| e.to_string())?;
    Ok(sh)
}

#[tauri::command]
pub fn cash_register_movement(
  state: tauri::State<'_, AppState>,
  session_id: String,
  shift_id: String,
  kind: String,
  amount: f64,
  note: Option<String>,
) -> Result<(), String> {
  let _s = crate::auth::require_session(&state, &session_id)?;
  if !matches!(kind.as_str(), "IN" | "OUT") { return Err("kind inválido".into()); }
  if amount <= 0.0 { return Err("Monto inválido".into()); }

  let id = ObjectId::parse_str(&shift_id).map_err(|_| "shift_id inválido")?;
  let client = crate::db::mongo_client(&state.mongo_uri);
  let db = crate::db::database(&client, &state.db_name);
  let col = cash_shifts_col(&db);

  let mv = CashMovement {
    kind,
    amount,
    note,
    at: crate::db::now_dt(),
    source: Some("MANUAL".to_string()),
    ref_order_id: None,
  };

  col.update_one(
      doc!{"_id": &id, "status": "OPEN"},
      doc!{"$push": {"movements": mongodb::bson::to_bson(&mv).unwrap()}}
  ).run().map_err(|e| e.to_string())?;

  Ok(())
}

#[tauri::command]
pub fn cash_close_shift(
  state: tauri::State<'_, AppState>,
  session_id: String,
  shift_id: String,
  denominations: Vec<Denomination>,
  notes: Option<String>,
) -> Result<CashShift, String> {
  let _s = crate::auth::require_session(&state, &session_id)?;
  let id = ObjectId::parse_str(&shift_id).map_err(|_| "shift_id inválido")?;

  let client = crate::db::mongo_client(&state.mongo_uri);
  let db = crate::db::database(&client, &state.db_name);
  let col = cash_shifts_col(&db);

  let mut sh = col
    .find_one(doc!{"_id": &id, "status": "OPEN"})
    .run()
    .map_err(|e| e.to_string())?
    .ok_or("Caja no encontrada o ya cerrada")?;

  let now = crate::db::now_dt();

  // 1) Ventas en EFECTIVO desde apertura a ahora (ORDERS, resiliente)
  let orders = crate::db::orders_col(&db);
  let cash_sales_pipeline = vec![
    doc!{ "$match": {
      "tenant_id": &sh.tenant_id,
      "branch_id": &sh.branch_id,
      "status": "DELIVERED",
      "payment_method": "CASH",   // ⬅️ efectivo
      "created_at": { "$gte": sh.opened_at.clone(), "$lte": now.clone() }
    }},
    doc!{ "$group": { "_id": null, "amount": { "$sum": "$total" } } }
  ];
  let mut cash_sales = 0.0_f64;
  let mut cur = orders.aggregate(cash_sales_pipeline).run().map_err(|e| e.to_string())?;
  if let Some(Ok(d)) = cur.next() {
    cash_sales = d.get_f64("amount").unwrap_or(0.0);
  }

  // 2) Sumar SOLO movimientos MANUALES
  let mut manual_ins  = 0.0_f64;
  let mut manual_outs = 0.0_f64;
  for m in &sh.movements {
    if m.source.as_deref() == Some("MANUAL") {
      match m.kind.as_str() {
        "IN"  => manual_ins  += m.amount,
        "OUT" => manual_outs += m.amount,
        _ => {}
      }
    }
  }

  // 3) Contado y esperado
  let expected = sh.opening_float + cash_sales + manual_ins - manual_outs;
  let counted: f64 = denominations.iter().map(|d| d.value * (d.qty as f64)).sum();
  let difference = counted - expected;

  // 4) Persistir cierre con métricas
  sh.closed_at     = Some(now.clone());
  sh.denominations = Some(denominations);
  sh.counted       = Some(counted);
  sh.expected      = Some(expected);
  sh.difference    = Some(difference);
  sh.status        = "CLOSED".to_string();
  sh.notes         = notes;

  // auditoría opción B
  sh.manual_ins    = Some(manual_ins);
  sh.manual_outs   = Some(manual_outs);
  sh.cash_sales    = Some(cash_sales);

  col.replace_one(doc!{"_id": &id}, &sh).run().map_err(|e| e.to_string())?;
  Ok(sh)
}

#[tauri::command]
pub fn cash_list_shifts(
    state: tauri::State<'_, AppState>,
    session_id: String,
    tenant_id: String,
    branch_id: String,
    from_date: String,
    to_date: String,
    page: Option<i64>,
    page_size: Option<i64>,
) -> Result<Page<CashShift>, String> {
    let _s = crate::auth::require_session(&state, &session_id)?;
    let (from_bson, to_bson) = range_bounds(&from_date, &to_date)?;
    let client = crate::db::mongo_client(&state.mongo_uri);
    let db = crate::db::database(&client, &state.db_name);
    let col = cash_shifts_col(&db);

    let filter = doc! {
        "tenant_id": &tenant_id,
        "branch_id": &branch_id,
        "opened_at": { "$gte": from_bson, "$lte": to_bson }
    };

    let page = page.unwrap_or(1).max(1);
    let size = page_size.unwrap_or(20).clamp(1, 200);
    let skip = (page - 1) * size;

    let total = col
        .count_documents(filter.clone())
        .run()
        .map_err(|e| e.to_string())? as i64;

    let mut cursor = col
        .find(filter)
        .skip(skip as u64)
        .limit(size as i64)
        .sort(doc! { "opened_at": -1, "_id": -1 })
        .run()
        .map_err(|e| e.to_string())?;

    let mut out: Vec<CashShift> = Vec::new();
    while let Some(doc_res) = cursor.next() {
        let mut s = doc_res.map_err(|e| e.to_string())?;

        let mut ingresos = 0.0_f64;
        let mut egresos = 0.0_f64;

        for m in &s.movements {
            if m.kind == "IN" {
                ingresos += m.amount;
            } else if m.kind == "OUT" {
                egresos += m.amount;
            }
        }

        s.manual_ins = Some(ingresos);
        s.manual_outs = Some(egresos);

        out.push(s);
    }

    Ok(Page {
        data: out,
        total,
        page,
        page_size: size,
    })
}


#[derive(Debug, Serialize, Deserialize)]
pub struct MonthPnL {
  pub month: String,    // "2025-01", ...
  pub ingresos: f64,
  pub egresos: f64,
  pub neto: f64,
}

#[tauri::command]
pub fn report_monthly_pnl(
    state: tauri::State<'_, AppState>,
    session_id: String,
    tenant_id: String,
    branch_id: String,
    year: i32,
) -> Result<Vec<MonthPnL>, String> {
    let _s = crate::auth::require_session(&state, &session_id)?;
    let client = crate::db::mongo_client(&state.mongo_uri);
    let db = crate::db::database(&client, &state.db_name);

    let orders = orders_col(&db);
    let expenses = expenses_col(&db);

    // Ingresos por mes
    let inc_pipeline = vec![
        doc!{ "$match": {
          "tenant_id": &tenant_id,
          "branch_id": &branch_id,
          "status": "DELIVERED",
          "$expr": { "$eq": [{ "$year": "$created_at" }, year] }
        }},
        doc!{ "$group": {
          "_id": { "m": { "$month": "$created_at" } },
          "amount": { "$sum": "$total" }
        }},
        doc!{ "$project": {
          "_id": 0, "m": "$_id.m", "amount": 1
        }},
    ];
    let mut inc_by_m = [0f64; 13]; // 1..12
    for r in orders.aggregate(inc_pipeline).run().map_err(|e| e.to_string())? {
        let d = r.map_err(|e| e.to_string())?;
        let m = d.get_i32("m").unwrap_or(0) as usize;
        if m >=1 && m <= 12 {
            inc_by_m[m] = d.get_f64("amount").unwrap_or(0.0);
        }
    }

    // Egresos por mes
    let eg_pipeline = vec![
        doc!{ "$match": {
          "tenant_id": &tenant_id,
          "branch_id": &branch_id,
          "$expr": { "$eq": [{ "$year": "$date" }, year] }
        }},
        doc!{ "$group": {
          "_id": { "m": { "$month": "$date" } },
          "amount": { "$sum": "$amount" }
        }},
        doc!{ "$project": {
          "_id": 0, "m": "$_id.m", "amount": 1
        }},
    ];
    let mut eg_by_m = [0f64; 13];
    for r in expenses.aggregate(eg_pipeline).run().map_err(|e| e.to_string())? {
        let d = r.map_err(|e| e.to_string())?;
        let m = d.get_i32("m").unwrap_or(0) as usize;
        if m >=1 && m <= 12 {
            eg_by_m[m] = d.get_f64("amount").unwrap_or(0.0);
        }
    }

    let mut out = Vec::with_capacity(12);
    for m in 1..=12 {
        let ingresos = inc_by_m[m];
        let egresos = eg_by_m[m];
        let neto = ingresos - egresos;
        out.push(MonthPnL {
            month: format!("{:04}-{:02}", year, m),
            ingresos, egresos, neto
        });
    }

    Ok(out)
}

fn num_as_f64(b: &Bson) -> f64 {
    match b {
        Bson::Double(x) => *x,
        Bson::Int32(i)  => *i as f64,
        Bson::Int64(i)  => *i as f64,
        Bson::Decimal128(d) => d.to_string().parse::<f64>().unwrap_or(0.0),
        _ => 0.0,
    }
}


#[tauri::command]
pub fn cash_list_shifts_enriched(
    state: tauri::State<'_, AppState>,
    session_id: String,
    tenant_id: String,
    branch_id: String,
    from_date: String,
    to_date: String,
    page: Option<i64>,
    page_size: Option<i64>,
) -> Result<Page<mongodb::bson::Document>, String> {
    let _s = crate::auth::require_session(&state, &session_id)?;
    let (from_bson, to_bson) = range_bounds(&from_date, &to_date)?;

    let client = crate::db::mongo_client(&state.mongo_uri);
    let db = crate::db::database(&client, &state.db_name);
    let shifts = cash_shifts_col(&db);

    let page = page.unwrap_or(1).max(1);
    let size = page_size.unwrap_or(20).clamp(1, 200);
    let skip = (page - 1) * size;

    // Para total simple (sin enrichment)
    let base_filter = doc! {
        "tenant_id": &tenant_id,
        "branch_id": &branch_id,
        "opened_at": { "$gte": from_bson.clone(), "$lte": to_bson.clone() }
    };
    let total = shifts.count_documents(base_filter.clone())
        .run()
        .map_err(|e| e.to_string())? as i64;

    // Aggregation con unwind/lookup/regroup
    let pipeline = vec![
        doc!{ "$match": base_filter },
        doc!{ "$sort": { "opened_at": -1, "_id": -1 } },
        doc!{ "$skip": skip as i64 },
        doc!{ "$limit": size as i64 },

        // 1 movimiento por fila
        doc!{ "$unwind": { "path": "$movements", "preserveNullAndEmptyArrays": true } },

        // ref_oid = ObjectId(ref_order_id) si viene; sino null
        doc!{ "$addFields": {
            "ref_oid": {
                "$cond": [
                    { "$and": [
                        { "$ne": ["$movements.ref_order_id", null] },
                        { "$ne": ["$movements.ref_order_id", ""] }
                    ]},
                    { "$toObjectId": "$movements.ref_order_id" },
                    null
                ]
            }
        }},

        // lookup contra orders por _id == ref_oid, proyectando solo lo necesario
        doc!{ "$lookup": {
            "from": "orders",
            "let": { "oid": "$ref_oid" },
            "pipeline": [
                { "$match": { "$expr": { "$eq": ["$_id", "$$oid"] } } },
                { "$project": {
                    "_id": 1,
                    "order_number": 1,
                    "payment_method": 1,
                    "cash_amount": 1,
                    "cash_change": 1,
                    "items": 1,
                    "total": 1,
                    "created_at": 1,
                    "status": 1
                }}
            ],
            "as": "orderDoc"
        }},

        // movement_enriched = movimiento + (order = first(orderDoc) o null)
        doc!{ "$addFields": {
            "movement_enriched": {
                "$mergeObjects": [
                    "$movements",
                    { "order": { "$cond": [
                        { "$gt": [ { "$size": "$orderDoc" }, 0 ] },
                        { "$first": "$orderDoc" },
                        null
                    ]}}
                ]
            }
        }},

        doc!{ "$group": {
            "_id": "$_id",
            "tenant_id": { "$first": "$tenant_id" },
            "branch_id": { "$first": "$branch_id" },
            "user_id": { "$first": "$user_id" },
            "username": { "$first": "$username" },
            "opened_at": { "$first": "$opened_at" },
            "closed_at": { "$first": "$closed_at" },
            "opening_float": { "$first": "$opening_float" },
            "counted": { "$first": "$counted" },
            "denominations": { "$first": "$denominations" },
            "expected": { "$first": "$expected" },
            "difference": { "$first": "$difference" },
            "status": { "$first": "$status" },
            "notes": { "$first": "$notes" },
            "manual_ins": { "$first": "$manual_ins" },
            "manual_outs": { "$first": "$manual_outs" },
            "cash_sales": { "$first": "$cash_sales" },
            "movements": { "$push": "$movement_enriched" }
        }},
        doc!{ "$sort": { "opened_at": -1, "_id": -1 } },
    ];

    let mut cur = shifts.aggregate(pipeline).run().map_err(|e| e.to_string())?;

    let mut out: Vec<Document> = Vec::new();
    while let Some(doc_res) = cur.next() {
        let mut d: Document = doc_res.map_err(|e| e.to_string())?;

        let mut ingresos = 0.0_f64;
        let mut egresos  = 0.0_f64;

        if let Some(Bson::Array(movs)) = d.get("movements") {
            for mv in movs {
                if let Bson::Document(mdoc) = mv {
                    let kind   = mdoc.get_str("kind").unwrap_or("");
                    let amount = mdoc.get("amount").map(num_as_f64).unwrap_or(0.0);
                    if kind == "IN"  { ingresos += amount; }
                    if kind == "OUT" { egresos  += amount; }
                }
            }
        }

        d.insert("manual_ins",  Bson::Double(ingresos));
        d.insert("manual_outs", Bson::Double(egresos));

        out.push(d);
    }

    Ok(Page {
        data: out,
        total,
        page,
        page_size: size
    })
}
