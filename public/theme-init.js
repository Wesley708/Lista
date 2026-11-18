(function () {
  try {
    var pId = localStorage.getItem('sacola_primary_theme');
    if (!pId) {
      var oldDark = localStorage.getItem('sacola_theme');
      if (oldDark === 'dark') pId = 'grafite';
    }
    var primaries = {
      'papel-neutro': { mode: 'light', c: '#F6F6F3', s: '#FFFFFF', sm: '#ECECE7', b: '#E2E2DC', t: '#18181B', tm: '#63636B' },
      'pedra-fria': { mode: 'light', c: '#EFF2F5', s: '#FFFFFF', sm: '#E3E8EE', b: '#D5DCE4', t: '#111827', tm: '#5B6472' },
      'areia-quente': { mode: 'light', c: '#F4F1EA', s: '#FCFBF8', sm: '#E9E4D8', b: '#DED7C8', t: '#1C1917', tm: '#6B645C' },
      'grafite': { mode: 'dark', c: '#111215', s: '#1A1C20', sm: '#24272D', b: '#2D3138', t: '#F4F4F5', tm: '#9CA3AF' },
      'ardosia-noite': { mode: 'dark', c: '#0E131A', s: '#161E28', sm: '#202B38', b: '#2A3848', t: '#F1F5F9', tm: '#94A3B8' },
      'carvao-quente': { mode: 'dark', c: '#141210', s: '#1E1B18', sm: '#2A2521', b: '#36302B', t: '#F5F5F4', tm: '#A8A29E' }
    };
    var accents = {
      'azul-cobalto': { a: '#2563EB', ah: '#1D4ED8', fg: '#FFFFFF', il: '#1D4ED8', id: '#60A5FA' },
      'coral-vivo': { a: '#E11D48', ah: '#BE123C', fg: '#FFFFFF', il: '#BE123C', id: '#FB7185' },
      'ametista': { a: '#7C3AED', ah: '#6D28D9', fg: '#FFFFFF', il: '#6D28D9', id: '#A78BFA' },
      'ambar-vivo': { a: '#D97706', ah: '#B45309', fg: '#FFFFFF', il: '#B45309', id: '#FBBF24' },
      'turquesa': { a: '#0D9488', ah: '#0F766E', fg: '#FFFFFF', il: '#0F766E', id: '#2DD4BF' },
      'lavanda-pastel': { a: '#C4B5FD', ah: '#A78BFA', fg: '#1E1B4B', il: '#6D28D9', id: '#DDD6FE' },
      'pessego-pastel': { a: '#FDBA74', ah: '#FB923C', fg: '#431407', il: '#C2410C', id: '#FED7AA' },
      'rosa-pastel': { a: '#F9A8D4', ah: '#F472B6', fg: '#500724', il: '#BE185D', id: '#FBCFE8' },
      'ceu-pastel': { a: '#93C5FD', ah: '#60A5FA', fg: '#172554', il: '#1D4ED8', id: '#BFDBFE' },
      'menta-pastel': { a: '#86EFAC', ah: '#4ADE80', fg: '#052E16', il: '#15803D', id: '#BBF7D0' }
    };
    var p = Object.prototype.hasOwnProperty.call(primaries, pId) ? primaries[pId] : primaries['papel-neutro'];
    var aId = localStorage.getItem('sacola_accent_theme');
    var a = Object.prototype.hasOwnProperty.call(accents, aId) ? accents[aId] : accents['azul-cobalto'];
    var r = document.documentElement;
    if (p.mode === 'dark') r.classList.add('dark');
    r.style.setProperty('--sacola-canvas', p.c);
    r.style.setProperty('--sacola-surface', p.s);
    r.style.setProperty('--sacola-surface-muted', p.sm);
    r.style.setProperty('--sacola-border', p.b);
    r.style.setProperty('--sacola-text', p.t);
    r.style.setProperty('--sacola-text-muted', p.tm);
    r.style.setProperty('--sacola-accent', a.a);
    r.style.setProperty('--sacola-accent-hover', a.ah);
    r.style.setProperty('--sacola-accent-fg', a.fg);
    r.style.setProperty('--sacola-accent-ink', p.mode === 'dark' ? a.id : a.il);
    r.style.setProperty('--sacola-accent-soft', 'color-mix(in srgb, ' + a.a + ' 15%, transparent)');
  } catch (e) {
    // Ignore storage read issues in restricted browser contexts
  }
})();
