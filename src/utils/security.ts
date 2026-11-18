export const MAX_BACKUP_FILE_BYTES = 2 * 1024 * 1024;
export const INVITE_CODE_REGEX = /^[A-Z0-9]{8,16}$/;

const CONTROL_AND_BIDI_REGEX = /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g;
const EMAIL_PATTERN = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const FORBIDDEN_JSON_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export function sanitizeText(raw: unknown, maxLength: number): string {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(CONTROL_AND_BIDI_REGEX, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

export function sanitizeShareLine(raw: unknown, maxLength: number): string {
  return sanitizeText(raw, maxLength);
}

export function redactPII(text: string): string {
  return text.replace(EMAIL_PATTERN, '[e-mail oculto]');
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
