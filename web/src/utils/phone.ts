/** Normalize a Pakistani mobile number to 03XX-XXXXXXX, or return null. */
export function normalizePakistaniMobilePhone(value: string): string | null {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("0092")) digits = digits.slice(4);
  else if (digits.startsWith("92")) digits = digits.slice(2);
  if (!/^03\d{9}$/.test(digits)) return null;
  return `${digits.slice(0, 4)}-${digits.slice(4)}`;
}
