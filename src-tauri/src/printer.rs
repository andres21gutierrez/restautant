use serde::{Deserialize, Serialize};
use chrono::Local;
use std::io::Write;
use std::path::Path;

use winprint::printer::{PrinterDevice, PdfiumPrinter};
use winprint::printer::FilePrinter;
use genpdf::{
    Document,
    elements::{Paragraph, Break},
    fonts::{FontData, FontFamily},
    style::Style,
    Alignment,
    Mm,
    Element
};

use mongodb::bson::{doc, oid::ObjectId};
use crate::state::AppState;

#[derive(Serialize)]
pub struct PrinterInfo { pub name: String }

#[derive(Deserialize)]
pub struct PrintOrderReq {
    pub order_id: String,
    pub copy: Option<String>,
    pub printer_name: Option<String>,
    pub serial_port: Option<String>, 
}

const PAPER_WIDTH_MM: f64   = 30.0;
const LINE_HEIGHT_MM: f64   = 5.2;
const BASE_LINES_CLIENT: i32 = 12;
const BASE_LINES_KITCH:  i32 = 7;
const MIN_HEIGHT_MM: f64   = 120.0;
const MAX_HEIGHT_MM: f64   = 600.0; 
const DEFAULT_FONT_PT: i32 = 5; 
const NUMBER_FONT: i32 = 6;

const ORDERED_CATS: [&str; 3] = ["COMIDA", "EXTRAS", "BEBIDA"];


fn estimate_height_client(order: &crate::db::Order) -> f64 {
    let mut lines = BASE_LINES_CLIENT;

    lines += (order.items.len() as i32) * 2;

    lines += 1;
    if order.cash_amount.is_some() { lines += 1; }

    if let Some(ref c) = order.comments {
        if !c.trim().is_empty() {
            lines += 2;
        }
    }

    if let Some(ref d) = order.delivery {
        let mut dl = 2;
        if d.address.as_ref().is_some_and(|s| !s.trim().is_empty()) { dl += 1; }
        if d.phone.as_ref().is_some_and(|s| !s.trim().is_empty()) { dl += 1; }
        lines += dl;
    }

    let mut mm = (lines as f64) * LINE_HEIGHT_MM;
    if mm < MIN_HEIGHT_MM { mm = MIN_HEIGHT_MM; }
    if mm > MAX_HEIGHT_MM { mm = MAX_HEIGHT_MM; }
    mm
}

fn push_multiline(doc: &mut Document, text: &str, bold: bool, align: Option<Alignment>) {
    // Normaliza CRLF de Windows a LF
    let norm = text.replace("\r\n", "\n");

    for line in norm.split('\n') {
        if line.is_empty() {
            // Línea en blanco explícita -> un espacio vertical
            doc.push(Break::new(1));
            continue;
        }

        let mut p = Paragraph::new(line.to_string());
        if let Some(a) = align { p = p.aligned(a); }

        doc.push(p);
    }
}

fn estimate_height_kitchen(order: &crate::db::Order) -> f64 {
    let mut lines = BASE_LINES_KITCH;

    // Por ítem: 1 línea (solo “• nombre xN”)
    lines += order.items.len() as i32;

    // Observaciones (si hay): 2–3 líneas típicas
    if let Some(ref c) = order.comments {
        if !c.trim().is_empty() {
            lines += 3;
        }
    }

    let mut mm = (lines as f64) * LINE_HEIGHT_MM;
    if mm < MIN_HEIGHT_MM { mm = MIN_HEIGHT_MM; }
    if mm > MAX_HEIGHT_MM { mm = MAX_HEIGHT_MM; }
    mm
}

enum CopyKind { Kitchen, Client }
impl CopyKind {
    fn from_str(s: Option<String>) -> Self {
        match s.as_deref() {
            Some("KITCHEN") => CopyKind::Kitchen,
            _ => CopyKind::Client,
        }
    }
}

fn to_money(n: f64) -> String { format!("Bs {:.2}", n) }

fn load_font_family() -> FontFamily<FontData> {
    const SEARCH_DIRS: &[&str] = &[
        "src-tauri/assets/fonts",
        "src-tauri/resources/fonts",
        "resources/fonts",
        "assets/fonts",
        "fonts",
        ".",
    ];

    fn try_load(file: &str, dirs: &[&str]) -> Option<FontData> {
        for dir in dirs {
            let path = format!("{}/{}", dir, file);
            if Path::new(&path).exists() {
                if let Ok(fd) = FontData::load(&path, None) {
                    return Some(fd);
                }
            }
        }
        None
    }

    let regular = try_load("Roboto-Regular.ttf", SEARCH_DIRS)
        .unwrap_or_else(|| panic!(
            "No se encontró 'Roboto-Regular.ttf' en {:?}. Coloca la fuente ahí o ajusta SEARCH_DIRS.",
            SEARCH_DIRS
        ));

    let bold = try_load("Roboto-Bold.ttf", SEARCH_DIRS)
        .unwrap_or_else(|| panic!(
            "No se encontró 'Roboto-Bold.ttf' (necesaria para Style::bold()). \
             Ponla junto a la Regular o evita usar .bold()."
        ));

    let italic      = try_load("Roboto-Italic.ttf", SEARCH_DIRS).unwrap_or_else(|| regular.clone());
    let bold_italic = try_load("Roboto-BoldItalic.ttf", SEARCH_DIRS).unwrap_or_else(|| bold.clone());

    FontFamily {
        regular,
        bold,
        italic,
        bold_italic,
    }
}

fn render_ticket_pdf_client(order: &crate::db::Order) -> Result<Vec<u8>, String> {
    let mut doc = Document::new(load_font_family());
    let mut decorator = genpdf::SimplePageDecorator::new();
    decorator.set_margins(genpdf::Margins::trbl(1, 6, 5, 0));

    doc.set_minimal_conformance();

    doc.set_font_size(NUMBER_FONT as u8);

    let height = estimate_height_client(order);
    doc.set_paper_size((Mm::from(PAPER_WIDTH_MM), Mm::from(height)));
    doc.set_page_decorator(decorator);

    let dt = Local::now().format("%d/%m/%Y %H:%M").to_string();
    doc.push(Paragraph::new(format!("Pedido: {}", order.order_number)).styled(Style::new().bold()));
    doc.push(Break::new(1));
    doc.set_font_size(DEFAULT_FONT_PT as u8);
    doc.push(Paragraph::new("EL TITI WINGS").aligned(Alignment::Center).styled(Style::new().bold()));
    
    doc.push(Paragraph::new(dt).aligned(Alignment::Center));
    doc.push(Break::new(1));

    doc.push(Paragraph::new("Detalle:").styled(Style::new().bold()));
    doc.push(Break::new(1));
    for it in &order.items {
        let nombre = format!("- {}   x{}", it.name, it.quantity);
        let subtotal = it.price * it.quantity as f64;
        let fila2 = format!("  {} (c/u Bs {:.2})", to_money(subtotal), it.price);
        doc.push(Paragraph::new(nombre));
        doc.push(Paragraph::new(fila2));
    }
    doc.push(Break::new(1));

    doc.push(
        Paragraph::new(format!("TOTAL: {}", to_money(order.total)))
            .aligned(Alignment::Right)
            .styled(Style::new().bold())
    );

    doc.push(Break::new(1));

    let pm = match order.payment_method {
        crate::db::PaymentMethod::CASH => "EFECTIVO",
        crate::db::PaymentMethod::CARD => "TARJETA",
        crate::db::PaymentMethod::QR   => "QR",
    };
    doc.push(Paragraph::new(format!("Pago: {}", pm)));
    if let Some(ca) = order.cash_amount {
        let cg = order.cash_change.unwrap_or(0.0);
        doc.push(Paragraph::new(format!("Recibido: {}  |  Cambio: {}", to_money(ca), to_money(cg))));
    }

    if let Some(ref c) = order.comments {
        if !c.trim().is_empty() {
            doc.push(Break::new(1));
            doc.push(Paragraph::new("Observaciones").styled(Style::new().bold()));
            push_multiline(&mut doc, c.trim(), false, None);
        }
    }

    if let Some(ref d) = order.delivery {
        doc.push(Break::new(1));
        doc.push(Paragraph::new("Delivery").styled(Style::new().bold()));
        doc.push(Paragraph::new(format!("Empresa: {}", d.company)));
        if let Some(addr) = d.address.as_ref().map(|s| s.trim()).filter(|s| !s.is_empty()) {
            doc.push(Paragraph::new(format!("Dirección: {}", addr)));
        }
        if let Some(phone) = d.phone.as_ref().map(|s| s.trim()).filter(|s| !s.is_empty()) {
            doc.push(Paragraph::new(format!("Telf: {}", phone)));
        }
    }

    let mut bytes = Vec::new();
    doc.render(&mut bytes).map_err(|e| e.to_string())?;
    Ok(bytes)
}

fn render_ticket_pdf_kitchen(order: &crate::db::Order) -> Result<Vec<u8>, String> {
    let mut doc = Document::new(load_font_family());
    let mut decorator = genpdf::SimplePageDecorator::new();
    decorator.set_margins(genpdf::Margins::trbl(1, 6, 5, 0));

    doc.set_minimal_conformance();

    doc.set_font_size(NUMBER_FONT as u8);

    let height = estimate_height_kitchen(order);
    doc.set_paper_size((Mm::from(PAPER_WIDTH_MM), Mm::from(height)));
    doc.set_page_decorator(decorator);

    let dt = Local::now().format("%d/%m/%Y %H:%M").to_string();
    doc.push(Paragraph::new(format!("Pedido: {}", order.order_number)).styled(Style::new().bold()));
    doc.push(Break::new(1));
    doc.set_font_size(DEFAULT_FONT_PT as u8);
    doc.push(Paragraph::new("COCINA").aligned(Alignment::Center).styled(Style::new().bold()));
    doc.push(Paragraph::new(dt).aligned(Alignment::Center));

    for cat in ORDERED_CATS {
        let mut any = false;

        for it in order.items.iter().filter(|it| it.category.eq_ignore_ascii_case(cat)) {
            if !any {
                doc.push(Break::new(1));
                doc.push(Paragraph::new(&*cat).styled(Style::new().bold()));
                any = true;
            }
            doc.push(Paragraph::new(format!("• {}   x{}", it.name, it.quantity)).styled(Style::new().bold()));
        }
    }
    if let Some(ref c) = order.comments {
        let c = c.trim();
        if !c.is_empty() {
            doc.push(Break::new(1));
            doc.push(Paragraph::new("OBSERVACIONES").styled(Style::new().bold()));
            push_multiline(&mut doc, c, false, None);
        }
    }

    let mut bytes = Vec::new();
    doc.render(&mut bytes).map_err(|e| e.to_string())?;
    Ok(bytes)
}


fn escpos_init(out: &mut Vec<u8>) { out.extend_from_slice(&[0x1B, 0x40]); }
fn escpos_center(out: &mut Vec<u8>) { out.extend_from_slice(&[0x1B, 0x61, 0x01]); }
fn escpos_left(out: &mut Vec<u8>) { out.extend_from_slice(&[0x1B, 0x61, 0x00]); }
fn escpos_cut(out: &mut Vec<u8>) { out.extend_from_slice(&[0x1D, 0x56, 0x42, 0x10]); }

fn render_ticket_escpos_client(order: &crate::db::Order) -> Vec<u8> {
    let mut out = Vec::new();
    escpos_init(&mut out);
    escpos_center(&mut out);
    out.extend_from_slice(b"EL TITI WINGS\n");
    out.extend_from_slice(format!("Pedido N°{}\n", order.order_number).as_bytes());
    escpos_left(&mut out);
    out.extend_from_slice(b"------------------------------\n");

    for it in &order.items {
        out.extend_from_slice(format!("{} x{}\n", it.name, it.quantity).as_bytes());
        let subtotal = it.price * it.quantity as f64;
        out.extend_from_slice(format!("  {} (c/u Bs {:.2})\n", to_money(subtotal), it.price).as_bytes());
    }
    out.extend_from_slice(b"------------------------------\n");
    out.extend_from_slice(format!("TOTAL: {}\n", to_money(order.total)).as_bytes());

    let pm = match order.payment_method {
        crate::db::PaymentMethod::CASH => "EFECTIVO",
        crate::db::PaymentMethod::CARD => "TARJETA",
        crate::db::PaymentMethod::QR   => "QR",
    };
    out.extend_from_slice(format!("Pago: {}\n", pm).as_bytes());
    if let Some(ca) = order.cash_amount {
        let cg = order.cash_change.unwrap_or(0.0);
        out.extend_from_slice(format!("Recibido: {}  Cambio: {}\n", to_money(ca), to_money(cg)).as_bytes());
    }

    if let Some(ref c) = order.comments {
        let c = c.trim();
        if !c.is_empty() {
            out.extend_from_slice(b"Obs: ");
            out.extend_from_slice(c.as_bytes());
            out.extend_from_slice(b"\n");
        }
    }

    out.extend_from_slice(b"\n\n");
    escpos_cut(&mut out);
    out
}

fn render_ticket_escpos_kitchen(order: &crate::db::Order) -> Vec<u8> {
    let mut out = Vec::new();
    escpos_init(&mut out);
    escpos_center(&mut out);
    out.extend_from_slice(b"COCINA\n");
    out.extend_from_slice(format!("Pedido #{}\n", order.order_number).as_bytes());
    escpos_left(&mut out);
    out.extend_from_slice(b"------------------------------\n");

    out.extend_from_slice(b"Preparar:\n");
    for it in &order.items {
        out.extend_from_slice(format!("• {} x{}\n", it.name, it.quantity).as_bytes());
    }

    if let Some(ref c) = order.comments {
        let c = c.trim();
        if !c.is_empty() {
            out.extend_from_slice(b"\nOBSERVACIONES:\n");
            out.extend_from_slice(c.as_bytes());
            out.extend_from_slice(b"\n");
        }
    }

    out.extend_from_slice(b"\n\n");
    escpos_cut(&mut out);
    out
}


#[tauri::command]
pub fn list_printers_cmd() -> Result<Vec<PrinterInfo>, String> {
    let list = PrinterDevice::all().map_err(|e| e.to_string())?;
    Ok(list.into_iter().map(|p| PrinterInfo { name: p.name().to_string() }).collect())
}

#[tauri::command]
pub fn print_order_ticket(
    state: tauri::State<'_, AppState>,
    session_id: String,
    req: PrintOrderReq,
) -> Result<(), String> {

    let _s = crate::auth::require_session(&state, &session_id)?;
    let client = crate::db::mongo_client(&state.mongo_uri);
    let db = crate::db::database(&client, &state.db_name);
    let col = crate::db::orders_col(&db);

    let oid = ObjectId::parse_str(&req.order_id).map_err(|_| "order_id inválido")?;
    let order = col.find_one(doc!{"_id": &oid}).run().map_err(|e| e.to_string())?
        .ok_or("Pedido no encontrado")?;

    let kind = CopyKind::from_str(req.copy);

    if let Some(name) = req.printer_name.clone() {
        if let Ok(list) = PrinterDevice::all() {
            if let Some(dev) = list.into_iter().find(|p| p.name() == name) {
                let pdf_bytes = match kind {
                    CopyKind::Client  => render_ticket_pdf_client(&order)?,
                    CopyKind::Kitchen => render_ticket_pdf_kitchen(&order)?,
                };
                // temp file
                let mut path = std::env::temp_dir();
                let filename = format!("ticket_{}_{}.pdf", order.order_number, Local::now().timestamp());
                path.push(filename);
                std::fs::write(&path, &pdf_bytes).map_err(|e| e.to_string())?;

                let printer = PdfiumPrinter::new(dev);
                match printer.print(&path, Default::default()) {
                    Ok(_) => {
                        let _ = std::fs::remove_file(&path);
                        return Ok(())
                    }
                    Err(e) => {
                        let _ = std::fs::remove_file(&path);
                        if req.serial_port.is_none() {
                            return Err(format!(
                                "No se pudo imprimir en '{}': {}. Selecciona otra impresora o configura un puerto COM.",
                                name, e
                            ));
                        }
                    }
                }
            } else if req.serial_port.is_none() {
                return Err(format!("Impresora '{}' no encontrada. Selecciona otra o usa puerto COM.", name));
            }
        } else if req.serial_port.is_none() {
            return Err("No se pudieron enumerar impresoras de Windows.".into());
        }
    }

    // (2) Fallback COM (ESC/POS)
    if let Some(port) = req.serial_port {
        let bytes = match kind {
            CopyKind::Client  => render_ticket_escpos_client(&order),
            CopyKind::Kitchen => render_ticket_escpos_kitchen(&order),
        };
        let mut sp = serialport::new(port.clone(), 9600)
            .timeout(std::time::Duration::from_millis(1500))
            .open()
            .map_err(|e| format!("No se pudo abrir {}: {}. Selecciona otro puerto o impresora.", port, e))?;
        sp.write_all(&bytes)
            .map_err(|e| format!("Error enviando a {}: {}.", port, e))?;
        return Ok(());
    }

    Err("No se detecta impresora seleccionada ni puerto COM configurado.".into())
}
