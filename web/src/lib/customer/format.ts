const pkrFormatter = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
  maximumFractionDigits: 0,
});

const karachiDateFormatter = new Intl.DateTimeFormat("en-PK", {
  timeZone: "Asia/Karachi",
  day: "numeric",
  month: "short",
  year: "numeric",
});

const karachiDateTimeFormatter = new Intl.DateTimeFormat("en-PK", {
  timeZone: "Asia/Karachi",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

export function formatPkr(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) {
    return "Open budget";
  }
  return pkrFormatter.format(Number(amount));
}

export function formatBudgetRange(
  min: number | null | undefined,
  max: number | null | undefined
): string {
  const hasMin = min !== null && min !== undefined && !Number.isNaN(Number(min));
  const hasMax = max !== null && max !== undefined && !Number.isNaN(Number(max));

  if (hasMin && hasMax) {
    if (Number(min) === Number(max)) {
      return formatPkr(Number(min));
    }
    return `${formatPkr(Number(min))} – ${formatPkr(Number(max))}`;
  }
  if (hasMin) {
    return `From ${formatPkr(Number(min))}`;
  }
  if (hasMax) {
    return `Up to ${formatPkr(Number(max))}`;
  }
  return "Open budget (quotes requested)";
}

export function formatKarachiDate(iso: string | null | undefined): string {
  if (!iso) {
    return "—";
  }
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }
  return karachiDateFormatter.format(parsed);
}

export function formatKarachiDateTime(iso: string | null | undefined): string {
  if (!iso) {
    return "—";
  }
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }
  return karachiDateTimeFormatter.format(parsed);
}

export function formatEtaMinutes(etaMinutes: number): string {
  if (etaMinutes < 60) {
    return `${etaMinutes} mins`;
  }
  const hours = Math.floor(etaMinutes / 60);
  const mins = etaMinutes % 60;
  if (mins === 0) {
    return hours === 1 ? "1 hour" : `${hours} hours`;
  }
  return `${hours}h ${mins}m`;
}

export function normalizePakistaniPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("923") && digits.length === 12) {
    return "0" + digits.slice(2);
  }
  if (digits.startsWith("3") && digits.length === 10) {
    return "0" + digits;
  }
  return digits;
}

export function isValidPakistaniPhone(phone: string): boolean {
  return /^03[0-9]{9}$/.test(phone);
}

export function formatPakistaniPhoneDisplay(phone: string | null | undefined): string {
  if (!phone) {
    return "Not set";
  }
  const clean = normalizePakistaniPhone(phone);
  if (clean.length === 11) {
    return `${clean.slice(0, 4)}-${clean.slice(4)}`;
  }
  return phone;
}
