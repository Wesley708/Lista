export interface PrimaryTheme {
  id: string;
  name: string;
  mode: 'light' | 'dark';
  canvas: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  text: string;
  textMuted: string;
}

export interface AccentTheme {
  id: string;
  name: string;
  group: 'vivid' | 'pastel';
  accent: string;
  accentHover: string;
  accentFg: string;
  inkLight: string;
  inkDark: string;
}

export const PRIMARY_THEMES: PrimaryTheme[] = [
  // Claros sóbrios
  {
    id: 'papel-neutro',
    name: 'Papel Neutro',
    mode: 'light',
    canvas: '#F6F6F3',
    surface: '#FFFFFF',
    surfaceMuted: '#ECECE7',
    border: '#E2E2DC',
    text: '#18181B',
    textMuted: '#63636B',
  },
  {
    id: 'pedra-fria',
    name: 'Pedra Fria',
    mode: 'light',
    canvas: '#EFF2F5',
    surface: '#FFFFFF',
    surfaceMuted: '#E3E8EE',
    border: '#D5DCE4',
    text: '#111827',
    textMuted: '#5B6472',
  },
  {
    id: 'areia-quente',
    name: 'Areia Sóbria',
    mode: 'light',
    canvas: '#F4F1EA',
    surface: '#FCFBF8',
    surfaceMuted: '#E9E4D8',
    border: '#DED7C8',
    text: '#1C1917',
    textMuted: '#6B645C',
  },
  // Escuros sóbrios
  {
    id: 'grafite',
    name: 'Grafite',
    mode: 'dark',
    canvas: '#111215',
    surface: '#1A1C20',
    surfaceMuted: '#24272D',
    border: '#2D3138',
    text: '#F4F4F5',
    textMuted: '#9CA3AF',
  },
  {
    id: 'ardosia-noite',
    name: 'Ardósia Noite',
    mode: 'dark',
    canvas: '#0E131A',
    surface: '#161E28',
    surfaceMuted: '#202B38',
    border: '#2A3848',
    text: '#F1F5F9',
    textMuted: '#94A3B8',
  },
  {
    id: 'carvao-quente',
    name: 'Carvão Quente',
    mode: 'dark',
    canvas: '#141210',
    surface: '#1E1B18',
    surfaceMuted: '#2A2521',
    border: '#36302B',
    text: '#F5F5F4',
    textMuted: '#A8A29E',
  },
];

export const ACCENT_THEMES: AccentTheme[] = [
  // Cores vivas
  {
    id: 'azul-cobalto',
    name: 'Azul Cobalto',
    group: 'vivid',
    accent: '#2563EB',
    accentHover: '#1D4ED8',
    accentFg: '#FFFFFF',
    inkLight: '#1D4ED8',
    inkDark: '#60A5FA',
  },
  {
    id: 'coral-vivo',
    name: 'Coral Intenso',
    group: 'vivid',
    accent: '#E11D48',
    accentHover: '#BE123C',
    accentFg: '#FFFFFF',
    inkLight: '#BE123C',
    inkDark: '#FB7185',
  },
  {
    id: 'ametista',
    name: 'Roxo Ametista',
    group: 'vivid',
    accent: '#7C3AED',
    accentHover: '#6D28D9',
    accentFg: '#FFFFFF',
    inkLight: '#6D28D9',
    inkDark: '#A78BFA',
  },
  {
    id: 'ambar-vivo',
    name: 'Âmbar Vivo',
    group: 'vivid',
    accent: '#D97706',
    accentHover: '#B45309',
    accentFg: '#FFFFFF',
    inkLight: '#B45309',
    inkDark: '#FBBF24',
  },
  {
    id: 'turquesa',
    name: 'Turquesa Vivo',
    group: 'vivid',
    accent: '#0D9488',
    accentHover: '#0F766E',
    accentFg: '#FFFFFF',
    inkLight: '#0F766E',
    inkDark: '#2DD4BF',
  },
  // Tons pastéis
  {
    id: 'lavanda-pastel',
    name: 'Lavanda Pastel',
    group: 'pastel',
    accent: '#C4B5FD',
    accentHover: '#A78BFA',
    accentFg: '#1E1B4B',
    inkLight: '#6D28D9',
    inkDark: '#DDD6FE',
  },
  {
    id: 'pessego-pastel',
    name: 'Pêssego Pastel',
    group: 'pastel',
    accent: '#FDBA74',
    accentHover: '#FB923C',
    accentFg: '#431407',
    inkLight: '#C2410C',
    inkDark: '#FED7AA',
  },
  {
    id: 'rosa-pastel',
    name: 'Rosa Pastel',
    group: 'pastel',
    accent: '#F9A8D4',
    accentHover: '#F472B6',
    accentFg: '#500724',
    inkLight: '#BE185D',
    inkDark: '#FBCFE8',
  },
  {
    id: 'ceu-pastel',
    name: 'Azul Céu Pastel',
    group: 'pastel',
    accent: '#93C5FD',
    accentHover: '#60A5FA',
    accentFg: '#172554',
    inkLight: '#1D4ED8',
    inkDark: '#BFDBFE',
  },
  {
    id: 'menta-pastel',
    name: 'Menta Pastel',
    group: 'pastel',
    accent: '#86EFAC',
    accentHover: '#4ADE80',
    accentFg: '#052E16',
    inkLight: '#15803D',
    inkDark: '#BBF7D0',
  },
];

export const DEFAULT_PRIMARY_ID = 'papel-neutro';
export const DEFAULT_ACCENT_ID = 'azul-cobalto';
export const PRIMARY_THEME_KEY = 'sacola_primary_theme';
export const ACCENT_THEME_KEY = 'sacola_accent_theme';

export function getPrimaryTheme(id: string | null | undefined): PrimaryTheme {
  return PRIMARY_THEMES.find((t) => t.id === id) ?? PRIMARY_THEMES[0];
}

export function getAccentTheme(id: string | null | undefined): AccentTheme {
  return ACCENT_THEMES.find((t) => t.id === id) ?? ACCENT_THEMES[0];
}

export function applyAppTheme(primaryId: string, accentId: string): void {
  const primary = getPrimaryTheme(primaryId);
  const accent = getAccentTheme(accentId);
  const root = document.documentElement;

  if (primary.mode === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  root.style.setProperty('--sacola-canvas', primary.canvas);
  root.style.setProperty('--sacola-surface', primary.surface);
  root.style.setProperty('--sacola-surface-muted', primary.surfaceMuted);
  root.style.setProperty('--sacola-border', primary.border);
  root.style.setProperty('--sacola-text', primary.text);
  root.style.setProperty('--sacola-text-muted', primary.textMuted);

  root.style.setProperty('--sacola-accent', accent.accent);
  root.style.setProperty('--sacola-accent-hover', accent.accentHover);
  root.style.setProperty('--sacola-accent-fg', accent.accentFg);
  root.style.setProperty(
    '--sacola-accent-ink',
    primary.mode === 'dark' ? accent.inkDark : accent.inkLight
  );
  root.style.setProperty(
    '--sacola-accent-soft',
    primary.mode === 'dark'
      ? `color-mix(in srgb, ${accent.accent} 18%, transparent)`
      : `color-mix(in srgb, ${accent.accent} 14%, transparent)`
  );

  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', primary.mode === 'dark' ? primary.surface : accent.accent);
  }
}
