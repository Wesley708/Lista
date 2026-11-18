export type CategoryId =
  | 'hortifruti'
  | 'acougue'
  | 'padaria'
  | 'laticinios'
  | 'mercearia'
  | 'bebidas'
  | 'limpeza'
  | 'higiene'
  | 'outros';

export type UnitType = 'un' | 'kg' | 'g' | 'L' | 'ml' | 'pct' | 'cx';

export type FilterMode = 'pending' | 'checked' | 'all';

export type AppTab = 'lista' | 'receitas' | 'listas' | 'ajustes';

export interface CategoryMeta {
  id: CategoryId;
  label: string;
  order: number;
}

export interface ListMember {
  uid: string;
  displayName: string;
  role: 'owner' | 'editor';
  joinedAt?: number;
}

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unit: UnitType;
  price: number | null;
  category: CategoryId;
  checked: boolean;
  note?: string;
  emoji?: string;
  recipeId?: string;
  recipeName?: string;
  addedBy?: string;
  createdAt: number;
}

export interface ShoppingList {
  id: string;
  name: string;
  budget: number | null;
  items: ShoppingItem[];
  updatedAt: number;
  ownerId?: string;
  inviteCode?: string;
  memberIds?: string[];
  members?: ListMember[];
  isSynced?: boolean;
}

export interface RecipeIngredient {
  name: string;
  quantity: number;
  unit: UnitType;
  category: CategoryId;
  emoji?: string;
}

export interface Recipe {
  id: string;
  name: string;
  emoji: string;
  notes?: string;
  ingredients: RecipeIngredient[];
  updatedAt: number;
}

export interface CatalogSuggestion {
  name: string;
  category: CategoryId;
  defaultUnit: UnitType;
  estimatedPrice?: number;
  emoji?: string;
}
