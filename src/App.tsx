import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChefHat,
  ChevronDown,
  ChevronsDownUp,
  ChevronsUpDown,
  Cloud,
  Layers,
  ListTodo,
  Plus,
  RotateCcw,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Users,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { ItemEditSheet } from './components/ItemEditSheet';
import { ListsManagerView } from './components/ListsManagerView';
import { ListSummaryCard } from './components/ListSummaryCard';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PWAInstallButton } from './components/PWAInstallButton';
import { QuickAddSheet } from './components/QuickAddSheet';
import { RecipeFormSheet } from './components/RecipeFormSheet';
import { RecipesView } from './components/RecipesView';
import { SettingsView } from './components/SettingsView';
import { ShoppingItemRow } from './components/ShoppingItemRow';
import { SyncShareSheet } from './components/SyncShareSheet';
import { CATEGORY_MAP, formatBRL } from './data/catalog';
import { useShoppingStore } from './hooks/useShoppingStore';
import { AppTab, CategoryId, FilterMode, Recipe, ShoppingItem } from './types/shopping';
import { triggerLightFeedback } from './utils/haptics';

export default function App() {
  const {
    lists,
    activeList,
    activeListId,
    setActiveListId,
    recipes,
    isRecipeApplied,
    saveRecipe,
    deleteRecipe,
    addRecipeToList,
    removeRecipeFromList,
    user,
    authLoading,
    authError,
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
  } = useShoppingStore();

  const [activeTab, setActiveTab] = useState<AppTab>('lista');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [groupByCategory, setGroupByCategory] = useState(true);
  const [inlineName, setInlineName] = useState('');
  const [listSearch, setListSearch] = useState('');
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);
  const [editingFocusPrice, setEditingFocusPrice] = useState(false);
  const [recipeFormOpen, setRecipeFormOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [statusToast, setStatusToast] = useState<{
    text: string;
    actionLabel?: string;
    onAction?: () => void;
  } | null>(null);
  const [lastDeleted, setLastDeleted] = useState<{ item: ShoppingItem; listId: string } | null>(null);
  const undoTimerRef = useRef<number | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setListSearch('');
  }, [activeListId]);

  useEffect(() => {
    setCollapsedCategories({});
  }, [activeListId]);

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  const showToast = (text: string, actionLabel?: string, onAction?: () => void) => {
    setStatusToast({ text, actionLabel, onAction });
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setStatusToast(null);
    }, 4000);
  };

  const handleDeleteWithUndo = (itemId: string) => {
    if (!activeList) return;
    const target = activeList.items.find((i) => i.id === itemId);
    void deleteItem(itemId);
    triggerLightFeedback(12);
    if (target) {
      setStatusToast(null);
      setLastDeleted({ item: target, listId: activeList.id });
      if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
      undoTimerRef.current = window.setTimeout(() => {
        setLastDeleted(null);
      }, 5000);
    }
  };

  const handleUndoDelete = () => {
    if (!lastDeleted) return;
    if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
    void restoreItem(lastDeleted.item, lastDeleted.listId);
    setLastDeleted(null);
  };

  const handleToggleItemWithFeedback = (itemId: string) => {
    if (!activeList) return;
    const target = activeList.items.find((i) => i.id === itemId);
    void toggleItem(itemId);

    if (target && !target.checked) {
      const remainingInCat = activeList.items.filter(
        (i) => i.category === target.category && !i.checked && i.id !== itemId
      ).length;
      const remainingTotal = activeList.items.filter(
        (i) => !i.checked && i.id !== itemId
      ).length;

      if (remainingInCat === 0 || remainingTotal === 0) {
        triggerLightFeedback([12, 30, 18]);
      } else {
        triggerLightFeedback(10);
      }
    }
  };

  const handleEditItem = (item: ShoppingItem, focusPrice = false) => {
    setEditingItem(item);
    setEditingFocusPrice(Boolean(focusPrice));
  };

  const filteredItems = useMemo(() => {
    if (!activeList) return [];
    const q = listSearch.trim().toLowerCase();
    const base = activeList.items.filter((item) => {
      if (filterMode === 'pending' && item.checked) return false;
      if (filterMode === 'checked' && !item.checked) return false;
      if (q && !item.name.toLowerCase().includes(q) && !(item.note ?? '').toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });

    return [...base].sort((a, b) => {
      if (a.checked !== b.checked) return a.checked ? 1 : -1;
      return b.createdAt - a.createdAt;
    });
  }, [activeList, filterMode, listSearch]);

  const groupedSections = useMemo(() => {
    const map = new Map<CategoryId, ShoppingItem[]>();
    filteredItems.forEach((item) => {
      const group = map.get(item.category) ?? [];
      group.push(item);
      map.set(item.category, group);
    });
    return Array.from(map.entries()).sort(
      (a, b) => CATEGORY_MAP[a[0]].order - CATEGORY_MAP[b[0]].order
    );
  }, [filteredItems]);

  const counts = useMemo(() => {
    if (!activeList) return { all: 0, pending: 0, checked: 0, inCartTotal: 0, total: 0 };
    const pending = activeList.items.filter((i) => !i.checked).length;
    const checked = activeList.items.length - pending;
    const total = activeList.items.reduce(
      (s, i) => s + (i.price !== null ? i.price * i.quantity : 0),
      0
    );
    const inCartTotal = activeList.items
      .filter((i) => i.checked)
      .reduce((s, i) => s + (i.price !== null ? i.price * i.quantity : 0), 0);
    return {
      all: activeList.items.length,
      pending,
      checked,
      inCartTotal,
      total,
    };
  }, [activeList]);

  const allCategoriesCollapsed = useMemo(() => {
    if (groupedSections.length === 0) return false;
    return groupedSections.every(([catId]) => Boolean(collapsedCategories[catId]));
  }, [groupedSections, collapsedCategories]);

  const handleToggleAllCategories = () => {
    if (allCategoriesCollapsed) {
      setCollapsedCategories({});
    } else {
      const next: Record<string, boolean> = {};
      groupedSections.forEach(([catId]) => {
        next[catId] = true;
      });
      setCollapsedCategories(next);
    }
  };

  const handleInlineAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = inlineName.trim();
    if (!cleaned) return;
    void addItem({ name: cleaned });
    setInlineName('');
    triggerLightFeedback(8);
    if (filterMode === 'checked') {
      setFilterMode('all');
    }
  };

  const handleAddRecipeWithFeedback = (recipe: Recipe) => {
    void addRecipeToList(recipe);
    triggerLightFeedback(12);
    showToast(
      `${recipe.ingredients.length} ${recipe.ingredients.length === 1 ? 'ingrediente' : 'ingredientes'} de ${recipe.name}`,
      'Ver lista',
      () => {
        setActiveTab('lista');
        setStatusToast(null);
      }
    );
  };

  const handleRemoveRecipeWithFeedback = (recipe: Recipe) => {
    void removeRecipeFromList(recipe);
    showToast(`Ingredientes de ${recipe.name} removidos`);
  };

  const toggleCategoryCollapse = (catId: CategoryId) => {
    setCollapsedCategories((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  const memberCount = activeList?.members?.length || activeList?.memberIds?.length || 1;
  const progressRatio = counts.all > 0 ? counts.checked / counts.all : 0;

  return (
    <div className="min-h-dvh flex flex-col bg-canvas text-ink">
      <OfflineIndicator />

      {/* Desktop Top Bar (3-Zone Contract) */}
      <header className="hidden lg:block sticky top-0 z-30 border-b border-line bg-canvas/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-8 px-6">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('lista');
            }}
            className="font-display text-xl font-bold tracking-tight text-ink whitespace-nowrap shrink-0"
          >
            Lista de Compras
          </a>

          <nav className="flex items-center gap-7 text-sm font-medium">
            {(
              [
                { id: 'lista', label: 'Lista atual' },
                { id: 'receitas', label: 'Receitas' },
                { id: 'listas', label: 'Minhas listas' },
                { id: 'ajustes', label: 'Ajustes' },
              ] as { id: AppTab; label: string }[]
            ).map((nav) => (
              <button
                key={nav.id}
                type="button"
                onClick={() => setActiveTab(nav.id)}
                className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 focus-visible:outline-2 focus-visible:outline-accent ${
                  activeTab === nav.id
                    ? 'border-accent text-ink font-semibold'
                    : 'border-transparent text-ink-muted hover:text-ink'
                }`}
              >
                {nav.label}
              </button>
            ))}
          </nav>

          <div className="shrink-0">
            <button
              type="button"
              onClick={() => setQuickAddOpen(true)}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-fg hover:bg-accent-hover active:scale-[0.98] transition-all whitespace-nowrap shrink-0"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>Novo item</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Compact Top App Bar (52px) */}
      <header className="lg:hidden sticky top-0 z-30 border-b border-line bg-canvas/90 backdrop-blur-md">
        <div className="flex h-[52px] items-center justify-between gap-3 px-4">
          <span className="font-display text-lg font-bold tracking-tight text-ink whitespace-nowrap shrink-0">
            Lista de Compras
          </span>
          <div className="flex items-center gap-2">
            <PWAInstallButton variant="compact" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-3.5 sm:px-6 pt-2.5 sm:pt-4 pb-20 lg:py-7">
        {/* Pending Invite Banner */}
        {pendingInviteCode && !user && (
          <div className="mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-accent/30 bg-accent-soft p-3.5">
            <div className="text-sm text-ink">
              <p className="font-semibold">Convite recebido ({pendingInviteCode})</p>
              <p className="text-xs text-ink-muted mt-0.5">
                Entre com sua conta Google para sincronizar esta lista compartilhada em tempo real.
              </p>
            </div>
            <button
              type="button"
              disabled={authLoading}
              onClick={() => void loginWithGoogle()}
              className="min-h-[40px] rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-accent-fg hover:bg-accent-hover disabled:opacity-60 whitespace-nowrap shrink-0"
            >
              {authLoading ? 'Conectando...' : 'Entrar com Google'}
            </button>
          </div>
        )}

        {activeTab === 'lista' && activeList && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-7 items-start">
            {/* Primary Column */}
            <div className="lg:col-span-8 space-y-2.5 sm:space-y-3">
              {/* Compact List Header + Progress + Toolbar */}
              <div className="space-y-1.5">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                  <div className="min-w-0">
                    <div className="relative inline-flex items-center max-w-full">
                      <select
                        aria-label="Selecionar lista ativa"
                        value={activeListId}
                        onChange={(e) => setActiveListId(e.target.value)}
                        className="appearance-none bg-transparent pr-7 font-display text-xl sm:text-2xl font-bold tracking-tight text-ink focus:outline-none cursor-pointer max-w-full truncate"
                      >
                        {lists.map((l) => (
                          <option key={l.id} value={l.id} className="text-base bg-surface text-ink">
                            {l.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        className="pointer-events-none absolute right-0.5 h-5 w-5 text-ink-muted"
                        aria-hidden="true"
                      />
                    </div>

                    {/* Unboxed metadata line */}
                    <p className="mt-0.5 text-xs sm:text-sm text-ink-muted">
                      <span className="font-mono-tabular">
                        {counts.checked}/{counts.all}
                      </span>{' '}
                      no carrinho
                      {counts.total > 0 && (
                        <>
                          <span aria-hidden="true"> · </span>
                          <span className="font-mono-tabular font-medium text-ink">
                            {formatBRL(counts.inCartTotal)} / {formatBRL(counts.total)}
                          </span>
                        </>
                      )}
                      {user && activeList.isSynced && (
                        <>
                          <span aria-hidden="true"> · </span>
                          <span className="text-accent-ink font-medium">
                            {memberCount > 1 ? `${memberCount} pessoas` : 'Sincronizada'}
                          </span>
                        </>
                      )}
                    </p>
                  </div>

                  {/* Toolbar buttons */}
                  <div className="flex items-center gap-1.5 self-start overflow-x-auto no-scrollbar max-w-full">
                    <button
                      type="button"
                      onClick={() => setSyncOpen(true)}
                      className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                        user
                          ? 'border-accent/40 bg-accent-soft text-accent-ink'
                          : 'border-line bg-surface text-ink'
                      }`}
                    >
                      {user ? (
                        <Users className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      ) : (
                        <Cloud className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      )}
                      <span>
                        {user
                          ? memberCount > 1
                            ? `Dividida (${memberCount})`
                            : 'Convidar'
                          : 'Sincronizar'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setGroupByCategory((g) => !g)}
                      className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                        groupByCategory
                          ? 'border-line bg-surface text-ink'
                          : 'border-line bg-surface text-ink-muted'
                      }`}
                    >
                      <Layers className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span>{groupByCategory ? 'Por corredor' : 'Simples'}</span>
                    </button>

                    {groupByCategory && groupedSections.length >= 3 && (
                      <button
                        type="button"
                        onClick={handleToggleAllCategories}
                        aria-label={allCategoriesCollapsed ? 'Expandir todos os corredores' : 'Recolher todos os corredores'}
                        className="inline-flex min-h-[36px] items-center gap-1 rounded-xl border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink-muted hover:text-ink transition-colors whitespace-nowrap shrink-0"
                      >
                        {allCategoriesCollapsed ? (
                          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        ) : (
                          <ChevronsDownUp className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        )}
                        <span>{allCategoriesCollapsed ? 'Expandir' : 'Recolher'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Smooth GPU-animated Shopping Progress Bar */}
                {counts.all > 0 && (
                  <div
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={counts.all}
                    aria-valuenow={counts.checked}
                    aria-label="Progresso da compra"
                    className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted"
                  >
                    <motion.div
                      initial={false}
                      animate={{ scaleX: progressRatio }}
                      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                      style={{ originX: 0 }}
                      className="h-full w-full rounded-full bg-accent"
                    />
                  </div>
                )}
              </div>

              {/* Inline Quick Add */}
              <form onSubmit={handleInlineAdd} className="flex gap-2">
                <input
                  type="text"
                  maxLength={100}
                  value={inlineName}
                  onChange={(e) => setInlineName(e.target.value)}
                  placeholder="Adicionar item rápido..."
                  aria-label="Adicionar item rápido"
                  className="min-h-[42px] flex-1 rounded-xl border border-line bg-surface px-3.5 text-sm text-ink placeholder:text-ink-muted/60 focus:border-accent focus:outline-none"
                />
                <button
                  type="submit"
                  aria-label="Adicionar item"
                  className="min-h-[42px] rounded-xl bg-accent px-3.5 text-sm font-semibold text-accent-fg hover:bg-accent-hover active:scale-[0.98] transition-all whitespace-nowrap shrink-0"
                >
                  Adicionar
                </button>
              </form>

              {/* Single-line Scrollable Filter Tabs */}
              <div className="flex items-center justify-between gap-2">
                <div className="inline-flex items-center gap-1 rounded-xl bg-surface-muted p-0.5 overflow-x-auto no-scrollbar max-w-full">
                  {(
                    [
                      { id: 'all', label: `Todos (${counts.all})` },
                      { id: 'pending', label: `Faltam (${counts.pending})` },
                      { id: 'checked', label: `Carrinho (${counts.checked})` },
                    ] as { id: FilterMode; label: string }[]
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setFilterMode(tab.id)}
                      className={`min-h-[34px] rounded-lg px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                        filterMode === tab.id
                          ? 'bg-surface text-ink shadow-xs font-semibold'
                          : 'text-ink-muted hover:text-ink'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick search inside long lists */}
              {activeList.items.length >= 6 && (
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={listSearch}
                    onChange={(e) => setListSearch(e.target.value)}
                    placeholder="Filtrar itens nesta lista..."
                    aria-label="Filtrar itens nesta lista"
                    className="w-full min-h-[42px] rounded-xl border border-line bg-surface pl-10 pr-10 text-sm text-ink placeholder:text-ink-muted/60 focus:border-accent focus:outline-none"
                  />
                  {listSearch && (
                    <button
                      type="button"
                      onClick={() => setListSearch('')}
                      aria-label="Limpar filtro"
                      className="absolute right-1 top-1/2 -translate-y-1/2 flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg text-ink-muted hover:bg-surface-muted hover:text-ink"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              )}

              {/* Shopping List Items */}
              {filteredItems.length === 0 ? (
                <div className="rounded-2xl border border-line bg-surface p-7 text-center">
                  <p className="text-sm font-medium text-ink">
                    {listSearch.trim()
                      ? `Nenhum item encontrado para "${listSearch.trim()}".`
                      : activeList.items.length === 0
                        ? 'Esta lista está vazia.'
                        : filterMode === 'pending'
                          ? 'Tudo no carrinho! Nenhum item pendente.'
                          : 'Nenhum item marcado no carrinho ainda.'}
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {listSearch.trim() ? (
                      <button
                        type="button"
                        onClick={() => setListSearch('')}
                        className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-surface-muted"
                      >
                        Limpar filtro
                      </button>
                    ) : activeList.items.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => setFilterMode('all')}
                        className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-surface-muted"
                      >
                        Ver todos os itens
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setQuickAddOpen(true)}
                          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-fg hover:bg-accent-hover"
                        >
                          <Plus className="h-4 w-4" aria-hidden="true" />
                          <span>Adicionar item</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab('receitas')}
                          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-surface-muted"
                        >
                          Ver receitas
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ) : groupByCategory ? (
                <div className="space-y-2.5 sm:space-y-3">
                  {groupedSections.map(([catId, items]) => {
                    const isCollapsed = Boolean(collapsedCategories[catId]);
                    const pendingInCat = items.filter((i) => !i.checked).length;
                    const catDone = pendingInCat === 0 && items.length > 0;
                    return (
                      <section
                        key={catId}
                        aria-label={CATEGORY_MAP[catId].label}
                        className="rounded-2xl border border-line bg-surface overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() => toggleCategoryCollapse(catId)}
                          aria-expanded={!isCollapsed}
                          className={`flex w-full min-h-[38px] items-center justify-between px-3.5 py-1.5 text-left hover:bg-surface-muted/40 focus-visible:outline-2 focus-visible:outline-accent transition-colors ${
                            !isCollapsed ? 'border-b border-line' : ''
                          }`}
                        >
                          <span className="text-xs font-semibold tracking-wide text-ink-muted">
                            {CATEGORY_MAP[catId].label}
                          </span>
                          <span className="flex items-center gap-2 font-mono-tabular text-xs tabular-nums">
                            {catDone ? (
                              <span className="inline-flex items-center gap-1 font-semibold text-accent-ink">
                                <Check className="h-3.5 w-3.5 stroke-[2.5]" aria-hidden="true" />
                                <span>Concluído</span>
                              </span>
                            ) : (
                              <span className="text-ink-muted">
                                {pendingInCat}/{items.length}
                              </span>
                            )}
                            <ChevronDown
                              className={`h-3.5 w-3.5 text-ink-muted transition-transform duration-150 ${
                                isCollapsed ? '-rotate-90' : 'rotate-0'
                              }`}
                              aria-hidden="true"
                            />
                          </span>
                        </button>
                        {!isCollapsed && (
                          <div className="divide-y divide-line">
                            <AnimatePresence initial={false}>
                              {items.map((item) => (
                                <motion.div
                                  key={item.id}
                                  initial={{ opacity: 0, y: -4 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, x: -20 }}
                                  transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                                >
                                  <ShoppingItemRow
                                    item={item}
                                    onToggle={handleToggleItemWithFeedback}
                                    onStepQuantity={(id, delta) => void stepQuantity(id, delta)}
                                    onEdit={handleEditItem}
                                    onDelete={handleDeleteWithUndo}
                                  />
                                </motion.div>
                              ))}
                            </AnimatePresence>
                          </div>
                        )}
                      </section>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-line bg-surface overflow-hidden divide-y divide-line">
                  <AnimatePresence initial={false}>
                    {filteredItems.map((item) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                      >
                        <ShoppingItemRow
                          item={item}
                          onToggle={handleToggleItemWithFeedback}
                          onStepQuantity={(id, delta) => void stepQuantity(id, delta)}
                          onEdit={handleEditItem}
                          onDelete={handleDeleteWithUndo}
                          showCategory
                          categoryLabel={CATEGORY_MAP[item.category].label}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}

              {/* Mobile Summary Card below list */}
              <div className="lg:hidden pt-1">
                <ListSummaryCard
                  list={activeList}
                  onUpdateBudget={(b) => void updateListBudget(activeList.id, b)}
                  onClearChecked={() => void clearCheckedItems()}
                  onUncheckAll={() => void uncheckAllItems()}
                  getShareText={formatShareText}
                />
              </div>
            </div>

            {/* Desktop Right Sidebar */}
            <aside className="hidden lg:block lg:col-span-4 lg:sticky lg:top-24 space-y-5">
              <ListSummaryCard
                list={activeList}
                onUpdateBudget={(b) => void updateListBudget(activeList.id, b)}
                onClearChecked={() => void clearCheckedItems()}
                onUncheckAll={() => void uncheckAllItems()}
                getShareText={formatShareText}
              />

              <PWAInstallButton variant="full" />
            </aside>
          </div>
        )}

        {activeTab === 'receitas' && activeList && (
          <RecipesView
            activeListName={activeList.name}
            activeListItems={activeList.items}
            recipes={recipes}
            isRecipeApplied={isRecipeApplied}
            onAddRecipeToList={handleAddRecipeWithFeedback}
            onRemoveRecipeFromList={handleRemoveRecipeWithFeedback}
            onCreateRecipe={() => {
              setEditingRecipe(null);
              setRecipeFormOpen(true);
            }}
            onEditRecipe={(recipe) => {
              setEditingRecipe(recipe);
              setRecipeFormOpen(true);
            }}
            onDeleteRecipe={(recipeId) => void deleteRecipe(recipeId)}
          />
        )}

        {activeTab === 'listas' && (
          <ListsManagerView
            lists={lists}
            activeListId={activeListId}
            isSignedIn={Boolean(user)}
            onOpenSync={() => setSyncOpen(true)}
            onSelectList={(id) => {
              setActiveListId(id);
              setActiveTab('lista');
            }}
            onCreateList={(name, budget) => void createList(name, budget)}
            onRenameList={(id, name, budget) => void renameList(id, name, budget)}
            onDuplicateList={(id) => void duplicateList(id)}
            onDeleteList={(id) => void deleteList(id)}
          />
        )}

        {activeTab === 'ajustes' && (
          <SettingsView
            user={user}
            onOpenSync={() => setSyncOpen(true)}
            primaryThemeId={primaryThemeId}
            accentThemeId={accentThemeId}
            onSelectPrimaryTheme={setPrimaryTheme}
            onSelectAccentTheme={setAccentTheme}
            onExportBackup={exportBackupJson}
            onImportBackup={importBackupJson}
            onResetDemo={resetDemoData}
          />
        )}
      </main>

      {/* Undo Delete / Action Toast */}
      <AnimatePresence>
        {lastDeleted ? (
          <motion.div
            key="undo-toast"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            role="status"
            className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] lg:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-2.5 shadow-lg max-w-[calc(100vw-2rem)]"
          >
            <span className="truncate text-xs sm:text-sm text-ink">
              <strong>{lastDeleted.item.name}</strong> removido
            </span>
            <button
              type="button"
              onClick={handleUndoDelete}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl bg-accent-soft px-3 text-xs font-semibold text-accent-ink hover:opacity-90 whitespace-nowrap shrink-0"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Desfazer</span>
            </button>
          </motion.div>
        ) : statusToast ? (
          <motion.div
            key="status-toast"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            role="status"
            className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] lg:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-2.5 shadow-lg max-w-[calc(100vw-2rem)]"
          >
            <span className="truncate text-xs sm:text-sm font-medium text-ink">
              {statusToast.text}
            </span>
            {statusToast.actionLabel && statusToast.onAction && (
              <button
                type="button"
                onClick={statusToast.onAction}
                className="inline-flex min-h-[36px] items-center rounded-xl bg-accent-soft px-3 text-xs font-semibold text-accent-ink hover:opacity-90 whitespace-nowrap shrink-0"
              >
                {statusToast.actionLabel}
              </button>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Mobile Fixed Bottom Tab Bar (56px) */}
      <nav
        aria-label="Navegação principal"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-line bg-surface/95 backdrop-blur-md pb-safe"
      >
        <div className="grid grid-cols-5 items-center h-14 px-1">
          <button
            type="button"
            onClick={() => setActiveTab('lista')}
            className={`relative flex flex-col items-center justify-center min-h-[44px] rounded-xl transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
              activeTab === 'lista' ? 'text-accent-ink font-semibold' : 'text-ink-muted'
            }`}
          >
            {activeTab === 'lista' && (
              <motion.span
                layoutId="mobile-tab-indicator"
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="absolute top-0.5 h-0.5 w-6 rounded-full bg-accent"
              />
            )}
            <ShoppingBag className="h-[22px] w-[22px]" aria-hidden="true" />
            <span className="mt-0.5 text-[10px] tracking-tight">Lista</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('receitas')}
            className={`relative flex flex-col items-center justify-center min-h-[44px] rounded-xl transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
              activeTab === 'receitas' ? 'text-accent-ink font-semibold' : 'text-ink-muted'
            }`}
          >
            {activeTab === 'receitas' && (
              <motion.span
                layoutId="mobile-tab-indicator"
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="absolute top-0.5 h-0.5 w-6 rounded-full bg-accent"
              />
            )}
            <ChefHat className="h-[22px] w-[22px]" aria-hidden="true" />
            <span className="mt-0.5 text-[10px] tracking-tight">Receitas</span>
          </button>

          <div className="flex items-center justify-center">
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={() => setQuickAddOpen(true)}
              aria-label="Adicionar novo item"
              className="flex h-11 w-12 items-center justify-center rounded-xl bg-accent text-accent-fg shadow-xs focus-visible:outline-2 focus-visible:outline-accent"
            >
              <Plus className="h-5 w-5" aria-hidden="true" />
            </motion.button>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('listas')}
            className={`relative flex flex-col items-center justify-center min-h-[44px] rounded-xl transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
              activeTab === 'listas' ? 'text-accent-ink font-semibold' : 'text-ink-muted'
            }`}
          >
            {activeTab === 'listas' && (
              <motion.span
                layoutId="mobile-tab-indicator"
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="absolute top-0.5 h-0.5 w-6 rounded-full bg-accent"
              />
            )}
            <ListTodo className="h-[22px] w-[22px]" aria-hidden="true" />
            <span className="mt-0.5 text-[10px] tracking-tight">Listas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ajustes')}
            className={`relative flex flex-col items-center justify-center min-h-[44px] rounded-xl transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
              activeTab === 'ajustes' ? 'text-accent-ink font-semibold' : 'text-ink-muted'
            }`}
          >
            {activeTab === 'ajustes' && (
              <motion.span
                layoutId="mobile-tab-indicator"
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="absolute top-0.5 h-0.5 w-6 rounded-full bg-accent"
              />
            )}
            <SlidersHorizontal className="h-[22px] w-[22px]" aria-hidden="true" />
            <span className="mt-0.5 text-[10px] tracking-tight">Ajustes</span>
          </button>
        </div>
      </nav>

      {/* Modals / Bottom Sheets */}
      <QuickAddSheet
        open={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        onAdd={(input) => {
          void addItem(input);
          if (activeTab !== 'lista') setActiveTab('lista');
          if (filterMode === 'checked') setFilterMode('all');
        }}
      />

      <ItemEditSheet
        item={editingItem}
        autoFocusPrice={editingFocusPrice}
        onClose={() => {
          setEditingItem(null);
          setEditingFocusPrice(false);
        }}
        onSave={(id, patch) => void updateItem(id, patch)}
        onDelete={handleDeleteWithUndo}
      />

      <RecipeFormSheet
        open={recipeFormOpen}
        editingRecipe={editingRecipe}
        onClose={() => {
          setRecipeFormOpen(false);
          setEditingRecipe(null);
        }}
        onSave={(input) => void saveRecipe(input)}
      />

      <SyncShareSheet
        open={syncOpen}
        onClose={() => setSyncOpen(false)}
        user={user}
        authLoading={authLoading}
        authError={authError}
        activeList={activeList}
        onLogin={loginWithGoogle}
        onLogout={logout}
        onJoinByCode={joinListByCode}
        onRegenerateInviteCode={regenerateInviteCode}
        onRemoveMember={removeMember}
      />
    </div>
  );
}
