import React, { useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { detectItemEmoji } from '../data/catalog';
import { Recipe, ShoppingItem } from '../types/shopping';

interface RecipesViewProps {
  activeListName: string;
  activeListItems?: ShoppingItem[];
  recipes: Recipe[];
  isRecipeApplied: (recipeId: string) => boolean;
  onAddRecipeToList: (recipe: Recipe) => void;
  onRemoveRecipeFromList: (recipe: Recipe) => void;
  onCreateRecipe: () => void;
  onEditRecipe: (recipe: Recipe) => void;
  onDeleteRecipe: (recipeId: string) => void;
}

export const RecipesView: React.FC<RecipesViewProps> = ({
  activeListName,
  activeListItems = [],
  recipes,
  isRecipeApplied,
  onAddRecipeToList,
  onRemoveRecipeFromList,
  onCreateRecipe,
  onEditRecipe,
  onDeleteRecipe,
}) => {
  const [search, setSearch] = useState('');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return recipes;
    return recipes.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.notes ?? '').toLowerCase().includes(q) ||
        r.ingredients.some((i) => i.name.toLowerCase().includes(q))
    );
  }, [recipes, search]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
    setConfirmDeleteId((prev) => (prev === id ? null : prev));
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink text-balance">
            Receitas
          </h1>
          <p className="mt-0.5 text-sm text-ink-muted">
            Adicione ou remova ingredientes em{' '}
            <strong className="font-semibold text-ink">{activeListName}</strong>.
          </p>
        </div>

        <button
          type="button"
          onClick={onCreateRecipe}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-fg hover:bg-accent-hover active:scale-[0.98] transition-all whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>Nova receita</span>
        </button>
      </div>

      {/* Search */}
      {recipes.length > 3 && (
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar receita ou ingrediente..."
            aria-label="Buscar receita ou ingrediente"
            className="w-full min-h-[44px] rounded-xl border border-line bg-surface pl-10 pr-10 text-sm text-ink placeholder:text-ink-muted/60 focus:border-accent focus:outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Limpar busca"
              className="absolute right-1 top-1/2 -translate-y-1/2 flex min-h-[38px] min-w-[38px] items-center justify-center rounded-lg text-ink-muted hover:bg-surface-muted hover:text-ink"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      {/* Recipes list */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface p-8 text-center">
          <p className="text-sm font-medium text-ink">
            {search.trim()
              ? `Nenhuma receita encontrada para "${search.trim()}".`
              : 'Você ainda não cadastrou nenhuma receita.'}
          </p>
          <div className="mt-4 flex justify-center">
            {search.trim() ? (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="min-h-[44px] rounded-xl border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-surface-muted"
              >
                Limpar busca
              </button>
            ) : (
              <button
                type="button"
                onClick={onCreateRecipe}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-fg hover:bg-accent-hover"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span>Criar primeira receita</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
          {filtered.map((recipe) => {
            const applied = isRecipeApplied(recipe.id);
            const isExpanded = Boolean(expandedIds[recipe.id]);
            const isConfirmingDelete = confirmDeleteId === recipe.id;
            const inListCount = applied
              ? activeListItems.filter((item) => item.recipeId === recipe.id).length
              : 0;

            return (
              <article
                key={recipe.id}
                className={`rounded-2xl border bg-surface p-3.5 transition-colors ${
                  applied ? 'border-accent/60' : 'border-line'
                }`}
              >
                {/* Clean single primary row: Recipe info + 1 Toggle button + Expand chevron */}
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => toggleExpand(recipe.id)}
                    aria-expanded={isExpanded}
                    className="flex items-center gap-2.5 min-w-0 flex-1 text-left rounded-xl py-0.5 focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    <span
                      aria-hidden="true"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-lg leading-none"
                    >
                      {recipe.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-[15px] font-semibold text-ink truncate">
                        {recipe.name}
                      </h2>
                      <p className="text-xs text-ink-muted truncate">
                        <span className="font-mono-tabular">
                          {recipe.ingredients.length}
                        </span>{' '}
                        {recipe.ingredients.length === 1 ? 'ingrediente' : 'ingredientes'}
                        {applied && inListCount > 0 ? (
                          <span className="text-accent-ink font-medium">
                            {' · '}
                            {inListCount} na lista
                          </span>
                        ) : null}
                        {recipe.notes ? ` · ${recipe.notes}` : ''}
                      </p>
                    </div>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        applied ? onRemoveRecipeFromList(recipe) : onAddRecipeToList(recipe)
                      }
                      aria-pressed={applied}
                      className={`inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all whitespace-nowrap shrink-0 active:scale-[0.97] ${
                        applied
                          ? 'border border-red-500/30 bg-red-500/5 text-red-600 dark:text-red-400 hover:bg-red-500/10'
                          : 'bg-accent-soft text-accent-ink hover:opacity-90'
                      }`}
                    >
                      {applied ? (
                        <>
                          <Check className="h-3.5 w-3.5 stroke-[2.5]" aria-hidden="true" />
                          <span>Remover</span>
                        </>
                      ) : (
                        <>
                          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Adicionar</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleExpand(recipe.id)}
                      aria-expanded={isExpanded}
                      aria-label={
                        isExpanded
                          ? `Ocultar ingredientes de ${recipe.name}`
                          : `Ver ingredientes de ${recipe.name}`
                      }
                      className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-ink-muted hover:bg-surface-muted hover:text-ink transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <ChevronDown className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expandable Ingredients + Management Footer */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      key={`${recipe.id}-details`}
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                      className="mt-3 pt-2.5 border-t border-line space-y-3"
                    >
                      <ul className="divide-y divide-line">
                        {recipe.ingredients.map((ing, idx) => (
                          <li
                            key={`${recipe.id}-ing-${idx}`}
                            className="flex items-center justify-between gap-3 py-1.5 text-xs"
                          >
                            <span className="flex items-center gap-2 min-w-0 text-ink font-medium truncate">
                              <span aria-hidden="true" className="text-sm shrink-0">
                                {ing.emoji || detectItemEmoji(ing.name, ing.category)}
                              </span>
                              <span className="truncate">{ing.name}</span>
                            </span>
                            <span className="font-mono-tabular text-ink-muted shrink-0">
                              {ing.quantity} {ing.unit}
                            </span>
                          </li>
                        ))}
                      </ul>

                      {isConfirmingDelete ? (
                        <div className="flex items-center justify-between gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2">
                          <span className="text-xs font-medium text-red-700 dark:text-red-300">
                            Excluir receita?
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="min-h-[36px] rounded-lg px-2.5 text-xs font-medium text-ink hover:bg-surface"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteRecipe(recipe.id);
                                setConfirmDeleteId(null);
                              }}
                              className="min-h-[36px] rounded-lg bg-red-600 px-3 text-xs font-semibold text-white hover:bg-red-700"
                            >
                              Excluir
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2 pt-0.5">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => onEditRecipe(recipe)}
                              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl px-2.5 text-xs font-medium text-ink-muted hover:bg-surface-muted hover:text-ink transition-colors"
                            >
                              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>Editar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(recipe.id)}
                              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl px-2.5 text-xs font-medium text-ink-muted hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>Excluir</span>
                            </button>
                          </div>

                          {applied && (
                            <button
                              type="button"
                              onClick={() => onAddRecipeToList(recipe)}
                              className="min-h-[40px] rounded-xl border border-line px-3 text-xs font-semibold text-ink hover:border-accent/60 active:scale-[0.98] transition-all"
                            >
                              +1 porção
                            </button>
                          )}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
