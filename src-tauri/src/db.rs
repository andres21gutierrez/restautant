use mongodb::{Client, Database};

pub async fn get_db() -> mongodb::error::Result<Database> {
    let client = Client::with_uri_str("mongodb://127.0.0.1:27017/").await?;
    Ok(client.database("holabebe"))
}