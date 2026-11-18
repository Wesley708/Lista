export const MAX_BACKUP_FILE_BYTES = 2 * 1024 * 1024;
export const INVITE_CODE_REGEX = /^[A-Z0-9]{8,16}$/;
export const MAX_ITEM_QUANTITY = 10000;
export const MIN_ITEM_QUANTITY = 0.1;
export const MAX_MONEY_AMOUNT = 1000000;

const CONTROL_AND_BIDI_REGEX = /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g;
const EMAIL_PATTERN = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const BEARER_PATTERN = /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi;
const SENSITIVE_PARAM_PATTERN = /([?&](?:key|token|access_token|id_token|code|convite)=)[^&\s#]+/gi;
const FORBIDDEN_JSON_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export function sanitizeText(raw: unknown, maxLength: number): string {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(CONTROL_AND_BIDI_REGEX, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

export function sanitizeOptionalText(raw: unknown, maxLength: number): string | undefined {
  const clean = sanitizeText(raw, maxLength);
  return clean || undefined;
}

export function sanitizeShareLine(raw: unknown, maxLength: number): string {
  return sanitizeText(raw, maxLength);
}

export function redactPII(text: string): string {
  return text
    .replace(EMAIL_PATTERN, '[e-mail oculto]')
    .replace(BEARER_PATTERN, 'Bearer [token oculto]')
    .replace(SENSITIVE_PARAM_PATTERN, '$1[oculto]');
}

export function parseBoundedPrice(rawText: string): number | null {
  const cleaned = sanitizeText(rawText, 16).replace(',', '.');
  if (!cleaned) return null;
  const val = Number(cleaned);
  if (!Number.isFinite(val) || val < 0) return null;
  return Math.min(MAX_MONEY_AMOUNT, Number(val.toFixed(2)));
}

export function parseBoundedBudget(rawText: string): number | null {
  const cleaned = sanitizeText(rawText, 16).replace(',', '.');
  if (!cleaned) return null;
  const val = Number(cleaned);
  if (!Number.isFinite(val) || val <= 0) return null;
  return Math.min(MAX_MONEY_AMOUNT, Number(val.toFixed(2)));
}

export function parseBoundedQuantity(raw: unknown, fallback = 1): number {
  const val = typeof raw === 'number' ? raw : Number(String(raw ?? '').replace(',', '.'));
  if (!Number.isFinite(val) || val <= 0) return fallback;
  return Math.min(MAX_ITEM_QUANTITY, Math.max(MIN_ITEM_QUANTITY, Number(val.toFixed(2))));
}

export function isPlainRecord(val: unknown): val is Record<string, unknown> {
  if (typeof val !== 'object' || val === null || Array.isArray(val)) {
    return false;
  }
  const proto = Object.getPrototypeOf(val);
  return proto === Object.prototype || proto === null;
}

function stripUnsafeKeys(value: unknown, depth = 0): unknown {
  if (depth > 16) {
    throw new Error('Estrutura JSON excede a profundidade permitida.');
  }
  if (Array.isArray(value)) {
    return value.map((item) => stripUnsafeKeys(item, depth + 1));
  }
  if (typeof value === 'object' && value !== null) {
    const clean: Record<string, unknown> = {};
    for (const key of Object.keys(value)) {
      if (FORBIDDEN_JSON_KEYS.has(key)) continue;
      clean[key] = stripUnsafeKeys((value as Record<string, unknown>)[key], depth + 1);
    }
    return clean;
  }
  return value;
}

export function safeJsonParse(jsonText: string, maxBytes = MAX_BACKUP_FILE_BYTES): unknown {
  if (typeof jsonText !== 'string' || jsonText.length === 0 || jsonText.length > maxBytes) {
    throw new Error('Conteúdo JSON inválido ou maior que o permitido.');
  }
  const parsed: unknown = JSON.parse(jsonText, (key, value) => {
    if (FORBIDDEN_JSON_KEYS.has(key)) {
      return undefined;
    }
    return value;
  });
  return stripUnsafeKeys(parsed);
}

export function normalizeInviteCode(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 16);
}

export function extractInviteCode(raw: string): string {
  const trimmed = raw.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      const paramCode = parsed.searchParams.get('convite');
      if (paramCode) {
        return normalizeInviteCode(paramCode);
      }
    } catch {
      // fall through to regex/normalize
    }
  }
  const match = trimmed.match(/[?&]convite=([A-Za-z0-9_-]{1,32})/i);
  if (match?.[1]) {
    return normalizeInviteCode(match[1]);
  }
  return normalizeInviteCode(trimmed);
}

export function isValidInviteCodeFormat(code: string): boolean {
  return INVITE_CODE_REGEX.test(code);
}

export function getSafeInviteUrl(inviteCode: string): string {
  const cleanCode = normalizeInviteCode(inviteCode);
  if (!isValidInviteCodeFormat(cleanCode)) return '';
  try {
    const { protocol, origin, pathname } = window.location;
    if (protocol !== 'https:' && protocol !== 'http:') return '';
    const safePath = pathname.endsWith('/index.html')
      ? pathname.slice(0, -'index.html'.length)
      : pathname;
    return `${origin}${safePath || '/'}?convite=${encodeURIComponent(cleanCode)}`;
  } catch {
    return '';
  }
}
