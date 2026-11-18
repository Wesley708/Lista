import { User, onAuthStateChanged } from 'firebase/auth';
import {
  Timestamp,
  Unsubscribe,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  enableNetwork,
  getDoc,
  getDocs,
  getDocsFromServer,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CATEGORY_MAP,
  UNITS,
  detectCategory,
  detectItemEmoji,
  formatBRL,
  INITIAL_LISTS,
  INITIAL_RECIPES,
} from '../data/catalog';
import {
  ACCENT_THEME_KEY,
  DEFAULT_ACCENT_ID,
  DEFAULT_PRIMARY_ID,
  PRIMARY_THEME_KEY,
  applyAppTheme,
  getAccentTheme,
  getPrimaryTheme,
} from '../data/themes';
import {
  OperationType,
  auth,
  db,
  handleFirestoreError,
  reportFirestoreError,
  signInWithGoogle,
  signOutUser,
} from '../firebase';
import {
  CategoryId,
  ListMember,
  Recipe,
  RecipeIngredient,
  ShoppingItem,
  ShoppingList,
  UnitType,
} from '../types/shopping';

import {
  MAX_BACKUP_FILE_BYTES,
  isPlainRecord,
  isValidInviteCodeFormat,
  normalizeInviteCode,
  safeJsonParse,
  sanitizeShareLine,
  sanitizeText,
} from '../utils/security';

const LISTS_KEY = 'sacola_lists_v1';
const ACTIVE_LIST_KEY = 'sacola_active_list_v1';
const PENDING_INVITE_KEY = 'sacola_pending_invite';
const INVITE_GUARD_KEY = 'sacola_invite_guard';
const RECIPES_KEY = 'sacola_recipes_v1';
const APPLIED_RECIPES_KEY = 'sacola_applied_recipes_v1';
const MAX_BATCH_OPS = 450;
const SAFE_ID_REGEX = /^[a-zA-Z0-9_\-]+$/;
const VALID_UNITS = new Set<UnitType>(UNITS.map((u) => u.value));
const VALID_CATEGORIES = new Set<CategoryId>(Object.keys(CATEGORY_MAP) as CategoryId[]);

function getCryptoRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

function generateSafeId(prefix: string): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = getCryptoRandomBytes(10);
  let rand = '';
  for (let i = 0; i < bytes.length; i++) {
    rand += alphabet[bytes[i] % alphabet.length];
  }
  const cleanPrefix = prefix.replace(/[^a-zA-Z0-9_\-]/g, '') || 'id';
  return `${cleanPrefix}_${Date.now()}_${rand}`.slice(0, 128);
}

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = getCryptoRandomBytes(10);
  let code = '';
  for (let i = 0; i < bytes.length; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

function sanitizeId(raw: unknown, fallbackPrefix: string): string {
  if (typeof raw === 'string') {
    const trimmed = raw.trim().slice(0, 128);
    if (trimmed.length >= 1 && SAFE_ID_REGEX.test(trimmed)) {
      return trimmed;
    }
  }
  return generateSafeId(fallbackPrefix);
}

function sanitizeUnit(raw: unknown): UnitType {
  return typeof raw === 'string' && VALID_UNITS.has(raw as UnitType) ? (raw as UnitType) : 'un';
}

function sanitizeCategory(raw: unknown, itemName: string): CategoryId {
  return typeof raw === 'string' && VALID_CATEGORIES.has(raw as CategoryId)
    ? (raw as CategoryId)
    : detectCategory(itemName);
}

function sanitizeNumber(raw: unknown, min: number, max: number): number | null {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return null;
  if (raw < min) return min;
  if (raw > max) return max;
  return raw;
}

function sanitizeShoppingItem(raw: unknown): ShoppingItem | null {
  if (!isPlainRecord(raw)) return null;
  const name = sanitizeText(raw.name, 100);
  if (!name) return null;

  const category = sanitizeCategory(raw.category, name);
  const unit = sanitizeUnit(raw.unit);
  const quantity = sanitizeNumber(raw.quantity, 0.1, 10000) ?? 1;
  const price = raw.price === null || raw.price === undefined
    ? null
    : sanitizeNumber(raw.price, 0, 1000000);
  const cleanNote = sanitizeText(raw.note, 160);
  const note = cleanNote || undefined;
  const cleanEmoji = sanitizeText(raw.emoji, 16);
  const emoji = cleanEmoji || detectItemEmoji(name, category);
  const createdAt = typeof raw.createdAt === 'number' && Number.isFinite(raw.createdAt)
    ? raw.createdAt
    : Date.now();

  const recipeId =
    typeof raw.recipeId === 'string' && SAFE_ID_REGEX.test(raw.recipeId.trim())
      ? raw.recipeId.trim().slice(0, 128)
      : undefined;
  const cleanRecipeName = sanitizeText(raw.recipeName, 80);
  const recipeName = cleanRecipeName || undefined;

  return {
    id: sanitizeId(raw.id, 'item'),
    name,
    quantity,
    unit,
    price,
    category,
    checked: Boolean(raw.checked),
    note,
    emoji,
    recipeId,
    recipeName,
    createdAt,
  };
}

function sanitizeRecipeIngredient(raw: unknown): RecipeIngredient | null {
  if (!isPlainRecord(raw)) return null;
  const name = sanitizeText(raw.name, 100);
  if (!name) return null;
  const category = sanitizeCategory(raw.category, name);
  const unit = sanitizeUnit(raw.unit);
  const quantity = sanitizeNumber(raw.quantity, 0.1, 10000) ?? 1;
  const cleanEmoji = sanitizeText(raw.emoji, 16);
  const emoji = cleanEmoji || detectItemEmoji(name, category);

  return { name, quantity, unit, category, emoji };
}

function sanitizeRecipe(raw: unknown): Recipe | null {
  if (!isPlainRecord(raw)) return null;
  if (!Array.isArray(raw.ingredients)) return null;
  const name = sanitizeText(raw.name, 80);
  if (!name) return null;

  const ingredients: RecipeIngredient[] = [];
  for (const rawIng of raw.ingredients.slice(0, 30)) {
    const clean = sanitizeRecipeIngredient(rawIng);
    if (clean) ingredients.push(clean);
  }
  if (ingredients.length === 0) return null;

  const emoji = sanitizeText(raw.emoji, 16) || '🍲';
  const cleanNotes = sanitizeText(raw.notes, 200);
  const notes = cleanNotes || undefined;
  const updatedAt =
    typeof raw.updatedAt === 'number' && Number.isFinite(raw.updatedAt)
      ? raw.updatedAt
      : Date.now();

  return {
    id: sanitizeId(raw.id, 'receita'),
    name,
    emoji,
    notes,
    ingredients,
    updatedAt,
  };
}

function loadLocalRecipes(): Recipe[] {
  try {
    const raw = localStorage.getItem(RECIPES_KEY);
    if (!raw) return INITIAL_RECIPES;
    const parsed = safeJsonParse(raw);
    if (!Array.isArray(parsed)) return INITIAL_RECIPES;
    const sanitized = parsed
      .slice(0, 50)
      .map(sanitizeRecipe)
      .filter((r): r is Recipe => r !== null);
    return sanitized.length > 0 ? sanitized : INITIAL_RECIPES;
  } catch {
    return INITIAL_RECIPES;
  }
}

function loadAppliedRecipesMap(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(APPLIED_RECIPES_KEY);
    if (!raw) return {};
    const parsed = safeJsonParse(raw);
    if (!isPlainRecord(parsed)) return {};
    const out: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (SAFE_ID_REGEX.test(k) && Array.isArray(v)) {
        out[k] = v.filter((id): id is string => typeof id === 'string' && SAFE_ID_REGEX.test(id)).slice(0, 30);
      }
    }
    return out;
  } catch {
    return {};
  }
}

function sanitizeShoppingList(raw: unknown): ShoppingList | null {
  if (!isPlainRecord(raw)) return null;
  if (!Array.isArray(raw.items)) return null;
  const name = sanitizeText(raw.name, 80);
  if (!name) return null;

  const budget = raw.budget === null || raw.budget === undefined
    ? null
    : sanitizeNumber(raw.budget, 0, 1000000);

  const items: ShoppingItem[] = [];
  for (const rawItem of raw.items.slice(0, 500)) {
    const cleanItem = sanitizeShoppingItem(rawItem);
    if (cleanItem) items.push(cleanItem);
  }

  const updatedAt = typeof raw.updatedAt === 'number' && Number.isFinite(raw.updatedAt)
    ? raw.updatedAt
    : Date.now();

  return {
    id: sanitizeId(raw.id, 'lista'),
    name,
    budget,
    items,
    updatedAt,
  };
}

function toMillis(val: unknown): number {
  if (val instanceof Timestamp) return val.toMillis();
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  return 0;
}

interface OptimisticItemOp {
  seq: number;
  settled: boolean;
  deleted?: boolean;
  patch?: Partial<ShoppingItem>;
  createdItem?: ShoppingItem;
}

function mergeListItems(
  cloudItems: ShoppingItem[],
  ops: Record<string, OptimisticItemOp> | undefined
): ShoppingItem[] {
  if (!ops) return cloudItems;
  const opEntries = Object.entries(ops);
  if (opEntries.length === 0) return cloudItems;

  const result: ShoppingItem[] = [];
  const seenIds = new Set<string>();

  for (const item of cloudItems) {
    seenIds.add(item.id);
    const op = ops[item.id];
    if (!op) {
      result.push(item);
      continue;
    }
    if (op.deleted) continue;
    result.push(op.patch ? { ...item, ...op.patch } : item);
  }

  for (const [itemId, op] of opEntries) {
    if (seenIds.has(itemId) || op.deleted || !op.createdItem) continue;
    const base = op.createdItem;
    result.unshift(op.patch ? { ...base, ...op.patch } : base);
  }

  return result;
}

function loadLocalLists(): ShoppingList[] {
  try {
    const raw = localStorage.getItem(LISTS_KEY);
    if (!raw) return INITIAL_LISTS;
    const parsed = safeJsonParse(raw);
    if (!Array.isArray(parsed)) return INITIAL_LISTS;
    const sanitized = parsed
      .slice(0, 30)
      .map(sanitizeShoppingList)
      .filter((l): l is ShoppingList => l !== null);
    return sanitized.length > 0 ? sanitized : INITIAL_LISTS;
  } catch {
    return INITIAL_LISTS;
  }
}

function loadActiveId(lists: ShoppingList[]): string {
  try {
    const saved = localStorage.getItem(ACTIVE_LIST_KEY);
    if (saved && lists.some((l) => l.id === saved)) {
      return saved;
    }
  } catch {
    // ignore
  }
  return lists[0]?.id ?? 'mercado-semana';
}

export interface AddItemInput {
  name: string;
  quantity?: number;
  unit?: UnitType;
  price?: number | null;
  category?: CategoryId;
  note?: string;
  emoji?: string;
}

export function useShoppingStore() {
  const [localLists, setLocalLists] = useState<ShoppingList[]>(() => loadLocalLists());
  const [localRecipes, setLocalRecipes] = useState<Recipe[]>(() => loadLocalRecipes());
  const [cloudRecipes, setCloudRecipes] = useState<Recipe[] | null>(null);
  const [appliedRecipesMap, setAppliedRecipesMap] = useState<Record<string, string[]>>(() =>
    loadAppliedRecipesMap()
  );
  const [cloudListsMap, setCloudListsMap] = useState<Record<string, ShoppingList>>({});
  const [cloudItemsMap, setCloudItemsMap] = useState<Record<string, ShoppingItem[]>>({});
  const [cloudMembersMap, setCloudMembersMap] = useState<Record<string, ListMember[]>>({});
  const [activeListId, setActiveListId] = useState<string>(() => loadActiveId(loadLocalLists()));
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [hasPendingCloudWrites, setHasPendingCloudWrites] = useState(false);
  const [isRefreshingSync, setIsRefreshingSync] = useState(false);
  const [optimisticOpsByList, setOptimisticOpsByList] = useState<
    Record<string, Record<string, OptimisticItemOp>>
  >({});
  const [pendingInviteCode, setPendingInviteCode] = useState<string | null>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const fromUrl = params.get('convite');
      if (fromUrl !== null) {
        window.history.replaceState({}, '', window.location.pathname);
        const clean = normalizeInviteCode(fromUrl);
        if (isValidInviteCodeFormat(clean)) {
          sessionStorage.setItem(PENDING_INVITE_KEY, clean);
          return clean;
        }
        sessionStorage.removeItem(PENDING_INVITE_KEY);
        return null;
      }
      const stored = sessionStorage.getItem(PENDING_INVITE_KEY);
      if (stored) {
        const cleanStored = normalizeInviteCode(stored);
        if (isValidInviteCodeFormat(cleanStored)) {
          return cleanStored;
        }
        sessionStorage.removeItem(PENDING_INVITE_KEY);
      }
      return null;
    } catch {
      return null;
    }
  });

  const [primaryThemeId, setPrimaryThemeId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(PRIMARY_THEME_KEY);
      if (saved) return getPrimaryTheme(saved).id;
      const legacyDark = localStorage.getItem('sacola_theme') === 'dark';
      return legacyDark ? 'grafite' : DEFAULT_PRIMARY_ID;
    } catch {
      return DEFAULT_PRIMARY_ID;
    }
  });

  const [accentThemeId, setAccentThemeId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(ACCENT_THEME_KEY);
      return saved ? getAccentTheme(saved).id : DEFAULT_ACCENT_ID;
    } catch {
      return DEFAULT_ACCENT_ID;
    }
  });

  useEffect(() => {
    applyAppTheme(primaryThemeId, accentThemeId);
    try {
      localStorage.setItem(PRIMARY_THEME_KEY, primaryThemeId);
      localStorage.setItem(ACCENT_THEME_KEY, accentThemeId);
    } catch {
      // ignore
    }
  }, [primaryThemeId, accentThemeId]);

  const itemUnsubsRef = useRef<Record<string, Unsubscribe>>({});
  const memberUnsubsRef = useRef<Record<string, Unsubscribe>>({});
  const pendingWritesBySourceRef = useRef<Record<string, boolean>>({});
  const cloudListsMapRef = useRef<Record<string, ShoppingList>>({});
  const cloudItemsMapRef = useRef<Record<string, ShoppingItem[]>>({});
  const optimisticOpsRef = useRef<Record<string, Record<string, OptimisticItemOp>>>({});
  const opSeqRef = useRef(0);
  const activeListIdRef = useRef(activeListId);
  const pendingTargetListIdRef = useRef<string | null>(null);
  const pendingInviteCodeRef = useRef<string | null>(pendingInviteCode);
  const joiningInviteRef = useRef(false);
  const lastSyncAttemptRef = useRef(0);
  const localListsRef = useRef(localLists);
  const localRecipesRef = useRef(localRecipes);
  const migratingRef = useRef(false);
  const loginInFlightRef = useRef(false);
  const migratingRecipesRef = useRef(false);
  const isLoggingOutRef = useRef(false);
  const prevUidRef = useRef<string | null>(null);

  activeListIdRef.current = activeListId;
  cloudListsMapRef.current = cloudListsMap;
  cloudItemsMapRef.current = cloudItemsMap;
  pendingInviteCodeRef.current = pendingInviteCode;
  localListsRef.current = localLists;
  localRecipesRef.current = localRecipes;

  // Persist local lists, recipes & applied recipes (disabled during logout cleanup)
  useEffect(() => {
    if (isLoggingOutRef.current) return;
    try {
      localStorage.setItem(LISTS_KEY, JSON.stringify(localLists));
    } catch {
      // ignore
    }
  }, [localLists]);

  useEffect(() => {
    if (isLoggingOutRef.current) return;
    try {
      localStorage.setItem(RECIPES_KEY, JSON.stringify(localRecipes));
    } catch {
      // ignore
    }
  }, [localRecipes]);

  useEffect(() => {
    if (isLoggingOutRef.current) return;
    try {
      localStorage.setItem(APPLIED_RECIPES_KEY, JSON.stringify(appliedRecipesMap));
    } catch {
      // ignore
    }
  }, [appliedRecipesMap]);

  useEffect(() => {
    if (isLoggingOutRef.current) return;
    try {
      localStorage.setItem(ACTIVE_LIST_KEY, activeListId);
    } catch {
      // ignore
    }
  }, [activeListId]);

  // Listen to Firebase Auth state and isolate account transitions
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      const nextUid = firebaseUser?.uid ?? null;
      if (prevUidRef.current !== null && prevUidRef.current !== nextUid) {
        Object.values(itemUnsubsRef.current).forEach((u) => u());
        Object.values(memberUnsubsRef.current).forEach((u) => u());
        itemUnsubsRef.current = {};
        memberUnsubsRef.current = {};
        setCloudListsMap({});
        setCloudItemsMap({});
        setCloudMembersMap({});
        setCloudRecipes(null);
      }
      prevUidRef.current = nextUid;
      setUser(firebaseUser);
      setAuthReady(true);
      if (!firebaseUser) {
        setCloudListsMap({});
        setCloudItemsMap({});
        setCloudMembersMap({});
        setCloudRecipes(null);
      }
    });
    return unsub;
  }, []);

  const migrateLocalRecipesToCloud = useCallback(
    async (firebaseUser: User, initialLocalRecipes: Recipe[]) => {
      const flagKey = `sacola_recipes_migrated_${firebaseUser.uid}`;
      if (
        migratingRecipesRef.current ||
        localStorage.getItem(flagKey) ||
        !firebaseUser.emailVerified
      ) {
        return;
      }
      migratingRecipesRef.current = true;
      try {
        const batch = writeBatch(db);
        for (const r of initialLocalRecipes.slice(0, 30)) {
          const recipeId = sanitizeId(r.id, 'receita');
          batch.set(doc(db, 'users', firebaseUser.uid, 'recipes', recipeId), {
            name: r.name.trim().slice(0, 80) || 'Receita',
            emoji: (r.emoji || '🍲').slice(0, 16),
            notes: r.notes ? r.notes.trim().slice(0, 200) : null,
            ownerId: firebaseUser.uid,
            ingredients: r.ingredients.slice(0, 30).map((ing) => ({
              name: ing.name.trim().slice(0, 100),
              quantity: Math.min(10000, Math.max(0.1, Number(ing.quantity) || 1)),
              unit: sanitizeUnit(ing.unit),
              category: sanitizeCategory(ing.category, ing.name),
              emoji: (ing.emoji || detectItemEmoji(ing.name, ing.category)).slice(0, 16),
            })),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        await batch.commit();
        localStorage.setItem(flagKey, '1');
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${firebaseUser.uid}/recipes`);
      } finally {
        migratingRecipesRef.current = false;
      }
    },
    []
  );

  const migrateLocalListsToCloud = useCallback(
    async (firebaseUser: User, initialLocal: ShoppingList[]) => {
      const flagKey = `sacola_migrated_${firebaseUser.uid}`;
      if (migratingRef.current || localStorage.getItem(flagKey) || !firebaseUser.emailVerified) {
        return;
      }
      migratingRef.current = true;

      try {
        const displayName = (
          firebaseUser.displayName ||
          firebaseUser.email?.split('@')[0] ||
          'Você'
        ).slice(0, 80);

        for (const localList of initialLocal.slice(0, 30)) {
          const listId = generateSafeId('list');
          const inviteCode = generateInviteCode();
          const listName = localList.name.trim().slice(0, 80) || 'Lista de compras';

          const headerBatch = writeBatch(db);
          headerBatch.set(doc(db, 'lists', listId), {
            name: listName,
            budget:
              localList.budget !== null && localList.budget >= 0
                ? Math.min(1000000, localList.budget)
                : null,
            ownerId: firebaseUser.uid,
            inviteCode,
            memberIds: [firebaseUser.uid],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          headerBatch.set(doc(db, 'lists', listId, 'members', firebaseUser.uid), {
            uid: firebaseUser.uid,
            displayName,
            role: 'owner',
            joinedAt: serverTimestamp(),
          });

          headerBatch.set(doc(db, 'invites', inviteCode), {
            listId,
            listName,
            ownerId: firebaseUser.uid,
            createdAt: serverTimestamp(),
          });

          try {
            await headerBatch.commit();
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, `lists/${listId}`);
          }

          const itemsToMigrate = localList.items.slice(0, 500);
          for (let i = 0; i < itemsToMigrate.length; i += MAX_BATCH_OPS) {
            const itemBatch = writeBatch(db);
            for (const item of itemsToMigrate.slice(i, i + MAX_BATCH_OPS)) {
              const itemId = generateSafeId('item');
              const cleanName = item.name.trim().slice(0, 100) || 'Item';
              const cleanCat = sanitizeCategory(item.category, cleanName);
              const cleanUnit = sanitizeUnit(item.unit);
              itemBatch.set(doc(db, 'lists', listId, 'items', itemId), {
                name: cleanName,
                quantity: Math.min(10000, Math.max(0.1, Number(item.quantity) || 1)),
                unit: cleanUnit,
                price:
                  item.price !== null && item.price >= 0
                    ? Math.min(1000000, Number(item.price))
                    : null,
                category: cleanCat,
                checked: Boolean(item.checked),
                note: item.note ? item.note.trim().slice(0, 160) : null,
                emoji: (item.emoji || detectItemEmoji(cleanName, cleanCat)).slice(0, 16),
                addedBy: firebaseUser.uid,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
            }
            try {
              await itemBatch.commit();
            } catch (err) {
              handleFirestoreError(err, OperationType.WRITE, `lists/${listId}/items`);
            }
          }
        }

        localStorage.setItem(flagKey, '1');
      } finally {
        migratingRef.current = false;
      }
    },
    []
  );

  const updatePendingWritesFlag = useCallback((sourceKey: string, pending: boolean) => {
    if (pending) {
      pendingWritesBySourceRef.current[sourceKey] = true;
    } else {
      delete pendingWritesBySourceRef.current[sourceKey];
    }
    const anyPending = Object.keys(pendingWritesBySourceRef.current).length > 0;
    setHasPendingCloudWrites(anyPending);
  }, []);

  const applyOptimisticOp = useCallback(
    (listId: string, itemId: string, op: Omit<OptimisticItemOp, 'seq' | 'settled'>): number => {
      const seq = ++opSeqRef.current;
      const nextOp: OptimisticItemOp = { ...op, seq, settled: false };
      const prevForList = optimisticOpsRef.current[listId] ?? {};
      const nextForList = { ...prevForList, [itemId]: nextOp };
      optimisticOpsRef.current = { ...optimisticOpsRef.current, [listId]: nextForList };
      setOptimisticOpsByList(optimisticOpsRef.current);
      return seq;
    },
    []
  );

  const doesCloudMatchOp = useCallback(
    (items: ShoppingItem[], itemId: string, op: OptimisticItemOp): boolean => {
      const found = items.find((i) => i.id === itemId);
      if (op.deleted) return !found;
      if (op.createdItem && !found) return false;
      if (!found) return false;
      if (!op.patch) return true;
      for (const [key, val] of Object.entries(op.patch)) {
        if ((found as unknown as Record<string, unknown>)[key] !== val) {
          return false;
        }
      }
      return true;
    },
    []
  );

  const settleOptimisticOp = useCallback(
    (listId: string, itemId: string, seq: number) => {
      const prevForList = optimisticOpsRef.current[listId];
      const currentOp = prevForList?.[itemId];
      if (!currentOp || currentOp.seq !== seq) return;

      const cloudItems = cloudItemsMapRef.current[listId] ?? [];
      if (doesCloudMatchOp(cloudItems, itemId, currentOp)) {
        const nextForList = { ...prevForList };
        delete nextForList[itemId];
        const nextAll = { ...optimisticOpsRef.current };
        if (Object.keys(nextForList).length === 0) {
          delete nextAll[listId];
        } else {
          nextAll[listId] = nextForList;
        }
        optimisticOpsRef.current = nextAll;
        setOptimisticOpsByList(nextAll);
      } else {
        const nextForList = { ...prevForList, [itemId]: { ...currentOp, settled: true } };
        const nextAll = { ...optimisticOpsRef.current, [listId]: nextForList };
        optimisticOpsRef.current = nextAll;
        setOptimisticOpsByList(nextAll);
      }
    },
    [doesCloudMatchOp]
  );

  const rollbackOptimisticOp = useCallback((listId: string, itemId: string, seq: number) => {
    const prevForList = optimisticOpsRef.current[listId];
    const currentOp = prevForList?.[itemId];
    if (!currentOp || currentOp.seq !== seq) return;

    const nextForList = { ...prevForList };
    delete nextForList[itemId];
    const nextAll = { ...optimisticOpsRef.current };
    if (Object.keys(nextForList).length === 0) {
      delete nextAll[listId];
    } else {
      nextAll[listId] = nextForList;
    }
    optimisticOpsRef.current = nextAll;
    setOptimisticOpsByList(nextAll);
  }, []);

  const reconcileSettledOpsWithCloud = useCallback(
    (listId: string, cloudItems: ShoppingItem[], hasPendingWrites: boolean, fromCache: boolean) => {
      const prevForList = optimisticOpsRef.current[listId];
      if (!prevForList) return;
      let changed = false;
      const nextForList = { ...prevForList };
      for (const [itemId, op] of Object.entries(prevForList)) {
        if (!op.settled) continue;
        if (doesCloudMatchOp(cloudItems, itemId, op) || (!hasPendingWrites && !fromCache)) {
          delete nextForList[itemId];
          changed = true;
        }
      }
      if (!changed) return;
      const nextAll = { ...optimisticOpsRef.current };
      if (Object.keys(nextForList).length === 0) {
        delete nextAll[listId];
      } else {
        nextAll[listId] = nextForList;
      }
      optimisticOpsRef.current = nextAll;
      setOptimisticOpsByList(nextAll);
    },
    [doesCloudMatchOp]
  );

  const parseCloudItemDoc = useCallback((itemDoc: { id: string; data: (opts?: { serverTimestamps?: 'estimate' | 'previous' | 'none' }) => Record<string, unknown> }): ShoppingItem => {
    const d = itemDoc.data({ serverTimestamps: 'estimate' });
    const name = String(d.name ?? '');
    const category = (d.category as CategoryId) ?? 'outros';
    return {
      id: itemDoc.id,
      name,
      quantity: Number(d.quantity ?? 1),
      unit: (d.unit as UnitType) ?? 'un',
      price: typeof d.price === 'number' ? d.price : null,
      category,
      checked: Boolean(d.checked),
      note: typeof d.note === 'string' && d.note ? d.note : undefined,
      emoji:
        typeof d.emoji === 'string' && d.emoji
          ? d.emoji
          : detectItemEmoji(name, category),
      recipeId: typeof d.recipeId === 'string' && d.recipeId ? d.recipeId : undefined,
      recipeName: typeof d.recipeName === 'string' && d.recipeName ? d.recipeName : undefined,
      addedBy: typeof d.addedBy === 'string' ? d.addedBy : undefined,
      createdAt: toMillis(d.createdAt),
    };
  }, []);

  const attachListSubListeners = useCallback(
    (listId: string) => {
      if (!itemUnsubsRef.current[listId]) {
        const itemsPath = `lists/${listId}/items`;
        itemUnsubsRef.current[listId] = onSnapshot(
          collection(db, 'lists', listId, 'items'),
          { includeMetadataChanges: true },
          (itemsSnap) => {
            const parsedItems: ShoppingItem[] = itemsSnap.docs.map((itemDoc) =>
              parseCloudItemDoc(itemDoc)
            );
            cloudItemsMapRef.current = { ...cloudItemsMapRef.current, [listId]: parsedItems };
            setCloudItemsMap((prev) => ({ ...prev, [listId]: parsedItems }));
            updatePendingWritesFlag(`items:${listId}`, itemsSnap.metadata.hasPendingWrites);
            reconcileSettledOpsWithCloud(
              listId,
              parsedItems,
              itemsSnap.metadata.hasPendingWrites,
              itemsSnap.metadata.fromCache
            );
            if (!itemsSnap.metadata.fromCache) {
              setSyncError(null);
            }
          },
          (err) => {
            delete itemUnsubsRef.current[listId];
            updatePendingWritesFlag(`items:${listId}`, false);
            const msg = reportFirestoreError(err, OperationType.LIST, itemsPath);
            setSyncError(msg);
          }
        );
      }

      if (!memberUnsubsRef.current[listId]) {
        const membersPath = `lists/${listId}/members`;
        memberUnsubsRef.current[listId] = onSnapshot(
          collection(db, 'lists', listId, 'members'),
          (membersSnap) => {
            const parsedMembers: ListMember[] = membersSnap.docs.map((mDoc) => {
              const d = mDoc.data({ serverTimestamps: 'estimate' });
              return {
                uid: String(d.uid ?? mDoc.id),
                displayName: String(d.displayName ?? 'Participante'),
                role: d.role === 'owner' ? 'owner' : 'editor',
                joinedAt: toMillis(d.joinedAt),
              };
            });
            setCloudMembersMap((prev) => ({ ...prev, [listId]: parsedMembers }));
          },
          (err) => {
            delete memberUnsubsRef.current[listId];
            const msg = reportFirestoreError(err, OperationType.LIST, membersPath);
            setSyncError(msg);
          }
        );
      }
    },
    [parseCloudItemDoc, reconcileSettledOpsWithCloud, updatePendingWritesFlag]
  );

  const syncNow = useCallback(
    async (silent = false, explicitListId?: string) => {
      if (!user || !user.emailVerified) return;
      const now = Date.now();
      if (silent && now - lastSyncAttemptRef.current < 1500) {
        return;
      }
      lastSyncAttemptRef.current = now;
      setIsRefreshingSync(true);

      try {
        await enableNetwork(db);
        const listsQuery = query(
          collection(db, 'lists'),
          where('memberIds', 'array-contains', user.uid)
        );
        const targetId = explicitListId || pendingTargetListIdRef.current || activeListIdRef.current;

        const [listsSnap, itemsSnap, membersSnap] = await Promise.all([
          getDocsFromServer(listsQuery),
          targetId && SAFE_ID_REGEX.test(targetId)
            ? getDocsFromServer(collection(db, 'lists', targetId, 'items')).catch(() => null)
            : Promise.resolve(null),
          targetId && SAFE_ID_REGEX.test(targetId)
            ? getDocsFromServer(collection(db, 'lists', targetId, 'members')).catch(() => null)
            : Promise.resolve(null),
        ]);

        const nextLists: Record<string, ShoppingList> = {};
        listsSnap.docs.forEach((docSnap) => {
          const data = docSnap.data({ serverTimestamps: 'estimate' });
          const listId = docSnap.id;
          nextLists[listId] = {
            id: listId,
            name: String(data.name ?? 'Lista'),
            budget: typeof data.budget === 'number' ? data.budget : null,
            ownerId: String(data.ownerId ?? ''),
            inviteCode: String(data.inviteCode ?? ''),
            memberIds: Array.isArray(data.memberIds) ? data.memberIds : [],
            updatedAt: toMillis(data.updatedAt),
            items: [],
            members: [],
            isSynced: true,
          };
          attachListSubListeners(listId);
        });

        cloudListsMapRef.current = nextLists;
        setCloudListsMap(nextLists);

        if (targetId && itemsSnap) {
          const parsedItems = itemsSnap.docs.map((itemDoc) => parseCloudItemDoc(itemDoc));
          cloudItemsMapRef.current = { ...cloudItemsMapRef.current, [targetId]: parsedItems };
          setCloudItemsMap((prev) => ({ ...prev, [targetId]: parsedItems }));
          reconcileSettledOpsWithCloud(targetId, parsedItems, false, false);
        }

        if (targetId && membersSnap) {
          const parsedMembers: ListMember[] = membersSnap.docs.map((mDoc) => {
            const d = mDoc.data({ serverTimestamps: 'estimate' });
            return {
              uid: String(d.uid ?? mDoc.id),
              displayName: String(d.displayName ?? 'Participante'),
              role: d.role === 'owner' ? 'owner' : 'editor',
              joinedAt: toMillis(d.joinedAt),
            };
          });
          setCloudMembersMap((prev) => ({ ...prev, [targetId]: parsedMembers }));
        }

        setSyncError(null);
      } catch (err) {
        const msg = reportFirestoreError(err, OperationType.LIST, 'lists');
        if (!silent) {
          setSyncError(msg);
        }
      } finally {
        setIsRefreshingSync(false);
      }
    },
    [user, attachListSubListeners, parseCloudItemDoc, reconcileSettledOpsWithCloud]
  );

  // Subscribe to Firestore lists only when authenticated with verified email
  useEffect(() => {
    if (!authReady || !user) {
      Object.values(itemUnsubsRef.current).forEach((u) => u());
      Object.values(memberUnsubsRef.current).forEach((u) => u());
      itemUnsubsRef.current = {};
      memberUnsubsRef.current = {};
      pendingWritesBySourceRef.current = {};
      optimisticOpsRef.current = {};
      setOptimisticOpsByList({});
      setHasPendingCloudWrites(false);
      return;
    }

    if (!user.emailVerified) {
      Object.values(itemUnsubsRef.current).forEach((u) => u());
      Object.values(memberUnsubsRef.current).forEach((u) => u());
      itemUnsubsRef.current = {};
      memberUnsubsRef.current = {};
      pendingWritesBySourceRef.current = {};
      setCloudListsMap({});
      setCloudItemsMap({});
      setCloudMembersMap({});
      setCloudRecipes(null);
      setHasPendingCloudWrites(false);
      setAuthError('Sua conta Google precisa estar com o e-mail verificado para sincronizar.');
      return;
    }

    const listsQuery = query(
      collection(db, 'lists'),
      where('memberIds', 'array-contains', user.uid)
    );

    const unsubLists = onSnapshot(
      listsQuery,
      { includeMetadataChanges: true },
      (snapshot) => {
        if (
          snapshot.empty &&
          !snapshot.metadata.fromCache &&
          !pendingInviteCodeRef.current &&
          !joiningInviteRef.current
        ) {
          void migrateLocalListsToCloud(user, localListsRef.current);
        }

        updatePendingWritesFlag('lists', snapshot.metadata.hasPendingWrites);

        const nextLists: Record<string, ShoppingList> = {};
        const activeIds = new Set<string>();

        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data({ serverTimestamps: 'estimate' });
          const listId = docSnap.id;
          activeIds.add(listId);

          nextLists[listId] = {
            id: listId,
            name: String(data.name ?? 'Lista'),
            budget: typeof data.budget === 'number' ? data.budget : null,
            ownerId: String(data.ownerId ?? ''),
            inviteCode: String(data.inviteCode ?? ''),
            memberIds: Array.isArray(data.memberIds) ? data.memberIds : [],
            updatedAt: toMillis(data.updatedAt),
            items: [],
            members: [],
            isSynced: true,
          };

          attachListSubListeners(listId);
        });

        // Cleanup listeners for removed/left lists
        Object.keys(itemUnsubsRef.current).forEach((id) => {
          if (!activeIds.has(id)) {
            itemUnsubsRef.current[id]();
            delete itemUnsubsRef.current[id];
            updatePendingWritesFlag(`items:${id}`, false);
          }
        });
        Object.keys(memberUnsubsRef.current).forEach((id) => {
          if (!activeIds.has(id)) {
            memberUnsubsRef.current[id]();
            delete memberUnsubsRef.current[id];
          }
        });

        cloudListsMapRef.current = nextLists;
        setCloudListsMap(nextLists);
        if (!snapshot.metadata.fromCache) {
          setSyncError(null);
        }
      },
      (err) => {
        const msg = reportFirestoreError(err, OperationType.LIST, 'lists');
        setSyncError(msg);
      }
    );

    const recipesQuery = query(
      collection(db, 'users', user.uid, 'recipes'),
      where('ownerId', '==', user.uid)
    );
    const recipesPath = `users/${user.uid}/recipes`;
    const unsubRecipes = onSnapshot(
      recipesQuery,
      (snapshot) => {
        if (snapshot.empty && !snapshot.metadata.fromCache) {
          void migrateLocalRecipesToCloud(user, localRecipesRef.current);
        }
        const parsed: Recipe[] = snapshot.docs
          .map((rDoc) => {
            const d = rDoc.data({ serverTimestamps: 'estimate' });
            const rawIngredients = Array.isArray(d.ingredients) ? d.ingredients : [];
            const ingredients: RecipeIngredient[] = rawIngredients
              .map(sanitizeRecipeIngredient)
              .filter((x): x is RecipeIngredient => x !== null);
            if (ingredients.length === 0) return null;
            return {
              id: rDoc.id,
              name: String(d.name ?? 'Receita'),
              emoji: typeof d.emoji === 'string' && d.emoji ? d.emoji : '🍲',
              notes: typeof d.notes === 'string' && d.notes ? d.notes : undefined,
              ingredients,
              updatedAt: toMillis(d.updatedAt),
            } as Recipe;
          })
          .filter((r): r is Recipe => r !== null)
          .sort((a, b) => b.updatedAt - a.updatedAt);
        setCloudRecipes(parsed);
      },
      (err) => {
        const msg = reportFirestoreError(err, OperationType.LIST, recipesPath);
        setSyncError(msg);
      }
    );

    const handleVisibilityOrOnline = () => {
      if (document.visibilityState === 'visible') {
        void syncNow(true);
      }
    };
    const handleOnline = () => {
      void syncNow(true);
    };

    document.addEventListener('visibilitychange', handleVisibilityOrOnline);
    window.addEventListener('focus', handleOnline);
    window.addEventListener('online', handleOnline);

    return () => {
      unsubLists();
      unsubRecipes();
      document.removeEventListener('visibilitychange', handleVisibilityOrOnline);
      window.removeEventListener('focus', handleOnline);
      window.removeEventListener('online', handleOnline);
      Object.values(itemUnsubsRef.current).forEach((u) => u());
      Object.values(memberUnsubsRef.current).forEach((u) => u());
      itemUnsubsRef.current = {};
      memberUnsubsRef.current = {};
      pendingWritesBySourceRef.current = {};
    };
  }, [
    authReady,
    user,
    attachListSubListeners,
    migrateLocalListsToCloud,
    migrateLocalRecipesToCloud,
    syncNow,
    updatePendingWritesFlag,
  ]);

  // Combine cloud lists when logged in, otherwise localLists
  const lists: ShoppingList[] = useMemo(() => {
    if (!user) return localLists;
    const cloudValues = Object.values(cloudListsMap).map((l) => ({
      ...l,
      items: mergeListItems(cloudItemsMap[l.id] ?? [], optimisticOpsByList[l.id]),
      members: cloudMembersMap[l.id] ?? [],
    }));
    if (cloudValues.length === 0) return localLists;
    return cloudValues.sort((a, b) => b.updatedAt - a.updatedAt);
  }, [user, localLists, cloudListsMap, cloudItemsMap, cloudMembersMap, optimisticOpsByList]);

  const recipes: Recipe[] = useMemo(() => {
    if (!user || cloudRecipes === null) return localRecipes;
    if (cloudRecipes.length === 0 && migratingRecipesRef.current) return localRecipes;
    return cloudRecipes;
  }, [user, cloudRecipes, localRecipes]);

  // Ensure activeListId always points to a valid list without clobbering newly joined/created cloud lists
  useEffect(() => {
    const pendingTarget = pendingTargetListIdRef.current;
    if (pendingTarget) {
      if (lists.some((l) => l.id === pendingTarget)) {
        if (activeListId !== pendingTarget) {
          setActiveListId(pendingTarget);
        }
        pendingTargetListIdRef.current = null;
      }
      return;
    }

    if (lists.length > 0 && !lists.some((l) => l.id === activeListId)) {
      setActiveListId(lists[0].id);
    }
  }, [lists, activeListId]);

  const activeList = useMemo(
    () => lists.find((l) => l.id === activeListId) ?? lists[0],
    [lists, activeListId]
  );

  const selectActiveList = useCallback((listId: string) => {
    pendingTargetListIdRef.current = null;
    setActiveListId(listId);
  }, []);

  const loginWithGoogle = useCallback(async () => {
    if (loginInFlightRef.current) return;
    loginInFlightRef.current = true;
    setAuthLoading(true);
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code?: unknown }).code ?? '')
          : '';
      const msg = err instanceof Error ? err.message : String(err);
      const combined = `${code} ${msg}`;

      if (combined.includes('popup-blocked')) {
        setAuthError('O navegador bloqueou a janela de login. Permita pop-ups e tente novamente.');
      } else if (
        combined.includes('popup-closed-by-user') ||
        combined.includes('cancelled-popup-request')
      ) {
        setAuthError(null);
      } else if (combined.includes('network-request-failed')) {
        setAuthError('Sem conexão para entrar com o Google. Verifique sua internet.');
      } else if (combined.includes('unauthorized-domain')) {
        setAuthError(
          'Domínio não autorizado no Firebase Auth. Adicione este domínio em Authentication > Configurações > Domínios autorizados.'
        );
      } else if (combined.includes('web-storage-unsupported')) {
        setAuthError('Seu navegador bloqueou cookies/armazenamento necessários para o login.');
      } else {
        setAuthError('Não foi possível entrar com o Google. Tente novamente.');
      }
    } finally {
      loginInFlightRef.current = false;
      setAuthLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    isLoggingOutRef.current = true;
    Object.values(itemUnsubsRef.current).forEach((u) => u());
    Object.values(memberUnsubsRef.current).forEach((u) => u());
    itemUnsubsRef.current = {};
    memberUnsubsRef.current = {};

    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        if (key !== PRIMARY_THEME_KEY && key !== ACCENT_THEME_KEY) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {
      // ignore storage access issues
    }

    try {
      sessionStorage.removeItem(PENDING_INVITE_KEY);
      sessionStorage.removeItem(INVITE_GUARD_KEY);
    } catch {
      // ignore
    }

    setCloudListsMap({});
    setCloudItemsMap({});
    setCloudMembersMap({});
    setCloudRecipes(null);
    setAppliedRecipesMap({});
    setLocalLists(INITIAL_LISTS);
    setLocalRecipes(INITIAL_RECIPES);
    setActiveListId(INITIAL_LISTS[0].id);
    setPendingInviteCode(null);
    setAuthError(null);

    const cacheCleared = await signOutUser();
    if (cacheCleared) {
      window.location.replace(window.location.pathname);
      return;
    }
    isLoggingOutRef.current = false;
  }, []);

  const joinListByCode = useCallback(
    async (rawCode: string): Promise<{ listName: string; alreadyMember: boolean }> => {
      if (!user) {
        throw new Error('Entre com sua conta Google antes de aceitar o convite.');
      }
      if (!user.emailVerified) {
        throw new Error('Sua conta Google precisa estar com o e-mail verificado.');
      }

      let guard = { fails: 0, blockedUntil: 0 };
      try {
        const savedGuard = sessionStorage.getItem(INVITE_GUARD_KEY);
        if (savedGuard) {
          const parsed = safeJsonParse(savedGuard, 1024);
          if (isPlainRecord(parsed)) {
            guard = {
              fails: typeof parsed.fails === 'number' ? parsed.fails : 0,
              blockedUntil: typeof parsed.blockedUntil === 'number' ? parsed.blockedUntil : 0,
            };
          }
        }
      } catch {
        guard = { fails: 0, blockedUntil: 0 };
      }

      const now = Date.now();
      if (guard.blockedUntil > now) {
        const remainingSecs = Math.max(1, Math.ceil((guard.blockedUntil - now) / 1000));
        throw new Error(
          `Muitas tentativas inválidas. Aguarde ${remainingSecs}s antes de tentar outro código.`
        );
      }

      const code = normalizeInviteCode(rawCode);
      if (!isValidInviteCodeFormat(code)) {
        throw new Error('O código de convite deve ter de 8 a 16 letras ou números.');
      }

      const invitePath = `invites/${code}`;
      let inviteSnap;
      try {
        inviteSnap = await getDoc(doc(db, 'invites', code));
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, invitePath);
      }

      if (!inviteSnap.exists()) {
        const nextFails = guard.fails + 1;
        const cooldownMs = nextFails >= 5 ? 30000 : nextFails >= 3 ? 15000 : 0;
        try {
          sessionStorage.setItem(
            INVITE_GUARD_KEY,
            JSON.stringify({
              fails: nextFails,
              blockedUntil: cooldownMs > 0 ? Date.now() + cooldownMs : 0,
            })
          );
        } catch {
          // ignore
        }
        throw new Error('Código de convite não encontrado ou revogado. Peça um novo código.');
      }

      try {
        sessionStorage.removeItem(INVITE_GUARD_KEY);
      } catch {
        // ignore
      }

      const inviteData = inviteSnap.data();
      const targetListId = typeof inviteData.listId === 'string' ? inviteData.listId.trim() : '';
      if (!targetListId || !SAFE_ID_REGEX.test(targetListId)) {
        throw new Error('Convite inválido ou corrompido.');
      }
      const listName = sanitizeText(inviteData.listName, 80) || 'Lista compartilhada';

      // Check if already a member
      if (cloudListsMap[targetListId]) {
        pendingTargetListIdRef.current = targetListId;
        setActiveListId(targetListId);
        void syncNow(true, targetListId);
        return { listName, alreadyMember: true };
      }

      const displayName =
        sanitizeText(user.displayName || user.email?.split('@')[0], 80) || 'Participante';

      const batch = writeBatch(db);
      batch.set(doc(db, 'lists', targetListId, 'members', user.uid), {
        uid: user.uid,
        displayName,
        role: 'editor',
        inviteCode: code,
        joinedAt: serverTimestamp(),
      });
      batch.update(doc(db, 'lists', targetListId), {
        memberIds: arrayUnion(user.uid),
        updatedAt: serverTimestamp(),
      });

      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `lists/${targetListId}`);
      }

      pendingTargetListIdRef.current = targetListId;
      setActiveListId(targetListId);
      await syncNow(true, targetListId);
      return { listName, alreadyMember: false };
    },
    [user, cloudListsMap, syncNow]
  );

  const regenerateInviteCode = useCallback(
    async (listId: string): Promise<string> => {
      if (!user || !user.emailVerified) {
        throw new Error('Faça login com e-mail verificado para gerenciar convites.');
      }
      const targetList = cloudListsMap[listId];
      if (!targetList || targetList.ownerId !== user.uid) {
        throw new Error('Apenas quem criou a lista pode gerar um novo código.');
      }

      const oldCode = targetList.inviteCode ?? '';
      let newCode = generateInviteCode();
      while (newCode === oldCode) {
        newCode = generateInviteCode();
      }

      let oldInviteExists = false;
      if (oldCode && isValidInviteCodeFormat(oldCode)) {
        try {
          const oldSnap = await getDoc(doc(db, 'invites', oldCode));
          oldInviteExists = oldSnap.exists();
        } catch {
          oldInviteExists = false;
        }
      }

      const listName = sanitizeText(targetList.name, 80) || 'Lista';
      const batch = writeBatch(db);
      batch.update(doc(db, 'lists', listId), {
        inviteCode: newCode,
        updatedAt: serverTimestamp(),
      });
      batch.set(doc(db, 'invites', newCode), {
        listId,
        listName,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
      });
      if (oldCode && oldInviteExists) {
        batch.delete(doc(db, 'invites', oldCode));
      }

      try {
        await batch.commit();
        return newCode;
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `lists/${listId}`);
      }
    },
    [user, cloudListsMap]
  );

  // Auto-join pending invite code once signed in with verified email
  useEffect(() => {
    if (!authReady || !user || !user.emailVerified || !pendingInviteCode) return;
    const code = pendingInviteCode;
    joiningInviteRef.current = true;
    setPendingInviteCode(null);
    sessionStorage.removeItem(PENDING_INVITE_KEY);
    void joinListByCode(code)
      .catch((err) => {
        setAuthError(err instanceof Error ? err.message : 'Erro ao entrar na lista.');
        if (Object.keys(cloudListsMapRef.current).length === 0) {
          void migrateLocalListsToCloud(user, localListsRef.current);
        }
      })
      .finally(() => {
        joiningInviteRef.current = false;
      });
  }, [authReady, user, pendingInviteCode, joinListByCode, migrateLocalListsToCloud]);

  const setPrimaryTheme = useCallback((id: string) => {
    setPrimaryThemeId(getPrimaryTheme(id).id);
  }, []);

  const setAccentTheme = useCallback((id: string) => {
    setAccentThemeId(getAccentTheme(id).id);
  }, []);

  const createList = useCallback(
    async (name: string, budget: number | null = null) => {
      const trimmed = sanitizeText(name, 80);
      if (!trimmed) return;
      const safeBudget =
        budget !== null && !Number.isNaN(budget) && budget >= 0
          ? Math.min(1000000, budget)
          : null;

      if (!user) {
        const newId = generateSafeId('lista');
        const newList: ShoppingList = {
          id: newId,
          name: trimmed,
          budget: safeBudget,
          items: [],
          updatedAt: Date.now(),
        };
        setLocalLists((prev) => [newList, ...prev]);
        setActiveListId(newId);
        return;
      }

      const listId = generateSafeId('list');
      const inviteCode = generateInviteCode();
      const displayName =
        sanitizeText(user.displayName || user.email?.split('@')[0], 80) || 'Você';

      const batch = writeBatch(db);
      batch.set(doc(db, 'lists', listId), {
        name: trimmed,
        budget: safeBudget,
        ownerId: user.uid,
        inviteCode,
        memberIds: [user.uid],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      batch.set(doc(db, 'lists', listId, 'members', user.uid), {
        uid: user.uid,
        displayName,
        role: 'owner',
        joinedAt: serverTimestamp(),
      });
      batch.set(doc(db, 'invites', inviteCode), {
        listId,
        listName: trimmed,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
      });

      try {
        pendingTargetListIdRef.current = listId;
        await batch.commit();
        setActiveListId(listId);
      } catch (err) {
        pendingTargetListIdRef.current = null;
        handleFirestoreError(err, OperationType.CREATE, `lists/${listId}`);
      }
    },
    [user]
  );

  const renameList = useCallback(
    async (listId: string, name: string, budget?: number | null) => {
      const trimmed = sanitizeText(name, 80);
      if (!trimmed) return;

      if (!user || !cloudListsMap[listId]) {
        setLocalLists((prev) =>
          prev.map((l) =>
            l.id === listId
              ? {
                  ...l,
                  name: trimmed,
                  budget: budget !== undefined ? budget : l.budget,
                  updatedAt: Date.now(),
                }
              : l
          )
        );
        return;
      }

      const currentBudget = cloudListsMap[listId]?.budget ?? null;
      const nextBudget =
        budget !== undefined
          ? budget !== null && budget >= 0
            ? Math.min(1000000, budget)
            : null
          : currentBudget;

      try {
        await updateDoc(doc(db, 'lists', listId), {
          name: trimmed,
          budget: nextBudget,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `lists/${listId}`);
      }
    },
    [user, cloudListsMap]
  );

  const updateListBudget = useCallback(
    async (listId: string, budget: number | null) => {
      const safeBudget =
        budget !== null && !Number.isNaN(budget) && budget >= 0
          ? Math.min(1000000, budget)
          : null;

      if (!user || !cloudListsMap[listId]) {
        setLocalLists((prev) =>
          prev.map((l) => (l.id === listId ? { ...l, budget: safeBudget, updatedAt: Date.now() } : l))
        );
        return;
      }

      try {
        await updateDoc(doc(db, 'lists', listId), {
          name: cloudListsMap[listId].name,
          budget: safeBudget,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `lists/${listId}`);
      }
    },
    [user, cloudListsMap]
  );

  const duplicateList = useCallback(
    async (listId: string) => {
      const source = lists.find((l) => l.id === listId);
      if (!source) return;

      if (!user) {
        const newId = generateSafeId('lista');
        const cloned: ShoppingList = {
          ...source,
          id: newId,
          name: `${source.name} (Cópia)`.slice(0, 80),
          updatedAt: Date.now(),
          items: source.items.map((item) => ({
            ...item,
            id: generateSafeId('item'),
            checked: false,
          })),
        };
        setLocalLists((prev) => [cloned, ...prev]);
        setActiveListId(newId);
        return;
      }

      const newListId = generateSafeId('list');
      const inviteCode = generateInviteCode();
      const newName = `${source.name} (Cópia)`.slice(0, 80);
      const displayName = (
        user.displayName ||
        user.email?.split('@')[0] ||
        'Você'
      ).slice(0, 80);

      const headerBatch = writeBatch(db);
      headerBatch.set(doc(db, 'lists', newListId), {
        name: newName,
        budget: source.budget ?? null,
        ownerId: user.uid,
        inviteCode,
        memberIds: [user.uid],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      headerBatch.set(doc(db, 'lists', newListId, 'members', user.uid), {
        uid: user.uid,
        displayName,
        role: 'owner',
        joinedAt: serverTimestamp(),
      });
      headerBatch.set(doc(db, 'invites', inviteCode), {
        listId: newListId,
        listName: newName,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
      });

      try {
        await headerBatch.commit();
        for (let i = 0; i < source.items.length; i += MAX_BATCH_OPS) {
          const itemBatch = writeBatch(db);
          for (const item of source.items.slice(i, i + MAX_BATCH_OPS)) {
            const itemId = generateSafeId('item');
            const cleanName = item.name.trim().slice(0, 100) || 'Item';
            const cleanCat = sanitizeCategory(item.category, cleanName);
            const cleanUnit = sanitizeUnit(item.unit);
            itemBatch.set(doc(db, 'lists', newListId, 'items', itemId), {
              name: cleanName,
              quantity: Math.min(10000, Math.max(0.1, Number(item.quantity) || 1)),
              unit: cleanUnit,
              price:
                item.price !== null && item.price >= 0
                  ? Math.min(1000000, Number(item.price))
                  : null,
              category: cleanCat,
              checked: false,
              note: item.note ? item.note.slice(0, 160) : null,
              emoji: (item.emoji || detectItemEmoji(cleanName, cleanCat)).slice(0, 16),
              addedBy: user.uid,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
          await itemBatch.commit();
        }
        pendingTargetListIdRef.current = newListId;
        setActiveListId(newListId);
      } catch (err) {
        pendingTargetListIdRef.current = null;
        handleFirestoreError(err, OperationType.CREATE, `lists/${newListId}`);
      }
    },
    [lists, user]
  );

  const deleteList = useCallback(
    async (listId: string) => {
      if (lists.length <= 1) return;

      if (!user || !cloudListsMap[listId]) {
        setLocalLists((prev) => {
          if (prev.length <= 1) return prev;
          const remaining = prev.filter((l) => l.id !== listId);
          if (activeListId === listId && remaining[0]) {
            setActiveListId(remaining[0].id);
          }
          return remaining;
        });
        return;
      }

      const target = cloudListsMap[listId];
      // If user is not owner, leave the list instead of deleting
      if (target.ownerId !== user.uid) {
        const batch = writeBatch(db);
        batch.update(doc(db, 'lists', listId), {
          memberIds: arrayRemove(user.uid),
          updatedAt: serverTimestamp(),
        });
        batch.delete(doc(db, 'lists', listId, 'members', user.uid));
        try {
          await batch.commit();
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `lists/${listId}`);
        }
        return;
      }

      try {
        const itemsSnap = await getDocs(collection(db, 'lists', listId, 'items'));
        const membersSnap = await getDocs(collection(db, 'lists', listId, 'members'));

        for (let i = 0; i < itemsSnap.docs.length; i += MAX_BATCH_OPS) {
          const itemBatch = writeBatch(db);
          itemsSnap.docs.slice(i, i + MAX_BATCH_OPS).forEach((d) => itemBatch.delete(d.ref));
          await itemBatch.commit();
        }

        const tailBatch = writeBatch(db);
        membersSnap.docs.forEach((d) => tailBatch.delete(d.ref));
        if (target.inviteCode) {
          tailBatch.delete(doc(db, 'invites', target.inviteCode));
        }
        tailBatch.delete(doc(db, 'lists', listId));
        await tailBatch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `lists/${listId}`);
      }
    },
    [lists.length, activeListId, user, cloudListsMap]
  );

  const removeMember = useCallback(
    async (listId: string, memberUid: string) => {
      if (!user || !cloudListsMap[listId]) return;
      const batch = writeBatch(db);
      batch.update(doc(db, 'lists', listId), {
        memberIds: arrayRemove(memberUid),
        updatedAt: serverTimestamp(),
      });
      batch.delete(doc(db, 'lists', listId, 'members', memberUid));
      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `lists/${listId}`);
      }
    },
    [user, cloudListsMap]
  );

  const addItem = useCallback(
    async (input: AddItemInput, targetListId?: string) => {
      const name = sanitizeText(input.name, 100);
      if (!name) return;
      const listId = targetListId ?? activeListIdRef.current ?? activeList?.id;
      if (!listId) return;

      const qty = Math.min(10000, Math.max(0.1, Number(input.quantity) || 1));
      const unit: UnitType = sanitizeUnit(input.unit);
      const category: CategoryId = sanitizeCategory(input.category, name);
      const price =
        input.price !== undefined && input.price !== null && Number.isFinite(input.price)
          ? Math.min(1000000, Math.max(0, Number(input.price)))
          : null;
      const cleanNote = sanitizeText(input.note, 160);
      const note = cleanNote || null;
      const emoji = sanitizeText(input.emoji, 16) || detectItemEmoji(name, category);

      if (!user || !cloudListsMapRef.current[listId]) {
        setLocalLists((prev) =>
          prev.map((list) => {
            if (list.id !== listId) return list;
            const existingIndex = list.items.findIndex(
              (i) => i.name.toLowerCase() === name.toLowerCase() && i.unit === unit && !i.checked
            );
            if (existingIndex >= 0) {
              const updatedItems = [...list.items];
              const existing = updatedItems[existingIndex];
              updatedItems[existingIndex] = {
                ...existing,
                quantity: Number((existing.quantity + qty).toFixed(2)),
                price: price !== null ? price : existing.price,
                note: note || existing.note,
                emoji: input.emoji?.trim() || existing.emoji || emoji,
              };
              return { ...list, items: updatedItems, updatedAt: Date.now() };
            }
            const newItem: ShoppingItem = {
              id: generateSafeId('item'),
              name,
              quantity: qty,
              unit,
              price,
              category,
              checked: false,
              note: note ?? undefined,
              emoji,
              createdAt: Date.now(),
            };
            return { ...list, items: [newItem, ...list.items], updatedAt: Date.now() };
          })
        );
        return;
      }

      const currentItems = mergeListItems(
        cloudItemsMapRef.current[listId] ?? [],
        optimisticOpsRef.current[listId]
      );
      const existing = currentItems.find(
        (i) => i.name.toLowerCase() === name.toLowerCase() && i.unit === unit && !i.checked
      );

      if (existing) {
        const nextQty = Math.min(10000, Number((existing.quantity + qty).toFixed(2)));
        const nextPrice = price !== null ? price : existing.price;
        const nextNote = note || existing.note || null;
        const nextEmoji = input.emoji?.trim() || existing.emoji || emoji;
        const itemPath = `lists/${listId}/items/${existing.id}`;
        const seq = applyOptimisticOp(listId, existing.id, {
          patch: {
            quantity: nextQty,
            price: nextPrice,
            note: nextNote ?? undefined,
            emoji: nextEmoji,
          },
        });
        try {
          await updateDoc(doc(db, 'lists', listId, 'items', existing.id), {
            quantity: nextQty,
            price: nextPrice,
            note: nextNote,
            emoji: nextEmoji,
            updatedAt: serverTimestamp(),
          });
          settleOptimisticOp(listId, existing.id, seq);
        } catch (err) {
          rollbackOptimisticOp(listId, existing.id, seq);
          setSyncError(reportFirestoreError(err, OperationType.UPDATE, itemPath));
        }
        return;
      }

      const itemId = generateSafeId('item');
      const itemPath = `lists/${listId}/items/${itemId}`;
      const optimisticItem: ShoppingItem = {
        id: itemId,
        name,
        quantity: qty,
        unit,
        price,
        category,
        checked: false,
        note: note ?? undefined,
        emoji,
        addedBy: user.uid,
        createdAt: Date.now(),
      };
      const seq = applyOptimisticOp(listId, itemId, { createdItem: optimisticItem });
      try {
        await setDoc(doc(db, 'lists', listId, 'items', itemId), {
          name,
          quantity: qty,
          unit,
          price,
          category,
          checked: false,
          note,
          emoji,
          addedBy: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        settleOptimisticOp(listId, itemId, seq);
      } catch (err) {
        rollbackOptimisticOp(listId, itemId, seq);
        setSyncError(reportFirestoreError(err, OperationType.CREATE, itemPath));
      }
    },
    [activeList?.id, user, applyOptimisticOp, settleOptimisticOp, rollbackOptimisticOp]
  );

  const toggleItem = useCallback(
    async (itemId: string) => {
      const listId = activeListIdRef.current ?? activeList?.id;
      if (!listId) return;

      if (!user || !cloudListsMapRef.current[listId]) {
        setLocalLists((prev) =>
          prev.map((list) =>
            list.id === listId
              ? {
                  ...list,
                  updatedAt: Date.now(),
                  items: list.items.map((item) =>
                    item.id === itemId ? { ...item, checked: !item.checked } : item
                  ),
                }
              : list
          )
        );
        return;
      }

      const currentItems = mergeListItems(
        cloudItemsMapRef.current[listId] ?? [],
        optimisticOpsRef.current[listId]
      );
      const target = currentItems.find((i) => i.id === itemId);
      if (!target) return;

      const nextChecked = !target.checked;
      const itemPath = `lists/${listId}/items/${itemId}`;
      const seq = applyOptimisticOp(listId, itemId, {
        patch: { checked: nextChecked },
      });

      try {
        await updateDoc(doc(db, 'lists', listId, 'items', itemId), {
          checked: nextChecked,
          updatedAt: serverTimestamp(),
        });
        settleOptimisticOp(listId, itemId, seq);
      } catch (err) {
        rollbackOptimisticOp(listId, itemId, seq);
        setSyncError(reportFirestoreError(err, OperationType.UPDATE, itemPath));
      }
    },
    [activeList?.id, user, applyOptimisticOp, settleOptimisticOp, rollbackOptimisticOp]
  );

  const updateItem = useCallback(
    async (itemId: string, patch: Partial<Omit<ShoppingItem, 'id' | 'createdAt'>>) => {
      const listId = activeListIdRef.current ?? activeList?.id;
      if (!listId) return;

      if (!user || !cloudListsMapRef.current[listId]) {
        setLocalLists((prev) =>
          prev.map((list) =>
            list.id === listId
              ? {
                  ...list,
                  updatedAt: Date.now(),
                  items: list.items.map((item) =>
                    item.id === itemId ? { ...item, ...patch } : item
                  ),
                }
              : list
          )
        );
        return;
      }

      const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
      const localPatch: Partial<ShoppingItem> = {};
      if (patch.name !== undefined) {
        const cleanName = sanitizeText(patch.name, 100);
        if (cleanName) {
          payload.name = cleanName;
          localPatch.name = cleanName;
        }
      }
      if (patch.quantity !== undefined) {
        const cleanQty = Math.min(10000, Math.max(0.1, Number(patch.quantity) || 1));
        payload.quantity = cleanQty;
        localPatch.quantity = cleanQty;
      }
      if (patch.unit !== undefined) {
        const cleanUnit = sanitizeUnit(patch.unit);
        payload.unit = cleanUnit;
        localPatch.unit = cleanUnit;
      }
      if (patch.price !== undefined) {
        const cleanPrice =
          patch.price !== null && Number.isFinite(patch.price) && patch.price >= 0
            ? Math.min(1000000, patch.price)
            : null;
        payload.price = cleanPrice;
        localPatch.price = cleanPrice;
      }
      if (patch.category !== undefined) {
        const cleanCategory = sanitizeCategory(patch.category, patch.name ?? '');
        payload.category = cleanCategory;
        localPatch.category = cleanCategory;
      }
      if (patch.checked !== undefined) {
        const cleanChecked = Boolean(patch.checked);
        payload.checked = cleanChecked;
        localPatch.checked = cleanChecked;
      }
      if (patch.note !== undefined) {
        const cleanNote = sanitizeText(patch.note, 160);
        payload.note = cleanNote || null;
        localPatch.note = cleanNote || undefined;
      }
      if (patch.emoji !== undefined) {
        const cleanEmoji = sanitizeText(patch.emoji, 16);
        payload.emoji = cleanEmoji || null;
        localPatch.emoji = cleanEmoji || undefined;
      }

      const itemPath = `lists/${listId}/items/${itemId}`;
      const seq = applyOptimisticOp(listId, itemId, { patch: localPatch });
      try {
        await updateDoc(doc(db, 'lists', listId, 'items', itemId), payload);
        settleOptimisticOp(listId, itemId, seq);
      } catch (err) {
        rollbackOptimisticOp(listId, itemId, seq);
        setSyncError(reportFirestoreError(err, OperationType.UPDATE, itemPath));
      }
    },
    [activeList?.id, user, applyOptimisticOp, settleOptimisticOp, rollbackOptimisticOp]
  );

  const stepQuantity = useCallback(
    async (itemId: string, delta: number) => {
      const listId = activeListIdRef.current ?? activeList?.id;
      if (!listId) return;

      if (!user || !cloudListsMapRef.current[listId]) {
        const localTarget = localListsRef.current
          .find((l) => l.id === listId)
          ?.items.find((i) => i.id === itemId);
        if (!localTarget) return;
        const step = localTarget.unit === 'kg' || localTarget.unit === 'L' ? 0.5 : 1;
        const nextQty = Math.min(
          10000,
          Math.max(step, Number((localTarget.quantity + delta * step).toFixed(2)))
        );
        setLocalLists((prev) =>
          prev.map((list) =>
            list.id === listId
              ? {
                  ...list,
                  updatedAt: Date.now(),
                  items: list.items.map((item) =>
                    item.id === itemId ? { ...item, quantity: nextQty } : item
                  ),
                }
              : list
          )
        );
        return;
      }

      const currentItems = mergeListItems(
        cloudItemsMapRef.current[listId] ?? [],
        optimisticOpsRef.current[listId]
      );
      const target = currentItems.find((i) => i.id === itemId);
      if (!target) return;

      const step = target.unit === 'kg' || target.unit === 'L' ? 0.5 : 1;
      const nextQty = Math.min(
        10000,
        Math.max(step, Number((target.quantity + delta * step).toFixed(2)))
      );

      const itemPath = `lists/${listId}/items/${itemId}`;
      const seq = applyOptimisticOp(listId, itemId, { patch: { quantity: nextQty } });
      try {
        await updateDoc(doc(db, 'lists', listId, 'items', itemId), {
          quantity: nextQty,
          updatedAt: serverTimestamp(),
        });
        settleOptimisticOp(listId, itemId, seq);
      } catch (err) {
        rollbackOptimisticOp(listId, itemId, seq);
        setSyncError(reportFirestoreError(err, OperationType.UPDATE, itemPath));
      }
    },
    [activeList?.id, user, applyOptimisticOp, settleOptimisticOp, rollbackOptimisticOp]
  );

  const deleteItem = useCallback(
    async (itemId: string) => {
      const listId = activeListIdRef.current ?? activeList?.id;
      if (!listId) return;

      if (!user || !cloudListsMapRef.current[listId]) {
        setLocalLists((prev) =>
          prev.map((list) =>
            list.id === listId
              ? {
                  ...list,
                  updatedAt: Date.now(),
                  items: list.items.filter((i) => i.id !== itemId),
                }
              : list
          )
        );
        return;
      }

      const itemPath = `lists/${listId}/items/${itemId}`;
      const seq = applyOptimisticOp(listId, itemId, { deleted: true });
      try {
        await deleteDoc(doc(db, 'lists', listId, 'items', itemId));
        settleOptimisticOp(listId, itemId, seq);
      } catch (err) {
        rollbackOptimisticOp(listId, itemId, seq);
        setSyncError(reportFirestoreError(err, OperationType.DELETE, itemPath));
      }
    },
    [activeList?.id, user, applyOptimisticOp, settleOptimisticOp, rollbackOptimisticOp]
  );

  const restoreItem = useCallback(
    async (item: ShoppingItem, targetListId: string) => {
      const cleanName = item.name.trim().slice(0, 100);
      if (!cleanName) return;
      const qty = Math.min(10000, Math.max(0.1, Number(item.quantity) || 1));
      const unit = sanitizeUnit(item.unit);
      const category = sanitizeCategory(item.category, cleanName);
      const price =
        item.price !== null && Number.isFinite(item.price) && item.price >= 0
          ? Math.min(1000000, item.price)
          : null;
      const note = item.note?.trim() ? item.note.trim().slice(0, 160) : null;
      const emoji = (item.emoji?.trim() || detectItemEmoji(cleanName, category)).slice(0, 16);
      const safeRecipeId =
        typeof item.recipeId === 'string' && SAFE_ID_REGEX.test(item.recipeId.trim())
          ? item.recipeId.trim().slice(0, 128)
          : null;
      const safeRecipeName = item.recipeName?.trim()
        ? item.recipeName.trim().slice(0, 80)
        : null;

      if (!user || !cloudListsMapRef.current[targetListId]) {
        setLocalLists((prev) =>
          prev.map((list) => {
            if (list.id !== targetListId) return list;
            const restored: ShoppingItem = {
              ...item,
              id: sanitizeId(item.id, 'item'),
              name: cleanName,
              quantity: qty,
              unit,
              price,
              category,
              note: note ?? undefined,
              emoji,
            };
            return { ...list, items: [restored, ...list.items], updatedAt: Date.now() };
          })
        );
        return;
      }

      const itemId = generateSafeId('item');
      const itemPath = `lists/${targetListId}/items/${itemId}`;
      const optimisticItem: ShoppingItem = {
        id: itemId,
        name: cleanName,
        quantity: qty,
        unit,
        price,
        category,
        checked: Boolean(item.checked),
        note: note ?? undefined,
        emoji,
        recipeId: safeRecipeId ?? undefined,
        recipeName: safeRecipeName ?? undefined,
        addedBy: user.uid,
        createdAt: Date.now(),
      };
      const seq = applyOptimisticOp(targetListId, itemId, { createdItem: optimisticItem });
      try {
        await setDoc(doc(db, 'lists', targetListId, 'items', itemId), {
          name: cleanName,
          quantity: qty,
          unit,
          price,
          category,
          checked: Boolean(item.checked),
          note,
          emoji,
          recipeId: safeRecipeId,
          recipeName: safeRecipeName,
          addedBy: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        settleOptimisticOp(targetListId, itemId, seq);
      } catch (err) {
        rollbackOptimisticOp(targetListId, itemId, seq);
        setSyncError(reportFirestoreError(err, OperationType.CREATE, itemPath));
      }
    },
    [user, applyOptimisticOp, settleOptimisticOp, rollbackOptimisticOp]
  );

  const saveRecipe = useCallback(
    async (input: {
      id?: string;
      name: string;
      emoji: string;
      notes?: string;
      ingredients: RecipeIngredient[];
    }) => {
      const cleanName = sanitizeText(input.name, 80);
      if (!cleanName || input.ingredients.length === 0) return;
      const cleanEmoji = sanitizeText(input.emoji, 16) || '🍲';
      const cleanNotes = sanitizeText(input.notes, 200) || undefined;
      const cleanIngredients: RecipeIngredient[] = input.ingredients
        .slice(0, 30)
        .map((ing) => {
          const n = sanitizeText(ing.name, 100);
          const cat = sanitizeCategory(ing.category, n);
          return {
            name: n,
            quantity: Math.min(10000, Math.max(0.1, Number(ing.quantity) || 1)),
            unit: sanitizeUnit(ing.unit),
            category: cat,
            emoji: sanitizeText(ing.emoji, 16) || detectItemEmoji(n, cat),
          };
        })
        .filter((ing) => ing.name.length > 0);
      if (cleanIngredients.length === 0) return;

      const isEdit = Boolean(input.id);
      const recipeId = input.id ? sanitizeId(input.id, 'receita') : generateSafeId('receita');

      if (!user) {
        const nextRecipe: Recipe = {
          id: recipeId,
          name: cleanName,
          emoji: cleanEmoji,
          notes: cleanNotes,
          ingredients: cleanIngredients,
          updatedAt: Date.now(),
        };
        setLocalRecipes((prev) =>
          isEdit ? prev.map((r) => (r.id === recipeId ? nextRecipe : r)) : [nextRecipe, ...prev]
        );
        return;
      }

      const recipePath = `users/${user.uid}/recipes/${recipeId}`;
      try {
        if (isEdit) {
          await updateDoc(doc(db, 'users', user.uid, 'recipes', recipeId), {
            name: cleanName,
            emoji: cleanEmoji,
            notes: cleanNotes ?? null,
            ingredients: cleanIngredients,
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(doc(db, 'users', user.uid, 'recipes', recipeId), {
            name: cleanName,
            emoji: cleanEmoji,
            notes: cleanNotes ?? null,
            ownerId: user.uid,
            ingredients: cleanIngredients,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        handleFirestoreError(err, isEdit ? OperationType.UPDATE : OperationType.CREATE, recipePath);
      }
    },
    [user]
  );

  const deleteRecipe = useCallback(
    async (recipeId: string) => {
      if (!user) {
        setLocalRecipes((prev) => prev.filter((r) => r.id !== recipeId));
        return;
      }
      const recipePath = `users/${user.uid}/recipes/${recipeId}`;
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'recipes', recipeId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, recipePath);
      }
    },
    [user]
  );

  const isRecipeApplied = useCallback(
    (recipeId: string): boolean => {
      if (!activeList) return false;
      const inItems = activeList.items.some((i) => i.recipeId === recipeId);
      const inMap = (appliedRecipesMap[activeList.id] ?? []).includes(recipeId);
      return inItems || inMap;
    },
    [activeList, appliedRecipesMap]
  );

  const addRecipeToList = useCallback(
    async (recipe: Recipe) => {
      if (!activeList) return;
      const listId = activeList.id;

      if (!user || !cloudListsMap[listId]) {
        setLocalLists((prev) =>
          prev.map((list) => {
            if (list.id !== listId) return list;
            const updatedItems = [...list.items];
            for (const ing of recipe.ingredients) {
              const idx = updatedItems.findIndex(
                (i) =>
                  i.name.toLowerCase() === ing.name.toLowerCase() &&
                  i.unit === ing.unit &&
                  !i.checked
              );
              if (idx >= 0) {
                const ex = updatedItems[idx];
                updatedItems[idx] = {
                  ...ex,
                  quantity: Math.min(10000, Number((ex.quantity + ing.quantity).toFixed(2))),
                };
              } else {
                updatedItems.unshift({
                  id: generateSafeId('item'),
                  name: ing.name,
                  quantity: ing.quantity,
                  unit: ing.unit,
                  price: null,
                  category: ing.category,
                  checked: false,
                  emoji: ing.emoji || detectItemEmoji(ing.name, ing.category),
                  recipeId: recipe.id,
                  recipeName: recipe.name,
                  createdAt: Date.now(),
                });
              }
            }
            return { ...list, items: updatedItems, updatedAt: Date.now() };
          })
        );
      } else {
        const currentItems = [...(cloudItemsMap[listId] ?? [])];
        const batch = writeBatch(db);
        let ops = 0;

        for (const ing of recipe.ingredients) {
          const existing = currentItems.find(
            (i) =>
              i.name.toLowerCase() === ing.name.toLowerCase() &&
              i.unit === ing.unit &&
              !i.checked
          );
          if (existing) {
            const nextQty = Math.min(10000, Number((existing.quantity + ing.quantity).toFixed(2)));
            batch.update(doc(db, 'lists', listId, 'items', existing.id), {
              quantity: nextQty,
              updatedAt: serverTimestamp(),
            });
            existing.quantity = nextQty;
            ops++;
          } else {
            const itemId = generateSafeId('item');
            batch.set(doc(db, 'lists', listId, 'items', itemId), {
              name: ing.name.trim().slice(0, 100),
              quantity: Math.min(10000, Math.max(0.1, Number(ing.quantity) || 1)),
              unit: sanitizeUnit(ing.unit),
              price: null,
              category: sanitizeCategory(ing.category, ing.name),
              checked: false,
              note: null,
              emoji: (ing.emoji || detectItemEmoji(ing.name, ing.category)).slice(0, 16),
              recipeId: recipe.id,
              recipeName: recipe.name.trim().slice(0, 80),
              addedBy: user.uid,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            ops++;
          }
        }

        if (ops > 0) {
          try {
            await batch.commit();
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, `lists/${listId}/items`);
          }
        }
      }

      setAppliedRecipesMap((prev) => {
        const current = prev[listId] ?? [];
        if (current.includes(recipe.id)) return prev;
        return { ...prev, [listId]: [...current, recipe.id].slice(0, 30) };
      });
    },
    [activeList, user, cloudListsMap, cloudItemsMap]
  );

  const removeRecipeFromList = useCallback(
    async (recipe: Recipe) => {
      if (!activeList) return;
      const listId = activeList.id;

      if (!user || !cloudListsMap[listId]) {
        setLocalLists((prev) =>
          prev.map((list) => {
            if (list.id !== listId) return list;
            let nextItems = [...list.items];

            for (const ing of recipe.ingredients) {
              // Prefer removing/decrementing item tagged with this recipe, fallback to matching name+unit
              let idx = nextItems.findIndex(
                (i) =>
                  i.recipeId === recipe.id &&
                  i.name.toLowerCase() === ing.name.toLowerCase() &&
                  i.unit === ing.unit
              );
              if (idx < 0) {
                idx = nextItems.findIndex(
                  (i) =>
                    !i.checked &&
                    i.name.toLowerCase() === ing.name.toLowerCase() &&
                    i.unit === ing.unit
                );
              }
              if (idx >= 0) {
                const target = nextItems[idx];
                const remaining = Number((target.quantity - ing.quantity).toFixed(2));
                if (remaining > 0.01) {
                  nextItems[idx] = { ...target, quantity: remaining };
                } else {
                  nextItems.splice(idx, 1);
                }
              }
            }

            // Clean up any leftover items still tagged with this recipeId (e.g. if recipe was edited)
            nextItems = nextItems.filter((i) => i.recipeId !== recipe.id);
            return { ...list, items: nextItems, updatedAt: Date.now() };
          })
        );
      } else {
        const currentItems = [...(cloudItemsMap[listId] ?? [])];
        const batch = writeBatch(db);
        const handledIds = new Set<string>();
        let ops = 0;

        for (const ing of recipe.ingredients) {
          let target = currentItems.find(
            (i) =>
              !handledIds.has(i.id) &&
              i.recipeId === recipe.id &&
              i.name.toLowerCase() === ing.name.toLowerCase() &&
              i.unit === ing.unit
          );
          if (!target) {
            target = currentItems.find(
              (i) =>
                !handledIds.has(i.id) &&
                !i.checked &&
                i.name.toLowerCase() === ing.name.toLowerCase() &&
                i.unit === ing.unit
            );
          }
          if (target) {
            handledIds.add(target.id);
            const remaining = Number((target.quantity - ing.quantity).toFixed(2));
            if (remaining > 0.01) {
              batch.update(doc(db, 'lists', listId, 'items', target.id), {
                quantity: remaining,
                updatedAt: serverTimestamp(),
              });
            } else {
              batch.delete(doc(db, 'lists', listId, 'items', target.id));
            }
            ops++;
          }
        }

        // Remove any remaining items still tagged with recipeId
        for (const item of currentItems) {
          if (!handledIds.has(item.id) && item.recipeId === recipe.id) {
            batch.delete(doc(db, 'lists', listId, 'items', item.id));
            ops++;
          }
        }

        if (ops > 0) {
          try {
            await batch.commit();
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, `lists/${listId}/items`);
          }
        }
      }

      setAppliedRecipesMap((prev) => {
        const current = prev[listId] ?? [];
        if (!current.includes(recipe.id)) return prev;
        return { ...prev, [listId]: current.filter((id) => id !== recipe.id) };
      });
    },
    [activeList, user, cloudListsMap, cloudItemsMap]
  );

  const clearCheckedItems = useCallback(async () => {
    if (!activeList) return;
    const listId = activeList.id;

    if (!user || !cloudListsMap[listId]) {
      setLocalLists((prev) =>
        prev.map((list) =>
          list.id === listId
            ? { ...list, updatedAt: Date.now(), items: list.items.filter((i) => !i.checked) }
            : list
        )
      );
      return;
    }

    const checkedItems = activeList.items.filter((i) => i.checked);
    try {
      for (let i = 0; i < checkedItems.length; i += MAX_BATCH_OPS) {
        const batch = writeBatch(db);
        checkedItems.slice(i, i + MAX_BATCH_OPS).forEach((item) => {
          batch.delete(doc(db, 'lists', listId, 'items', item.id));
        });
        await batch.commit();
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `lists/${listId}/items`);
    }
  }, [activeList, user, cloudListsMap]);

  const uncheckAllItems = useCallback(async () => {
    if (!activeList) return;
    const listId = activeList.id;

    if (!user || !cloudListsMap[listId]) {
      setLocalLists((prev) =>
        prev.map((list) =>
          list.id === listId
            ? {
                ...list,
                updatedAt: Date.now(),
                items: list.items.map((i) => ({ ...i, checked: false })),
              }
            : list
        )
      );
      return;
    }

    const checkedItems = activeList.items.filter((i) => i.checked);
    try {
      for (let i = 0; i < checkedItems.length; i += MAX_BATCH_OPS) {
        const batch = writeBatch(db);
        checkedItems.slice(i, i + MAX_BATCH_OPS).forEach((item) => {
          batch.update(doc(db, 'lists', listId, 'items', item.id), {
            checked: false,
            updatedAt: serverTimestamp(),
          });
        });
        await batch.commit();
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `lists/${listId}/items`);
    }
  }, [activeList, user, cloudListsMap]);

  const formatShareText = useCallback((): string => {
    if (!activeList) return '';
    const pending = activeList.items.filter((i) => !i.checked);
    const checked = activeList.items.filter((i) => i.checked);
    const lines: string[] = [`*${sanitizeShareLine(activeList.name, 80) || 'Lista'}*`];

    if (pending.length > 0) {
      lines.push('', 'Para comprar:');
      const byCat = new Map<CategoryId, ShoppingItem[]>();
      pending.forEach((item) => {
        const arr = byCat.get(item.category) ?? [];
        arr.push(item);
        byCat.set(item.category, arr);
      });
      Array.from(byCat.entries())
        .sort((a, b) => CATEGORY_MAP[a[0]].order - CATEGORY_MAP[b[0]].order)
        .forEach(([cat, items]) => {
          lines.push(`• ${CATEGORY_MAP[cat].label}`);
          items.forEach((item) => {
            const cleanName = sanitizeShareLine(item.name, 100);
            const cleanNote = item.note ? sanitizeShareLine(item.note, 160) : '';
            const priceText =
              item.price !== null ? ` — ${formatBRL(item.price * item.quantity)}` : '';
            const noteText = cleanNote ? ` (${cleanNote})` : '';
            lines.push(`  [ ] ${item.quantity} ${item.unit} ${cleanName}${noteText}${priceText}`);
          });
        });
    }

    if (checked.length > 0) {
      lines.push('', `No carrinho (${checked.length}):`);
      checked.forEach((item) => {
        const cleanName = sanitizeShareLine(item.name, 100);
        lines.push(`  [x] ${item.quantity} ${item.unit} ${cleanName}`);
      });
    }

    const total = activeList.items.reduce(
      (sum, item) => sum + (item.price ? item.price * item.quantity : 0),
      0
    );
    if (total > 0) {
      lines.push('', `Total estimado: ${formatBRL(total)}`);
    }

    return lines.join('\n');
  }, [activeList]);

  const exportBackupJson = useCallback((): string => {
    return JSON.stringify({ version: 1, exportedAt: Date.now(), lists }, null, 2);
  }, [lists]);

  const importBackupJson = useCallback((jsonText: string): boolean => {
    try {
      const parsed: unknown = safeJsonParse(jsonText, MAX_BACKUP_FILE_BYTES);
      const rawLists = Array.isArray(parsed)
        ? parsed
        : isPlainRecord(parsed)
          ? parsed.lists
          : null;
      if (!Array.isArray(rawLists) || rawLists.length === 0) return false;

      const sanitized = rawLists
        .slice(0, 30)
        .map(sanitizeShoppingList)
        .filter((l): l is ShoppingList => l !== null);

      if (sanitized.length === 0) return false;
      setLocalLists(sanitized);
      setActiveListId(sanitized[0].id);
      return true;
    } catch {
      return false;
    }
  }, []);

  const resetDemoData = useCallback(() => {
    setLocalLists(INITIAL_LISTS);
    setActiveListId(INITIAL_LISTS[0].id);
  }, []);

  const hasOptimisticInFlight = useMemo(
    () =>
      Object.values(optimisticOpsByList).some((ops) =>
        Object.values(ops).some((op) => !op.settled)
      ),
    [optimisticOpsByList]
  );

  const isSyncing = hasPendingCloudWrites || isRefreshingSync || hasOptimisticInFlight;
  const clearSyncError = useCallback(() => setSyncError(null), []);

  return {
    lists,
    activeList,
    activeListId,
    setActiveListId: selectActiveList,
    recipes,
    isRecipeApplied,
    saveRecipe,
    deleteRecipe,
    addRecipeToList,
    removeRecipeFromList,
    user,
    authReady,
    authLoading,
    authError,
    syncError,
    clearSyncError,
    isSyncing,
    syncNow: () => syncNow(false),
    pendingInviteCode,
    loginWithGoogle,
    logout,
    joinListByCode,
    regenerateInviteCode,
    removeMember,
    primaryThemeId,
    accentThemeId,
    setPrimaryTheme,
    setAccentTheme,
    createList,
    renameList,
    updateListBudget,
    duplicateList,
    deleteList,
    addItem,
    toggleItem,
    updateItem,
    stepQuantity,
    deleteItem,
    restoreItem,
    clearCheckedItems,
    uncheckAllItems,
    formatShareText,
    exportBackupJson,
    importBackupJson,
    resetDemoData,
  };
}
