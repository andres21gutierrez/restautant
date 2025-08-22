export function money(n) {
  if (isNaN(n)) return "Bs 0.00";
  return `Bs ${Number(n).toFixed(2)}`;
}
