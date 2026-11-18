import React from 'react';
import { Check, Minus, Plus, Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { detectItemEmoji, formatBRL } from '../data/catalog';
import { ShoppingItem } from '../types/shopping';

interface ShoppingItemRowProps {
  item: ShoppingItem;
  onToggle: (id: string) => void;
  onStepQuantity: (id: string, delta: number) => void;
  onEdit: (item: ShoppingItem, focusPrice?: boolean) => void;
  onDelete: (id: string) => void;
  showCategory?: boolean;
  categoryLabel?: string;
}

export const ShoppingItemRow: React.FC<ShoppingItemRowProps> = ({
  item,
  onToggle,
  onStepQuantity,
  onEdit,
  onDelete,
  showCategory = false,
  categoryLabel,
}) => {
  const lineTotal = item.price !== null ? item.price * item.quantity : null;
  const emoji = item.emoji || detectItemEmoji(item.name, item.category);

  const metadataParts: { text: string; tabular?: boolean; accent?: boolean }[] = [];
  if (showCategory && categoryLabel) {
    metadataParts.push({ text: categoryLabel });
  }
  metadataParts.push({ text: `${item.quantity} ${item.unit}`, tabular: true });
  if (lineTotal !== null) {
    metadataParts.push({ text: formatBRL(lineTotal), tabular: true, accent: !item.checked });
  }
  if (item.recipeName) {
    metadataParts.push({ text: item.recipeName });
  }
  if (item.note) {
    metadataParts.push({ text: item.note });
  }

  return (
    <div className="bg-surface px-2 sm:px-3 py-1.5 transition-colors">
      <div className="flex items-center gap-1.5 sm:gap-2.5">
        {/* Check Toggle */}
        <button
          type="button"
          onClick={() => onToggle(item.id)}
          aria-label={item.checked ? `Desmarcar ${item.name}` : `Marcar ${item.name} no carrinho`}
          aria-pressed={item.checked}
          className="flex min-h-[42px] min-w-[38px] sm:min-w-[40px] shrink-0 items-center justify-center rounded-xl focus-visible:outline-2 focus-visible:outline-accent"
        >
          <motion.span
            animate={item.checked ? { scale: [1, 1.18, 0.95, 1] } : { scale: 1 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={`flex h-[22px] w-[22px] items-center justify-center rounded-md border transition-colors duration-150 ${
              item.checked
                ? 'border-accent bg-accent text-accent-fg'
                : 'border-line bg-surface hover:border-accent/60'
            }`}
          >
            <AnimatePresence initial={false}>
              {item.checked && (
                <motion.span
                  key="check"
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.4, opacity: 0 }}
                  transition={{ duration: 0.14 }}
                  className="flex items-center justify-center"
                >
                  <Check className="h-3.5 w-3.5 stroke-[2.8]" aria-hidden="true" />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.span>
        </button>

        {/* Main Content + Actions */}
        <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 sm:gap-2.5">
          {/* Top line on mobile / Left block on desktop */}
          <div className="flex items-center justify-between gap-1.5 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => onEdit(item, item.checked && item.price === null)}
              aria-label={`Editar detalhes de ${item.name}`}
              className={`flex items-center gap-2 min-w-0 flex-1 py-0.5 px-1 text-left rounded-lg hover:bg-surface-muted/50 focus-visible:outline-2 focus-visible:outline-accent transition-opacity duration-200 ${
                item.checked ? 'opacity-60' : 'opacity-100'
              }`}
            >
              <span
                aria-hidden="true"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-sm leading-none"
              >
                {emoji}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={`block text-[14px] font-medium leading-tight break-words transition-colors duration-200 ${
                    item.checked ? 'line-through text-ink-muted' : 'text-ink'
                  }`}
                >
                  {item.name}
                </span>

                {/* Desktop metadata inline under name */}
                <span className="mt-0.5 hidden sm:flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11.5px] leading-tight text-ink-muted">
                  {metadataParts.map((part, idx) => (
                    <React.Fragment key={`${item.id}-dmeta-${idx}`}>
                      {idx > 0 && <span aria-hidden="true">·</span>}
                      <span
                        className={`${part.tabular ? 'font-mono-tabular' : ''} ${
                          part.accent ? 'font-medium text-ink' : ''
                        }`}
                      >
                        {part.text}
                      </span>
                    </React.Fragment>
                  ))}
                </span>
              </span>
            </button>

            {/* Mobile Quick Delete Button */}
            <button
              type="button"
              onClick={() => onDelete(item.id)}
              aria-label={`Excluir ${item.name}`}
              title={`Excluir ${item.name}`}
              className="sm:hidden flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-muted hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 active:scale-95 focus-visible:outline-2 focus-visible:outline-accent transition-all"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>

          {/* Mobile bottom line (indented cleanly under text) + Actions */}
          <div className="flex items-center justify-between gap-2 pl-10 sm:pl-0 shrink-0">
            <button
              type="button"
              onClick={() => onEdit(item, true)}
              aria-label={`Editar preço ou quantidade de ${item.name}`}
              className={`sm:hidden flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-left text-[11.5px] leading-tight text-ink-muted min-w-0 flex-1 py-0.5 rounded-md ${
                item.checked ? 'opacity-65' : 'opacity-100'
              }`}
            >
              {metadataParts.map((part, idx) => (
                <React.Fragment key={`${item.id}-mmeta-${idx}`}>
                  {idx > 0 && <span aria-hidden="true">·</span>}
                  <span
                    className={`${part.tabular ? 'font-mono-tabular' : ''} ${
                      part.accent ? 'font-semibold text-ink' : ''
                    }`}
                  >
                    {part.text}
                  </span>
                </React.Fragment>
              ))}
            </button>

            {/* Desktop Price Shortcut + Compact Stepper + Desktop Delete */}
            <div className="flex items-center gap-1 shrink-0">
              {lineTotal !== null && (
                <button
                  type="button"
                  onClick={() => onEdit(item, true)}
                  title="Editar preço"
                  className={`hidden sm:inline-flex min-h-[34px] items-center justify-end px-1.5 font-mono-tabular text-xs font-semibold hover:text-accent-ink whitespace-nowrap shrink-0 tabular-nums sm:min-w-[4.5rem] ${
                    item.checked ? 'text-ink-muted opacity-70' : 'text-ink'
                  }`}
                >
                  {formatBRL(lineTotal)}
                </button>
              )}

              <div className="flex items-center rounded-lg border border-line/70 bg-canvas/50">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onStepQuantity(item.id, -1);
                  }}
                  aria-label={`Diminuir quantidade de ${item.name}`}
                  className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-l-lg text-ink-muted hover:bg-surface-muted hover:text-ink active:scale-90 focus-visible:outline-2 focus-visible:outline-accent transition-transform select-none touch-manipulation"
                >
                  <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                </button>

                <span className="min-w-[1.5rem] text-center font-mono-tabular text-xs font-semibold text-ink tabular-nums select-none">
                  {item.quantity}
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onStepQuantity(item.id, 1);
                  }}
                  aria-label={`Aumentar quantidade de ${item.name}`}
                  className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-r-lg text-ink-muted hover:bg-surface-muted hover:text-ink active:scale-90 focus-visible:outline-2 focus-visible:outline-accent transition-transform select-none touch-manipulation"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => onDelete(item.id)}
                aria-label={`Excluir ${item.name}`}
                title={`Excluir ${item.name}`}
                className="hidden sm:flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 active:scale-95 focus-visible:outline-2 focus-visible:outline-accent transition-all"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
