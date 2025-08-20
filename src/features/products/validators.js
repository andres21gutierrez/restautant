export function validateNewProduct(p) {
  const errors = {};
  if (!p.name || p.name.length < 3) errors.name = "Nombre mínimo 3 caracteres";
  if (!p.photo_base64) errors.photo_base64 = "Foto requerida";
  if (!p.price || isNaN(p.price) || p.price <= 0) errors.price = "Precio inválido";
  if (!p.description || p.description.length < 3) errors.description = "Descripción mínima 3 caracteres";
  if (!["BEBIDA", "COMIDA", "EXTRAS"].includes(p.category)) errors.category = "Categoría requerida";
  return errors;
}
export function validateUpdateProduct(p) {
  const errors = {};
  if (p.name && p.name.length < 3) errors.name = "Nombre mínimo 3 caracteres";
  if (p.price && (isNaN(p.price) || p.price <= 0)) errors.price = "Precio inválido";
  if (p.description && p.description.length < 3) errors.description = "Descripción mínima 3 caracteres";
  if (p.category && !["BEBIDA", "COMIDA", "EXTRAS"].includes(p.category)) errors.category = "Categoría inválida";
  return errors;
}