export function validateNewUser(p) {
  const errors = {};
  if (!p.name || p.name.length < 3) errors.name = "Nombre mínimo 3 caracteres";
  if (!/^[a-zA-Z0-9_.-]{3,32}$/.test(p.username)) errors.username = "Usuario inválido";
  if (!["ADMIN", "SELLER"].includes(p.role)) errors.role = "Rol inválido";
  if (!p.password || p.password.length < 8) errors.password = "Min 8 caracteres";
  return errors;
}
export function validateUpdateUser(p) {
  const errors = {};
  if (p.username && !/^[a-zA-Z0-9_.-]{3,32}$/.test(p.username)) errors.username = "Usuario inválido";
  if (p.new_password && p.new_password.length < 8) errors.new_password = "Min 8 caracteres";
  return errors;
}
