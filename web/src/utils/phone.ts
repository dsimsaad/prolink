/** Normalize a Pakistani mobile number to 03XXXXXXXXX (11 digits for DB storage), or return null. */
export function normalizePakistaniMobilePhone(value: string): string | null {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("0092")) digits = digits.slice(4);
  else if (digits.startsWith("92")) digits = digits.slice(2);
  else if (digits.startsWith("3") && digits.length === 10) digits = "0" + digits;
  if (!/^03[0-57]\d{8}$/.test(digits)) return null;
  return digits;
}

/** Check if value is a valid 11-digit Pakistani mobile number starting with an active prefix (030-035, 037). */
export function isValidPakistaniMobilePhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return /^03[0-57]\d{8}$/.test(digits);
}

/** Sanitize phone input on the fly: non-digits stripped and max 11 chars. */
export function sanitizePakistaniPhoneInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, 11);
}

/** Format a Pakistani mobile number for display as 03XX-XXXXXXX. */
export function formatPakistaniMobilePhone(value: string | null | undefined): string {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  }
  return value;
}
