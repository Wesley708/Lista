import React, { useMemo, useState } from 'react';
import { AlertTriangle, Check, RotateCcw, Share2, Trash2 } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { CATEGORY_MAP, formatBRL } from '../data/catalog';
import { CategoryId, ShoppingList } from '../types/shopping';
import { parseBoundedBudget } from '../utils/security';

interface ListSummaryCardProps {
  list: ShoppingList;
  onUpdateBudget: (budget: number | null) => void;
  onClearChecked: () => void;
  onUncheckAll: () => void;
  getShareText: () => string;
}

const CATEGORY_CHART_COLORS: Record<CategoryId, string> = {
  hortifruti: '#16A34A',
  padaria: '#D97706',
  acougue: '#E11D48',
  laticinios: '#0EA5E9',
  mercearia: '#2563EB',
  bebidas: '#7C3AED',
  limpeza: '#0D9488',
  higiene: '#EC4899',
  outros: '#64748B',
};

interface CategorySpendDatum {
  id: CategoryId;
  label: string;
  value: number;
  pct: number;
  exactPct: number;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload?: CategorySpendDatum;
  }>;
}

const CategoryChartTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  const datum = active ? payload?.[0]?.payload : undefined;
  if (!datum) return null;

  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2 shadow-lg">
      <div className="flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-xs"
          style={{ backgroundColor: datum.color }}
          aria-hidden="true"
        />
        <span className="text-xs font-semibold text-ink">{datum.label}</span>
      </div>
      <div className="mt-1 flex items-baseline gap-1.5 font-mono-tabular text-xs tabular-nums">
        <span className="font-bold text-ink">
          {datum.exactPct.toFixed(1).replace('.', ',')}%
        </span>
        <span className="text-ink-muted" aria-hidden="true">
          ·
        </span>
        <span className="text-ink-muted">{formatBRL(datum.value)}</span>
      </div>
    </div>
  );
};

export const ListSummaryCard: React.FC<ListSummaryCardProps> = ({
  list,
  onUpdateBudget,
  onClearChecked,
  onUncheckAll,
  getShareText,
}) => {
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState<CategoryId | null>(null);

  const totalCount = list.items.length;
  const checkedCount = list.items.filter((i) => i.checked).length;
  const progressPct = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  const estimatedTotal = list.items.reduce(
    (sum, i) => sum + (i.price !== null ? i.price * i.quantity : 0),
    0
  );
  const inCartTotal = list.items
    .filter((i) => i.checked)
    .reduce((sum, i) => sum + (i.price !== null ? i.price * i.quantity : 0), 0);

  const categoryBreakdown = useMemo<CategorySpendDatum[]>(() => {
    if (estimatedTotal <= 0) return [];

    const totalsByCategory = new Map<CategoryId, number>();
    for (const item of list.items) {
      if (item.price === null || item.price <= 0) continue;
      const lineValue = item.price * item.quantity;
      if (lineValue <= 0) continue;
      totalsByCategory.set(item.category, (totalsByCategory.get(item.category) ?? 0) + lineValue);
    }

    const sorted = Array.from(totalsByCategory.entries())
      .map(([id, value]) => ({
        id,
        label: CATEGORY_MAP[id]?.label ?? 'Outros',
        value: Number(value.toFixed(2)),
        exactPct: (value / estimatedTotal) * 100,
        color: CATEGORY_CHART_COLORS[id] ?? CATEGORY_CHART_COLORS.outros,
      }))
      .sort((a, b) => b.value - a.value);

    // Largest-remainder rounding so displayed integer percentages sum to 100%
    const floors = sorted.map((entry) => Math.floor(entry.exactPct));
    const remainder = 100 - floors.reduce((sum, n) => sum + n, 0);
    const byFraction = sorted
      .map((entry, idx) => ({ idx, frac: entry.exactPct - floors[idx] }))
      .sort((a, b) => b.frac - a.frac);
    for (let i = 0; i < remainder && i < byFraction.length; i++) {
      floors[byFraction[i].idx] += 1;
    }

    return sorted.map((entry, idx) => ({
      ...entry,
      pct: floors[idx],
    }));
  }, [list.items, estimatedTotal]);

  const highlightedCategory = useMemo(
    () =>
      activeCategoryId
        ? categoryBreakdown.find((c) => c.id === activeCategoryId) ?? null
        : null,
    [activeCategoryId, categoryBreakdown]
  );

  const hasBudget = list.budget !== null && list.budget > 0;
  const isOverBudget = hasBudget && list.budget !== null && estimatedTotal > list.budget;
  const remainingBudget = hasBudget && list.budget !== null ? list.budget - estimatedTotal : 0;

  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!budgetInput.trim()) {
      onUpdateBudget(null);
    } else {
      const val = parseBoundedBudget(budgetInput);
      if (val !== null) {
        onUpdateBudget(val);
      }
    }
    setEditingBudget(false);
  };

  const handleShare = async () => {
    const text = getShareText();
    if (navigator.share) {
      try {
        await navigator.share({
          title: list.name,
          text,
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <section
      aria-label="Resumo da compra"
      className="rounded-2xl border border-line bg-surface p-5"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-ink">
          Resumo da lista
        </h2>
        <span className="font-mono-tabular text-xs font-medium text-ink-muted tabular-nums">
          {checkedCount} de {totalCount} itens
        </span>
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-muted">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-200"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Financial metrics */}
      <div className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-4">
        <div>
          <p className="text-xs text-ink-muted">No carrinho</p>
          <p className="mt-0.5 font-mono-tabular text-xl font-bold text-accent-ink tabular-nums">
            {formatBRL(inCartTotal)}
          </p>
        </div>
        <div>
          <p className="text-xs text-ink-muted">Total estimado</p>
          <p className="mt-0.5 font-mono-tabular text-xl font-bold text-ink tabular-nums">
            {formatBRL(estimatedTotal)}
          </p>
        </div>
      </div>

      {/* Optional budget */}
      <div className="mt-4 border-t border-line pt-4">
        {editingBudget ? (
          <form onSubmit={handleSaveBudget} className="flex items-center gap-2">
            <input
              type="text"
              inputMode="decimal"
              maxLength={12}
              autoFocus
              value={budgetInput}
              onChange={(e) => setBudgetInput(e.target.value)}
              placeholder="Ex: 300,00 (vazio remove)"
              className="min-h-[44px] flex-1 rounded-xl border border-line bg-canvas px-3 font-mono-tabular text-sm text-ink focus:border-accent focus:outline-none"
            />
            <button
              type="submit"
              className="min-h-[44px] rounded-xl bg-accent px-3.5 text-xs font-semibold text-accent-fg hover:bg-accent-hover"
            >
              Salvar
            </button>
          </form>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs text-ink-muted">
              {hasBudget && list.budget !== null ? (
                <span>
                  Meta:{' '}
                  <strong className="font-mono-tabular text-ink">
                    {formatBRL(list.budget)}
                  </strong>
                  {!isOverBudget && estimatedTotal > 0 && (
                    <span className="text-ink-muted">
                      {' · '}Restam{' '}
                      <span className="font-mono-tabular text-accent-ink font-medium">
                        {formatBRL(remainingBudget)}
                      </span>
                    </span>
                  )}
                </span>
              ) : (
                <span>Sem limite de orçamento</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setBudgetInput(list.budget ? String(list.budget) : '');
                setEditingBudget(true);
              }}
              className="min-h-[40px] px-2 text-xs font-semibold text-accent-ink hover:underline shrink-0"
            >
              {list.budget ? 'Alterar' : 'Definir meta'}
            </button>
          </div>
        )}

        {isOverBudget && list.budget !== null && (
          <div className="mt-2.5 flex items-center gap-2 rounded-xl bg-amber-500/15 px-3 py-2 text-xs font-medium text-amber-800 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            <span>
              Acima da meta em{' '}
              <strong className="font-mono-tabular">
                {formatBRL(estimatedTotal - list.budget)}
              </strong>
            </span>
          </div>
        )}
      </div>

      {/* Category spending donut chart */}
      <div className="mt-4 border-t border-line pt-4">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-xs font-semibold text-ink">Gastos por categoria</h3>
          {categoryBreakdown.length > 0 && (
            <span className="font-mono-tabular text-[11px] text-ink-muted tabular-nums">
              {categoryBreakdown.length}{' '}
              {categoryBreakdown.length === 1 ? 'categoria' : 'categorias'}
            </span>
          )}
        </div>

        {categoryBreakdown.length === 0 ? (
          <p className="mt-2 text-xs text-ink-muted">
            Adicione preços aos itens para ver a distribuição por categoria.
          </p>
        ) : (
          <div className="mt-2">
            <div className="relative h-[160px] w-full">
              <ResponsiveContainer
                width="100%"
                height={160}
                initialDimension={{ width: 220, height: 160 }}
              >
                <PieChart>
                  <Pie
                    data={categoryBreakdown}
                    dataKey="value"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={47}
                    outerRadius={68}
                    paddingAngle={categoryBreakdown.length > 1 ? 2 : 0}
                    cornerRadius={4}
                    stroke="none"
                    isAnimationActive={false}
                    onMouseEnter={(_, index) =>
                      setActiveCategoryId(categoryBreakdown[index]?.id ?? null)
                    }
                    onMouseLeave={() => setActiveCategoryId(null)}
                    onClick={(_, index) => {
                      const clickedId = categoryBreakdown[index]?.id ?? null;
                      setActiveCategoryId((prev) => (prev === clickedId ? null : clickedId));
                    }}
                  >
                    {categoryBreakdown.map((entry) => {
                      const isDimmed =
                        activeCategoryId !== null && activeCategoryId !== entry.id;
                      return (
                        <Cell
                          key={entry.id}
                          fill={entry.color}
                          fillOpacity={isDimmed ? 0.35 : 1}
                          style={{ cursor: 'pointer', transition: 'fill-opacity 150ms ease' }}
                        />
                      );
                    })}
                  </Pie>
                  <Tooltip content={<CategoryChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>

              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-12 text-center">
                {highlightedCategory ? (
                  <>
                    <span className="font-mono-tabular text-base font-bold leading-tight text-ink tabular-nums">
                      {highlightedCategory.exactPct < 0.5
                        ? '<1%'
                        : `${highlightedCategory.pct}%`}
                    </span>
                    <span className="mt-0.5 max-w-[84px] truncate text-[10.5px] font-medium leading-tight text-ink-muted">
                      {highlightedCategory.label}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[10.5px] font-medium leading-tight text-ink-muted">
                      Total
                    </span>
                    <span className="mt-0.5 max-w-[88px] truncate font-mono-tabular text-[13px] font-bold leading-tight text-ink tabular-nums">
                      {formatBRL(estimatedTotal)}
                    </span>
                  </>
                )}
              </div>
            </div>

            <ul className="mt-1 space-y-0.5" aria-label="Categorias por percentual de gasto">
              {categoryBreakdown.map((cat) => {
                const isSelected = activeCategoryId === cat.id;
                const pctDisplay = cat.exactPct > 0 && cat.exactPct < 0.5 ? '<1%' : `${cat.pct}%`;
                return (
                  <li key={cat.id}>
                    <button
                      type="button"
                      aria-pressed={isSelected}
                      onMouseEnter={() => setActiveCategoryId(cat.id)}
                      onMouseLeave={() => setActiveCategoryId(null)}
                      onClick={() =>
                        setActiveCategoryId((prev) => (prev === cat.id ? null : cat.id))
                      }
                      className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
                        isSelected ? 'bg-surface-muted' : 'hover:bg-surface-muted/60'
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-xs"
                          style={{ backgroundColor: cat.color }}
                          aria-hidden="true"
                        />
                        <span className="truncate text-xs font-medium text-ink">
                          {cat.label}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-baseline gap-1.5 font-mono-tabular text-xs tabular-nums">
                        <span className="font-semibold text-ink">{pctDisplay}</span>
                        <span className="text-ink-muted" aria-hidden="true">
                          ·
                        </span>
                        <span className="text-[11px] text-ink-muted">
                          {formatBRL(cat.value)}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-5">
        <button
          type="button"
          onClick={handleShare}
          className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl border border-line px-3 py-2 text-xs font-semibold text-ink hover:bg-surface-muted transition-colors whitespace-nowrap"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 shrink-0 text-accent-ink" aria-hidden="true" />
              <span>Lista copiada</span>
            </>
          ) : (
            <>
              <Share2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Compartilhar lista</span>
            </>
          )}
        </button>
      </div>

      {checkedCount > 0 && (
        <div className="mt-2.5">
          {confirmClear ? (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1.5">
              <span className="text-xs font-medium text-red-700 dark:text-red-300">
                Remover {checkedCount} {checkedCount === 1 ? 'item' : 'itens'}?
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="min-h-[36px] rounded-lg px-2.5 text-xs font-medium text-ink hover:bg-surface"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClearChecked();
                    setConfirmClear(false);
                  }}
                  className="min-h-[36px] rounded-lg bg-red-600 px-3 text-xs font-semibold text-white hover:bg-red-700"
                >
                  Limpar
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onUncheckAll}
                className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium text-ink-muted hover:bg-surface-muted transition-colors whitespace-nowrap"
              >
                <RotateCcw className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Desmarcar todos</span>
              </button>
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors whitespace-nowrap"
              >
                <Trash2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Limpar marcados</span>
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
