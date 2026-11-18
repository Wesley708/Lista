import {
  CatalogSuggestion,
  CategoryId,
  CategoryMeta,
  Recipe,
  ShoppingList,
  UnitType,
} from '../types/shopping';

export const CATEGORIES: CategoryMeta[] = [
  { id: 'hortifruti', label: 'Hortifruti', order: 1 },
  { id: 'padaria', label: 'Padaria', order: 2 },
  { id: 'acougue', label: 'Açougue & Frios', order: 3 },
  { id: 'laticinios', label: 'Laticínios', order: 4 },
  { id: 'mercearia', label: 'Mercearia', order: 5 },
  { id: 'bebidas', label: 'Bebidas', order: 6 },
  { id: 'limpeza', label: 'Limpeza', order: 7 },
  { id: 'higiene', label: 'Higiene', order: 8 },
  { id: 'outros', label: 'Outros', order: 9 },
];

export const CATEGORY_MAP: Record<CategoryId, CategoryMeta> = CATEGORIES.reduce(
  (acc, cat) => {
    acc[cat.id] = cat;
    return acc;
  },
  {} as Record<CategoryId, CategoryMeta>
);

export const UNITS: { value: UnitType; label: string }[] = [
  { value: 'un', label: 'un' },
  { value: 'kg', label: 'kg' },
  { value: 'g', label: 'g' },
  { value: 'L', label: 'L' },
  { value: 'ml', label: 'ml' },
  { value: 'pct', label: 'pct' },
  { value: 'cx', label: 'cx' },
];

const CATEGORY_KEYWORDS: Record<CategoryId, string[]> = {
  hortifruti: [
    'banana', 'maçã', 'maca', 'laranja', 'limão', 'limao', 'tomate', 'cebola', 'alho',
    'batata', 'cenoura', 'alface', 'rúcula', 'rucula', 'abacate', 'mamão', 'mamao',
    'melancia', 'uva', 'morango', 'abobrinha', 'pepino', 'pimentão', 'pimentao', 'brócolis',
    'brocolis', 'couve', 'cheiro verde', 'cheiro-verde', 'coentro', 'salsa', 'salsinha',
    'cebolinha', 'ovos', 'ovo', 'mandioca', 'aipim', 'abacaxi', 'manga', 'melão', 'melao',
    'kiwi', 'pera', 'pêssego', 'pessego', 'berinjela', 'beterraba', 'chuchu', 'quiabo',
    'cogumelo', 'champignon', 'coco', 'gengibre',
  ],
  padaria: [
    'pão', 'pao', 'bisnaguinha', 'bolo', 'torrada', 'croissant', 'sonho', 'brioche',
    'baguete', 'pão de queijo', 'pao de queijo', 'rosca', 'tapioca', 'panetone',
  ],
  acougue: [
    'frango', 'peito de frango', 'sobrecoxa', 'coxa', 'carne', 'patinho', 'acém', 'acem',
    'picanha', 'alcatra', 'linguiça', 'linguica', 'calabresa', 'paio', 'bife', 'costela',
    'costelinha', 'porco', 'pernil', 'lombo', 'bisteca', 'peixe', 'salmão', 'salmao',
    'tilápia', 'tilapia', 'camarão', 'camarao', 'presunto', 'peito de peru', 'bacon',
    'carne seca', 'carne-seca', 'charque', 'hambúrguer', 'hamburguer', 'salsicha',
  ],
  laticinios: [
    'leite', 'queijo', 'mussarela', 'muçarela', 'parmesão', 'parmesao', 'prato',
    'requeijão', 'requeijao', 'manteiga', 'margarina', 'iogurte', 'creme de leite',
    'leite condensado', 'coalhada', 'ricota', 'cream cheese', 'nata', 'chantilly',
  ],
  mercearia: [
    'arroz', 'feijão', 'feijao', 'macarrão', 'macarrao', 'espaguete', 'lasanha', 'penne',
    'farinha', 'farofa', 'açúcar', 'acucar', 'sal', 'óleo', 'oleo', 'azeite', 'café',
    'cafe', 'molho de tomate', 'extrato', 'milho', 'ervilha', 'atum', 'sardinha',
    'biscoito', 'bolacha', 'aveia', 'granola', 'chocolate', 'achocolatado', 'fermento',
    'vinagre', 'shoyu', 'maionese', 'ketchup', 'mostarda', 'tempero', 'louro',
    'folha de louro', 'orégano', 'oregano', 'pimenta', 'páprica', 'paprica', 'colorau',
    'lentilha', 'grão de bico', 'cuscuz', 'pipoca', 'batata palha', 'mel', 'geleia',
    'amendoim', 'castanha', 'leite de coco', 'azeitona',
  ],
  bebidas: [
    'água', 'agua', 'refrigerante', 'guaraná', 'guarana', 'coca', 'suco', 'cerveja',
    'vinho', 'chá', 'cha', 'energético', 'energetico', 'isotônico', 'isotonico',
    'água de coco', 'agua de coco', 'tônica', 'tonica', 'espumante',
  ],
  limpeza: [
    'detergente', 'sabão', 'sabao', 'amaciante', 'água sanitária', 'agua sanitaria',
    'desinfetante', 'esponja', 'bucha', 'bombril', 'pano', 'saco de lixo', 'papel toalha',
    'álcool', 'alcool', 'multiuso', 'limpa vidro', 'inseticida', 'vassoura', 'rodo',
    'lustra móveis', 'guardanapo',
  ],
  higiene: [
    'papel higiênico', 'papel higienico', 'sabonete', 'shampoo', 'condicionador',
    'pasta de dente', 'creme dental', 'escova de dente', 'fio dental', 'desodorante',
    'absorvente', 'fralda', 'cotonete', 'algodão', 'algodao', 'protetor solar',
    'hidratante', 'lâmina', 'lamina', 'barbear', 'enxaguante',
  ],
  outros: [],
};

const EMOJI_RULES: [string[], string][] = [
  [['banana'], '🍌'],
  [['maçã verde', 'maca verde'], '🍏'],
  [['maçã', 'maca'], '🍎'],
  [['laranja', 'tangerina', 'mexerica'], '🍊'],
  [['limão', 'limao'], '🍋'],
  [['abacaxi'], '🍍'],
  [['manga'], '🥭'],
  [['melancia'], '🍉'],
  [['melão', 'melao'], '🍈'],
  [['uva'], '🍇'],
  [['morango', 'geleia'], '🍓'],
  [['kiwi'], '🥝'],
  [['pera'], '🍐'],
  [['pêssego', 'pessego'], '🍑'],
  [['cereja'], '🍒'],
  [['coco', 'leite de coco', 'água de coco', 'agua de coco'], '🥥'],
  [['abacate'], '🥑'],
  [['tomate', 'molho de tomate', 'extrato', 'ketchup'], '🍅'],
  [['cebola'], '🧅'],
  [['alho'], '🧄'],
  [['batata doce', 'batata-doce'], '🍠'],
  [['batata', 'mandioca', 'aipim'], '🥔'],
  [['cenoura'], '🥕'],
  [['alface', 'rúcula', 'rucula', 'couve', 'repolho', 'espinafre'], '🥬'],
  [['folha de louro', 'louro', 'orégano', 'oregano', 'manjericão', 'manjericao', 'salsa', 'salsinha', 'cebolinha', 'coentro', 'alecrim', 'cheiro verde', 'cheiro-verde', 'tempero'], '🌿'],
  [['pimenta', 'páprica', 'paprica', 'colorau'], '🌶️'],
  [['brócolis', 'brocolis'], '🥦'],
  [['pepino', 'abobrinha', 'quiabo'], '🥒'],
  [['pimentão', 'pimentao'], '🫑'],
  [['berinjela'], '🍆'],
  [['cogumelo', 'champignon'], '🍄'],
  [['milho'], '🌽'],
  [['amendoim', 'castanha', 'nozes'], '🥜'],
  [['ovos', 'ovo'], '🥚'],
  [['pão de queijo', 'pao de queijo'], '🧀'],
  [['pão de forma', 'pao de forma'], '🍞'],
  [['pão', 'pao', 'baguete', 'bisnaguinha', 'torrada'], '🥖'],
  [['bolo'], '🍰'],
  [['croissant'], '🥐'],
  [['tapioca', 'cuscuz'], '🫓'],
  [['frango', 'sobrecoxa', 'coxa'], '🍗'],
  [['linguiça', 'linguica', 'calabresa', 'paio', 'salsicha'], '🌭'],
  [['bacon', 'presunto', 'toucinho', 'peito de peru'], '🥓'],
  [['costela', 'costelinha', 'osso', 'pernil'], '🍖'],
  [['carne', 'picanha', 'patinho', 'alcatra', 'acém', 'acem', 'bife', 'charque', 'lombo', 'porco', 'bisteca'], '🥩'],
  [['camarão', 'camarao'], '🦐'],
  [['peixe', 'salmão', 'salmao', 'tilápia', 'tilapia', 'atum', 'sardinha', 'bacalhau'], '🐟'],
  [['leite', 'creme de leite', 'leite condensado'], '🥛'],
  [['queijo', 'mussarela', 'muçarela', 'parmesão', 'parmesao', 'requeijão', 'requeijao', 'ricota'], '🧀'],
  [['manteiga', 'margarina'], '🧈'],
  [['iogurte', 'aveia', 'granola'], '🥣'],
  [['arroz'], '🍚'],
  [['feijão', 'feijao', 'lentilha', 'grão de bico'], '🫘'],
  [['macarrão', 'macarrao', 'espaguete', 'lasanha', 'penne'], '🍝'],
  [['café', 'cafe'], '☕'],
  [['azeite', 'azeitona', 'óleo', 'oleo'], '🫒'],
  [['vinagre', 'shoyu'], '🍾'],
  [['chocolate', 'achocolatado', 'cacau'], '🍫'],
  [['biscoito', 'bolacha'], '🍪'],
  [['sorvete'], '🍨'],
  [['mel'], '🍯'],
  [['pipoca'], '🍿'],
  [['açúcar', 'acucar', 'sal', 'farinha', 'farofa', 'fermento'], '🧂'],
  [['água com gás', 'agua com gas'], '🫧'],
  [['água', 'agua'], '💧'],
  [['suco'], '🧃'],
  [['refrigerante', 'guaraná', 'guarana', 'coca', 'tônica', 'tonica'], '🥤'],
  [['cerveja'], '🍺'],
  [['vinho'], '🍷'],
  [['espumante', 'champanhe'], '🥂'],
  [['chá', 'cha'], '🫖'],
  [['detergente', 'esponja', 'bucha', 'bombril'], '🧽'],
  [['sabão', 'sabao', 'amaciante', 'desinfetante', 'multiuso', 'limpa vidro'], '🧴'],
  [['água sanitária', 'agua sanitaria', 'álcool', 'alcool'], '🧪'],
  [['saco de lixo', 'lixo'], '🗑️'],
  [['papel higiênico', 'papel higienico', 'papel toalha', 'guardanapo'], '🧻'],
  [['sabonete', 'shampoo', 'condicionador', 'desodorante', 'hidratante', 'protetor solar'], '🧼'],
  [['creme dental', 'pasta de dente', 'escova de dente', 'fio dental', 'enxaguante'], '🪥'],
  [['lâmina', 'lamina', 'barbear'], '🪒'],
  [['carvão', 'carvao', 'fósforo', 'fosforo', 'vela'], '🔥'],
  [['lâmpada', 'lampada'], '💡'],
  [['pilha', 'bateria'], '🔋'],
  [['ração', 'racao', 'pet'], '🐾'],
];

const CATEGORY_DEFAULT_EMOJI: Record<CategoryId, string> = {
  hortifruti: '🥬',
  padaria: '🥖',
  acougue: '🥩',
  laticinios: '🥛',
  mercearia: '🛒',
  bebidas: '🥤',
  limpeza: '🧽',
  higiene: '🧼',
  outros: '📦',
};

export const EMOJI_PRESETS = [
  '🛒', '🍌', '🍎', '🍏', '🍊', '🍋', '🍉', '🍇',
  '🍓', '🍍', '🥭', '🥑', '🥥', '🍅', '🧅', '🧄',
  '🥔', '🥕', '🌽', '🥬', '🥦', '🥒', '🫑', '🍆',
  '🍄', '🌿', '🌶️', '🥚', '🥖', '🍞', '🥐', '🧀',
  '🥛', '🧈', '🥣', '🍗', '🥩', '🍖', '🌭', '🥓',
  '🐟', '🦐', '🍚', '🫘', '🍝', '🫒', '🧂', '☕',
  '🧃', '🥤', '🍺', '🍷', '💧', '🍫', '🍪', '🍯',
  '🍨', '🍿', '🧽', '🧴', '🧪', '🧻', '🧼', '🪥',
  '🗑️', '🔥', '💡', '🐾',
];

export const RECIPE_EMOJI_PRESETS = [
  '🍲', '🥘', '🍛', '🍝', '🍖', '🍗', '🥩', '🥗',
  '🍕', '🌮', '🥪', '🍜', '🍤', '🥐', '🍰', '🍮',
  '🥧', '🍔', '🌭', '🥟', '🥙', '🫕', '🥞', '☕',
];

export function detectCategory(itemName: string): CategoryId {
  const normalized = itemName.trim().toLowerCase();
  if (!normalized) return 'outros';

  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS) as [CategoryId, string[]][]) {
    if (cat === 'outros') continue;
    for (const kw of keywords) {
      if (normalized.includes(kw)) {
        return cat;
      }
    }
  }
  return 'outros';
}

export function detectItemEmoji(itemName: string, category?: CategoryId): string {
  const normalized = itemName.trim().toLowerCase();
  if (normalized) {
    for (const [keywords, emoji] of EMOJI_RULES) {
      for (const kw of keywords) {
        if (normalized.includes(kw)) {
          return emoji;
        }
      }
    }
  }
  const resolvedCat = category ?? detectCategory(itemName);
  return CATEGORY_DEFAULT_EMOJI[resolvedCat] ?? '🛒';
}

export const CATALOG_ITEMS: CatalogSuggestion[] = [
  // Hortifruti
  { name: 'Banana prata', category: 'hortifruti', defaultUnit: 'kg', estimatedPrice: 7.9, emoji: '🍌' },
  { name: 'Tomate italiano', category: 'hortifruti', defaultUnit: 'kg', estimatedPrice: 9.5, emoji: '🍅' },
  { name: 'Cebola', category: 'hortifruti', defaultUnit: 'kg', estimatedPrice: 6.4, emoji: '🧅' },
  { name: 'Alho', category: 'hortifruti', defaultUnit: 'g', estimatedPrice: 8.5, emoji: '🧄' },
  { name: 'Batata inglesa', category: 'hortifruti', defaultUnit: 'kg', estimatedPrice: 6.9, emoji: '🥔' },
  { name: 'Alface crespa', category: 'hortifruti', defaultUnit: 'un', estimatedPrice: 4.5, emoji: '🥬' },
  { name: 'Limão tahiti', category: 'hortifruti', defaultUnit: 'kg', estimatedPrice: 5.8, emoji: '🍋' },
  { name: 'Ovos brancos (12 un)', category: 'hortifruti', defaultUnit: 'cx', estimatedPrice: 12.9, emoji: '🥚' },
  // Padaria
  { name: 'Pão francês', category: 'padaria', defaultUnit: 'un', estimatedPrice: 1.1, emoji: '🥖' },
  { name: 'Pão de forma integral', category: 'padaria', defaultUnit: 'pct', estimatedPrice: 9.9, emoji: '🍞' },
  { name: 'Pão de queijo', category: 'padaria', defaultUnit: 'pct', estimatedPrice: 14.5, emoji: '🧀' },
  // Açougue & Frios
  { name: 'Peito de frango', category: 'acougue', defaultUnit: 'kg', estimatedPrice: 22.9, emoji: '🍗' },
  { name: 'Patinho moído', category: 'acougue', defaultUnit: 'kg', estimatedPrice: 38.9, emoji: '🥩' },
  { name: 'Picanha bovina', category: 'acougue', defaultUnit: 'kg', estimatedPrice: 69.9, emoji: '🥩' },
  { name: 'Linguiça calabresa', category: 'acougue', defaultUnit: 'g', estimatedPrice: 18.9, emoji: '🌭' },
  { name: 'Paio', category: 'acougue', defaultUnit: 'un', estimatedPrice: 14.9, emoji: '🌭' },
  { name: 'Presunto cozido', category: 'acougue', defaultUnit: 'g', estimatedPrice: 11.5, emoji: '🥓' },
  // Laticínios
  { name: 'Leite integral', category: 'laticinios', defaultUnit: 'L', estimatedPrice: 5.4, emoji: '🥛' },
  { name: 'Queijo mussarela', category: 'laticinios', defaultUnit: 'g', estimatedPrice: 16.5, emoji: '🧀' },
  { name: 'Manteiga com sal', category: 'laticinios', defaultUnit: 'un', estimatedPrice: 13.8, emoji: '🧈' },
  { name: 'Requeijão cremoso', category: 'laticinios', defaultUnit: 'un', estimatedPrice: 8.9, emoji: '🧀' },
  { name: 'Iogurte natural', category: 'laticinios', defaultUnit: 'un', estimatedPrice: 4.2, emoji: '🥣' },
  // Mercearia
  { name: 'Arroz tipo 1 (5 kg)', category: 'mercearia', defaultUnit: 'pct', estimatedPrice: 28.9, emoji: '🍚' },
  { name: 'Feijão preto (1 kg)', category: 'mercearia', defaultUnit: 'kg', estimatedPrice: 9.2, emoji: '🫘' },
  { name: 'Feijão carioca (1 kg)', category: 'mercearia', defaultUnit: 'pct', estimatedPrice: 8.5, emoji: '🫘' },
  { name: 'Folha de louro', category: 'mercearia', defaultUnit: 'pct', estimatedPrice: 3.5, emoji: '🌿' },
  { name: 'Café torrado e moído', category: 'mercearia', defaultUnit: 'pct', estimatedPrice: 18.9, emoji: '☕' },
  { name: 'Azeite extra virgem', category: 'mercearia', defaultUnit: 'un', estimatedPrice: 39.9, emoji: '🫒' },
  { name: 'Macarrão espaguete', category: 'mercearia', defaultUnit: 'pct', estimatedPrice: 5.2, emoji: '🍝' },
  { name: 'Molho de tomate', category: 'mercearia', defaultUnit: 'un', estimatedPrice: 3.8, emoji: '🍅' },
  { name: 'Açúcar refinado (1 kg)', category: 'mercearia', defaultUnit: 'pct', estimatedPrice: 5.1, emoji: '🧂' },
  // Bebidas
  { name: 'Água mineral sem gás', category: 'bebidas', defaultUnit: 'L', estimatedPrice: 3.5, emoji: '💧' },
  { name: 'Suco de laranja integral', category: 'bebidas', defaultUnit: 'L', estimatedPrice: 12.9, emoji: '🧃' },
  { name: 'Refrigerante guaraná (2 L)', category: 'bebidas', defaultUnit: 'un', estimatedPrice: 9.5, emoji: '🥤' },
  { name: 'Cerveja pilsen lata', category: 'bebidas', defaultUnit: 'un', estimatedPrice: 4.3, emoji: '🍺' },
  // Limpeza
  { name: 'Detergente líquido', category: 'limpeza', defaultUnit: 'un', estimatedPrice: 2.9, emoji: '🧽' },
  { name: 'Sabão em pó / líquido', category: 'limpeza', defaultUnit: 'un', estimatedPrice: 24.9, emoji: '🧴' },
  { name: 'Água sanitária', category: 'limpeza', defaultUnit: 'L', estimatedPrice: 4.8, emoji: '🧪' },
  { name: 'Saco de lixo 50L', category: 'limpeza', defaultUnit: 'pct', estimatedPrice: 11.9, emoji: '🗑️' },
  { name: 'Papel toalha', category: 'limpeza', defaultUnit: 'pct', estimatedPrice: 7.5, emoji: '🧻' },
  // Higiene
  { name: 'Papel higiênico (12 rolos)', category: 'higiene', defaultUnit: 'pct', estimatedPrice: 21.9, emoji: '🧻' },
  { name: 'Creme dental', category: 'higiene', defaultUnit: 'un', estimatedPrice: 5.9, emoji: '🪥' },
  { name: 'Sabonete em barra', category: 'higiene', defaultUnit: 'un', estimatedPrice: 3.4, emoji: '🧼' },
  { name: 'Desodorante', category: 'higiene', defaultUnit: 'un', estimatedPrice: 14.9, emoji: '🧴' },
];

const now = Date.now();

export const INITIAL_RECIPES: Recipe[] = [
  {
    id: 'receita-feijoada',
    name: 'Feijoada',
    emoji: '🍲',
    notes: 'Almoço completo de fim de semana',
    updatedAt: now,
    ingredients: [
      { name: 'Feijão preto', quantity: 1, unit: 'kg', category: 'mercearia', emoji: '🫘' },
      { name: 'Linguiça calabresa', quantity: 500, unit: 'g', category: 'acougue', emoji: '🌭' },
      { name: 'Paio', quantity: 2, unit: 'un', category: 'acougue', emoji: '🌭' },
      { name: 'Carne seca', quantity: 500, unit: 'g', category: 'acougue', emoji: '🥩' },
      { name: 'Costelinha de porco', quantity: 500, unit: 'g', category: 'acougue', emoji: '🍖' },
      { name: 'Bacon', quantity: 250, unit: 'g', category: 'acougue', emoji: '🥓' },
      { name: 'Folha de louro', quantity: 1, unit: 'pct', category: 'mercearia', emoji: '🌿' },
      { name: 'Alho', quantity: 1, unit: 'un', category: 'hortifruti', emoji: '🧄' },
      { name: 'Cebola', quantity: 2, unit: 'un', category: 'hortifruti', emoji: '🧅' },
      { name: 'Laranja', quantity: 4, unit: 'un', category: 'hortifruti', emoji: '🍊' },
      { name: 'Couve manteiga', quantity: 1, unit: 'un', category: 'hortifruti', emoji: '🥬' },
    ],
  },
  {
    id: 'receita-strogonoff',
    name: 'Strogonoff de frango',
    emoji: '🍛',
    notes: 'Rápido para o dia a dia',
    updatedAt: now - 1000 * 60 * 60,
    ingredients: [
      { name: 'Peito de frango', quantity: 1, unit: 'kg', category: 'acougue', emoji: '🍗' },
      { name: 'Creme de leite', quantity: 2, unit: 'cx', category: 'laticinios', emoji: '🥛' },
      { name: 'Molho de tomate', quantity: 1, unit: 'un', category: 'mercearia', emoji: '🍅' },
      { name: 'Champignon', quantity: 1, unit: 'un', category: 'hortifruti', emoji: '🍄' },
      { name: 'Batata palha', quantity: 1, unit: 'pct', category: 'mercearia', emoji: '🥔' },
      { name: 'Arroz tipo 1', quantity: 1, unit: 'pct', category: 'mercearia', emoji: '🍚' },
    ],
  },
  {
    id: 'receita-macarronada',
    name: 'Macarrão à bolonhesa',
    emoji: '🍝',
    notes: 'Serve 4 pessoas',
    updatedAt: now - 1000 * 60 * 120,
    ingredients: [
      { name: 'Macarrão espaguete', quantity: 1, unit: 'pct', category: 'mercearia', emoji: '🍝' },
      { name: 'Patinho moído', quantity: 500, unit: 'g', category: 'acougue', emoji: '🥩' },
      { name: 'Molho de tomate', quantity: 2, unit: 'un', category: 'mercearia', emoji: '🍅' },
      { name: 'Queijo parmesão ralado', quantity: 1, unit: 'pct', category: 'laticinios', emoji: '🧀' },
      { name: 'Alho', quantity: 1, unit: 'un', category: 'hortifruti', emoji: '🧄' },
      { name: 'Cebola', quantity: 1, unit: 'un', category: 'hortifruti', emoji: '🧅' },
    ],
  },
];

export const INITIAL_LISTS: ShoppingList[] = [
  {
    id: 'mercado-semana',
    name: 'Mercado da Semana',
    budget: 280,
    updatedAt: now,
    items: [
      {
        id: 'item-1',
        name: 'Banana prata',
        quantity: 1,
        unit: 'kg',
        price: 7.9,
        category: 'hortifruti',
        checked: true,
        note: 'Mais verdinha',
        emoji: '🍌',
        createdAt: now - 1000 * 60 * 50,
      },
      {
        id: 'item-2',
        name: 'Tomate italiano',
        quantity: 1,
        unit: 'kg',
        price: 9.5,
        category: 'hortifruti',
        checked: false,
        emoji: '🍅',
        createdAt: now - 1000 * 60 * 45,
      },
      {
        id: 'item-3',
        name: 'Ovos brancos (12 un)',
        quantity: 1,
        unit: 'cx',
        price: 12.9,
        category: 'hortifruti',
        checked: false,
        emoji: '🥚',
        createdAt: now - 1000 * 60 * 40,
      },
      {
        id: 'item-4',
        name: 'Pão de forma integral',
        quantity: 1,
        unit: 'pct',
        price: 9.9,
        category: 'padaria',
        checked: true,
        emoji: '🍞',
        createdAt: now - 1000 * 60 * 35,
      },
      {
        id: 'item-5',
        name: 'Peito de frango',
        quantity: 2,
        unit: 'kg',
        price: 22.9,
        category: 'acougue',
        checked: false,
        note: 'Filé sem osso',
        emoji: '🍗',
        createdAt: now - 1000 * 60 * 30,
      },
      {
        id: 'item-6',
        name: 'Leite integral',
        quantity: 4,
        unit: 'L',
        price: 5.4,
        category: 'laticinios',
        checked: true,
        emoji: '🥛',
        createdAt: now - 1000 * 60 * 25,
      },
      {
        id: 'item-7',
        name: 'Queijo mussarela',
        quantity: 1,
        unit: 'un',
        price: 16.5,
        category: 'laticinios',
        checked: false,
        note: '300g fatiado',
        emoji: '🧀',
        createdAt: now - 1000 * 60 * 20,
      },
      {
        id: 'item-8',
        name: 'Arroz tipo 1 (5 kg)',
        quantity: 1,
        unit: 'pct',
        price: 28.9,
        category: 'mercearia',
        checked: false,
        emoji: '🍚',
        createdAt: now - 1000 * 60 * 15,
      },
      {
        id: 'item-9',
        name: 'Café torrado e moído',
        quantity: 2,
        unit: 'pct',
        price: 18.9,
        category: 'mercearia',
        checked: false,
        emoji: '☕',
        createdAt: now - 1000 * 60 * 10,
      },
      {
        id: 'item-10',
        name: 'Detergente líquido',
        quantity: 3,
        unit: 'un',
        price: 2.9,
        category: 'limpeza',
        checked: true,
        note: 'Neutro',
        emoji: '🧽',
        createdAt: now - 1000 * 60 * 5,
      },
    ],
  },
  {
    id: 'churrasco-domingo',
    name: 'Churrasco de Domingo',
    budget: 350,
    updatedAt: now - 1000 * 60 * 120,
    items: [
      {
        id: 'ch-1',
        name: 'Picanha bovina',
        quantity: 2,
        unit: 'kg',
        price: 69.9,
        category: 'acougue',
        checked: false,
        emoji: '🥩',
        createdAt: now - 1000 * 60 * 100,
      },
      {
        id: 'ch-2',
        name: 'Linguiça toscana',
        quantity: 1,
        unit: 'kg',
        price: 24.5,
        category: 'acougue',
        checked: false,
        emoji: '🌭',
        createdAt: now - 1000 * 60 * 95,
      },
      {
        id: 'ch-3',
        name: 'Pão de alho',
        quantity: 2,
        unit: 'pct',
        price: 11.9,
        category: 'padaria',
        checked: false,
        emoji: '🥖',
        createdAt: now - 1000 * 60 * 90,
      },
      {
        id: 'ch-4',
        name: 'Carvão vegetal (4 kg)',
        quantity: 1,
        unit: 'pct',
        price: 22.0,
        category: 'outros',
        checked: false,
        emoji: '🔥',
        createdAt: now - 1000 * 60 * 85,
      },
      {
        id: 'ch-5',
        name: 'Refrigerante guaraná (2 L)',
        quantity: 2,
        unit: 'un',
        price: 9.5,
        category: 'bebidas',
        checked: false,
        emoji: '🥤',
        createdAt: now - 1000 * 60 * 80,
      },
      {
        id: 'ch-6',
        name: 'Cerveja pilsen lata',
        quantity: 12,
        unit: 'un',
        price: 4.3,
        category: 'bebidas',
        checked: false,
        emoji: '🍺',
        createdAt: now - 1000 * 60 * 75,
      },
    ],
  },
  {
    id: 'higiene-casa',
    name: 'Higiene & Limpeza',
    budget: 140,
    updatedAt: now - 1000 * 60 * 300,
    items: [
      {
        id: 'hc-1',
        name: 'Papel higiênico (12 rolos)',
        quantity: 1,
        unit: 'pct',
        price: 21.9,
        category: 'higiene',
        checked: false,
        emoji: '🧻',
        createdAt: now - 1000 * 60 * 290,
      },
      {
        id: 'hc-2',
        name: 'Sabão em pó / líquido',
        quantity: 1,
        unit: 'un',
        price: 24.9,
        category: 'limpeza',
        checked: false,
        emoji: '🧴',
        createdAt: now - 1000 * 60 * 280,
      },
      {
        id: 'hc-3',
        name: 'Creme dental',
        quantity: 2,
        unit: 'un',
        price: 5.9,
        category: 'higiene',
        checked: false,
        emoji: '🪥',
        createdAt: now - 1000 * 60 * 270,
      },
    ],
  },
];

export function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}
