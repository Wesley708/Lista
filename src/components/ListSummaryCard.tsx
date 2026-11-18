import React, { useState } from 'react';
import { AlertTriangle, Check, RotateCcw, Share2, Trash2 } from 'lucide-react';
import { formatBRL } from '../data/catalog';
import { ShoppingList } from '../types/shopping';
import { parseBoundedBudget } from '../utils/security';

interface ListSummaryCardProps {
  list: ShoppingList;
  onUpdateBudget: (budget: number | null) => void;
  onClearChecked: () => void;
  onUncheckAll: () => void;
  getShareText: () => string;
}

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
