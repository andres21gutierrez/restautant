use mongodb::{
    sync::{Client, Database, Collection},
    bson::{doc, oid::ObjectId, DateTime},
};
use serde::{Serialize, Deserialize};
use std::time::{SystemTime, UNIX_EPOCH};
use crate::state::Role;
use mongodb::options::IndexOptions;
use mongodb::IndexModel;
use anyhow::anyhow;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    #[serde(rename = "_id")]
    pub id: ObjectId,
    pub tenant_id: String,
    pub branch_id: String,
    pub name: String,
    pub username: String,
    pub role: Role,
    pub active: bool,
    pub password_hash: String,
    pub created_at: DateTime,
    pub updated_at: DateTime,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewUser {
    pub tenant_id: String,
    pub branch_id: String,
    pub name: String,
    pub username: String,
    pub role: Role,
    pub password: String,
    pub active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct UpdateUser {
    pub name: Option<String>,
    pub username: Option<String>,
    pub role: Option<Role>,
    pub active: Option<bool>,
    pub new_password: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserView {
    pub id: String,
    pub tenant_id: String,
    pub branch_id: String,
    pub name: String,
    pub username: String,
    pub role: Role,
    pub active: bool,
    pub created_at: i64,
    pub updated_at: i64,
}

impl From<User> for UserView {
    fn from(u: User) -> Self {
        let created_secs = u.created_at.to_system_time()
            .duration_since(UNIX_EPOCH).unwrap().as_secs() as i64;
        let updated_secs = u.updated_at.to_system_time()
            .duration_since(UNIX_EPOCH).unwrap().as_secs() as i64;

        Self {
            id: u.id.to_hex(),
            tenant_id: u.tenant_id,
            branch_id: u.branch_id,
            name: u.name,
            username: u.username,
            role: u.role,
            active: u.active,
            created_at: created_secs,
            updated_at: updated_secs,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Product {
    #[serde(rename = "_id")]
    pub id: ObjectId,
    pub tenant_id: String,
    pub branch_id: String,
    pub name: String,
    pub photo_base64: String,
    /// Costo de fabricación (nuevo)
    pub cost: f64,
    /// Precio de venta (ya existente)
    pub price: f64,
    pub description: String,
    pub category: String,
    pub created_at: DateTime,
    pub updated_at: DateTime,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewProduct {
    pub tenant_id: String,
    pub branch_id: String,
    pub name: String,
    pub photo_base64: String,
    /// Costo de fabricación (nuevo)
    pub cost: f64,
    /// Precio de venta (ya existente)
    pub price: f64,
    pub description: String,
    pub category: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct UpdateProduct {
    pub name: Option<String>,
    pub photo_base64: Option<String>,
    /// Costo de fabricación (nuevo)
    pub cost: Option<f64>,
    /// Precio de venta (ya existente)
    pub price: Option<f64>,
    pub description: Option<String>,
    pub category: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductView {
    pub id: String,
    pub tenant_id: String,
    pub branch_id: String,
    pub name: String,
    pub photo_base64: String,
    /// Costo de fabricación (nuevo)
    pub cost: f64,
    /// Precio de venta (ya existente)
    pub price: f64,
    pub description: String,
    pub category: String,
    pub created_at: i64,
    pub updated_at: i64,
}

impl From<Product> for ProductView {
    fn from(p: Product) -> Self {
        let created_secs = p.created_at.to_system_time()
            .duration_since(UNIX_EPOCH).unwrap().as_secs() as i64;
        let updated_secs = p.updated_at.to_system_time()
            .duration_since(UNIX_EPOCH).unwrap().as_secs() as i64;

        Self {
            id: p.id.to_hex(),
            tenant_id: p.tenant_id,
            branch_id: p.branch_id,
            name: p.name,
            photo_base64: p.photo_base64,
            cost: p.cost,
            price: p.price,
            description: p.description,
            category: p.category,
            created_at: created_secs,
            updated_at: updated_secs,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum PaymentMethod {
    CASH,
    CARD,
    QR,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum OrderStatus {
    PENDING,
    IN_PROGRESS,
    READY,
    DELIVERED,
    CANCELLED,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrderItem {
    pub product_id: String,
    pub name: String,
    /// Se mantiene price como precio de venta en orden
    pub price: f64,
    pub quantity: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Order {
    #[serde(rename = "_id")]
    pub id: ObjectId,
    pub tenant_id: String,
    pub branch_id: String,
    pub order_number: i32,
    pub items: Vec<OrderItem>,
    pub total: f64,
    pub payment_method: PaymentMethod,
    pub cash_amount: Option<f64>,
    pub cash_change: Option<f64>,
    pub delivery: Option<DeliveryInfo>,
    pub comments: Option<String>,
    pub status: OrderStatus,
    pub created_at: DateTime,
    pub updated_at: DateTime,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeliveryInfo {
    pub company: String,
    pub address: Option<String>,
    pub phone: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewOrder {
    pub tenant_id: String,
    pub branch_id: String,
    pub items: Vec<NewOrderItem>,
    pub payment_method: PaymentMethod,
    pub cash_amount: Option<f64>,
    pub delivery: Option<NewDeliveryInfo>,
    pub comments: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewOrderItem {
    pub product_id: String,
    pub quantity: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewDeliveryInfo {
    pub company: String,
    pub address: Option<String>,
    pub phone: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct UpdateOrder {
    pub status: Option<OrderStatus>,
    pub comments: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrderView {
    pub id: String,
    pub tenant_id: String,
    pub branch_id: String,
    pub order_number: i32,
    pub items: Vec<OrderItemView>,
    pub total: f64,
    pub payment_method: PaymentMethod,
    pub cash_amount: Option<f64>,
    pub cash_change: Option<f64>,
    pub delivery: Option<DeliveryInfoView>,
    pub comments: Option<String>,
    pub status: OrderStatus,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrderItemView {
    pub product_id: String,
    pub name: String,
    /// Precio de venta (se mantiene)
    pub price: f64,
    pub quantity: i32,
    pub subtotal: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeliveryInfoView {
    pub company: String,
    pub address: Option<String>,
    pub phone: Option<String>,
}

impl From<Order> for OrderView {
    fn from(o: Order) -> Self {
        let created_secs = o.created_at.to_system_time()
            .duration_since(UNIX_EPOCH).unwrap().as_secs() as i64;
        let updated_secs = o.updated_at.to_system_time()
            .duration_since(UNIX_EPOCH).unwrap().as_secs() as i64;

        let items: Vec<OrderItemView> = o.items.into_iter().map(|item| {
            OrderItemView {
                product_id: item.product_id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                subtotal: item.price * item.quantity as f64,
            }
        }).collect();

        let delivery = o.delivery.map(|d| DeliveryInfoView {
            company: d.company,
            address: d.address,
            phone: d.phone,
        });

        Self {
            id: o.id.to_hex(),
            tenant_id: o.tenant_id,
            branch_id: o.branch_id,
            order_number: o.order_number,
            items,
            total: o.total,
            payment_method: o.payment_method,
            cash_amount: o.cash_amount,
            cash_change: o.cash_change,
            delivery,
            comments: o.comments,
            status: o.status,
            created_at: created_secs,
            updated_at: updated_secs,
        }
    }
}

pub fn mongo_client(uri: &str) -> Client {
    Client::with_uri_str(uri).expect("Mongo connection failed")
}

pub fn database(client: &Client, name: &str) -> Database {
    client.database(name)
}

pub fn users_col(db: &Database) -> Collection<User> {
    db.collection::<User>("users")
}

pub fn products_col(db: &Database) -> Collection<Product> {
    db.collection::<Product>("products")
}

pub fn orders_col(db: &Database) -> Collection<Order> {
    db.collection::<Order>("orders")
}

pub fn ensure_user_indexes(db: &Database) -> anyhow::Result<()> {
    let col = users_col(db);

    let idx = IndexModel::builder()
        .keys(doc! { "tenant_id": 1, "branch_id": 1, "username": 1 })
        .options(
            IndexOptions::builder()
                .unique(true)
                .name(Some("uniq_tenant_branch_username".to_string()))
                .build(),
        )
        .build();

    col.create_index(idx).run()?;
    Ok(())
}

pub fn now_dt() -> DateTime {
    DateTime::now()
}

pub fn bootstrap_default_admin(db: &Database) -> anyhow::Result<()> {
    let col = users_col(db);

    let count = col.count_documents(doc!{}).run()?;
    if count > 0 {
        return Ok(());
    }

    let hash = crate::auth::hash_password("admin123")
        .map_err(|e| anyhow!(e))?;

    let user = User {
        id: ObjectId::new(),
        tenant_id: "ELTITI1".to_string(),
        branch_id: "SUCURSAL1".to_string(),
        name: "Administrador".to_string(),
        username: "admin".to_string(),
        role: Role::ADMIN,
        active: true,
        password_hash: hash,
        created_at: now_dt(),
        updated_at: now_dt(),
    };

    col.insert_one(user).run()?;
    Ok(())
}
