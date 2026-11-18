import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Minus, Plus, Trash2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { CATEGORIES, EMOJI_PRESETS, UNITS, detectItemEmoji } from '../data/catalog';
import { CategoryId, ShoppingItem, UnitType } from '../types/shopping';

interface ItemEditSheetProps {
  item: ShoppingItem | null;
  autoFocusPrice?: boolean;
  onClose: () => void;
  onSave: (id: string, patch: Partial<Omit<ShoppingItem, 'id' | 'createdAt'>>) => void;
  onDelete: (id: string) => void;
}

export const ItemEditSheet: React.FC<ItemEditSheetProps> = ({
  item,
  autoFocusPrice = false,
  onClose,
  onSave,
  onDelete,
}) => {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState<UnitType>('un');
  const [priceText, setPriceText] = useState('');
  const [category, setCategory] = useState<CategoryId>('outros');
  const [emoji, setEmoji] = useState('🛒');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [note, setNote] = useState('');
  const priceInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [item, onClose]);

  useEffect(() => {
    if (item) {
      setName(item.name);
      setQuantity(item.quantity);
      setUnit(item.unit);
      setPriceText(item.price !== null ? item.price.toFixed(2).replace('.', ',') : '');
      setCategory(item.category);
      setEmoji(item.emoji || detectItemEmoji(item.name, item.category));
      setShowEmojiPicker(false);
      setNote(item.note ?? '');

      if (autoFocusPrice) {
        const t = window.setTimeout(() => priceInputRef.current?.focus(), 70);
        return () => window.clearTimeout(t);
      }
    }
  }, [item, autoFocusPrice]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!item || !name.trim()) return;
    const parsedPrice = priceText.trim() ? Number(priceText.replace(',', '.')) : null;
    onSave(item.id, {
      name: name.trim(),
      quantity: Math.max(0.1, Number(quantity) || 1),
      unit,
      price: parsedPrice !== null && !Number.isNaN(parsedPrice) ? Math.max(0, parsedPrice) : null,
      category,
      emoji,
      note: note.trim() || undefined,
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {item && (
        <motion.div
          key="edit-item-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-item-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            key="edit-item-panel"
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-full sm:max-w-lg max-h-[90dvh] flex flex-col overflow-hidden rounded-t-3xl sm:rounded-2xl bg-surface shadow-xl border-t sm:border border-line"
          >
            <div className="shrink-0 px-5 sm:px-6 pt-3 sm:pt-5 pb-3 border-b border-line/70">
              <div className="mx-auto mb-2.5 h-1.5 w-10 rounded-full bg-surface-muted sm:hidden" />
              <div className="flex items-center justify-between gap-4">
                <h2 id="edit-item-title" className="text-lg font-semibold text-ink">
                  Editar item
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Fechar"
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-ink-muted hover:bg-surface-muted"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4">
                <div>
                  <label
                    htmlFor="edit-name"
                    className="block text-xs font-medium text-ink-muted"
                  >
                    Nome do produto
                  </label>
                  <div className="mt-1.5 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker((v) => !v)}
                      aria-expanded={showEmojiPicker}
                      aria-label="Trocar emoji do item"
                      title="Trocar emoji"
                      className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border text-xl transition-colors ${
                        showEmojiPicker
                          ? 'border-accent bg-accent-soft'
                          : 'border-line bg-canvas hover:border-ink-muted/50'
                      }`}
                    >
                      <span>{emoji}</span>
                      <ChevronDown
                        className="absolute bottom-0.5 right-0.5 h-3 w-3 text-ink-muted"
                        aria-hidden="true"
                      />
                    </button>
                    <input
                      id="edit-name"
                      type="text"
                      required
                      maxLength={100}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full min-h-[48px] rounded-xl border border-line bg-canvas px-3.5 text-base text-ink focus:border-accent focus:outline-none"
                    />
                  </div>

                  {showEmojiPicker && (
                    <div className="mt-2 rounded-xl border border-line bg-canvas p-2.5">
                      <div className="grid grid-cols-7 sm:grid-cols-9 gap-1.5 max-h-36 overflow-y-auto pr-1">
                        {EMOJI_PRESETS.map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => {
                              setEmoji(preset);
                              setShowEmojiPicker(false);
                            }}
                            aria-label={`Selecionar emoji ${preset}`}
                            className={`flex h-10 w-full items-center justify-center rounded-lg border text-lg transition-colors ${
                              emoji === preset
                                ? 'border-accent bg-accent-soft'
                                : 'border-transparent hover:bg-surface-muted'
                            }`}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink-muted">
                    Unidade
                  </label>
                  <div
                    role="group"
                    aria-label="Unidade do item"
                    className="mt-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5"
                  >
                    {UNITS.map((u) => {
                      const selected = unit === u.value;
                      return (
                        <button
                          key={u.value}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => setUnit(u.value)}
                          className={`min-h-[42px] min-w-[46px] rounded-xl border px-3 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                            selected
                              ? 'border-accent bg-accent-soft text-accent-ink'
                              : 'border-line bg-canvas text-ink-muted hover:text-ink'
                          }`}
                        >
                          {u.value}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="edit-qty"
                      className="block text-xs font-medium text-ink-muted"
                    >
                      Quantidade
                    </label>
                    <div className="mt-1.5 flex items-center rounded-xl border border-line bg-canvas">
                      <button
                        type="button"
                        onClick={() =>
                          setQuantity((q) =>
                            Math.max(
                              0.5,
                              Number((q - (unit === 'kg' || unit === 'L' ? 0.5 : 1)).toFixed(2))
                            )
                          )
                        }
                        aria-label="Diminuir quantidade"
                        className="flex min-h-[46px] min-w-[44px] items-center justify-center text-ink-muted hover:text-ink"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <input
                        id="edit-qty"
                        type="number"
                        step="any"
                        min="0.1"
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(0.1, Number(e.target.value) || 1))}
                        className="w-full bg-transparent text-center font-mono-tabular text-sm font-semibold text-ink focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setQuantity((q) =>
                            Number((q + (unit === 'kg' || unit === 'L' ? 0.5 : 1)).toFixed(2))
                          )
                        }
                        aria-label="Aumentar quantidade"
                        className="flex min-h-[46px] min-w-[44px] items-center justify-center text-ink-muted hover:text-ink"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="edit-price"
                      className="block text-xs font-medium text-ink-muted"
                    >
                      Preço unitário (R$)
                    </label>
                    <input
                      ref={priceInputRef}
                      id="edit-price"
                      type="text"
                      inputMode="decimal"
                      value={priceText}
                      onChange={(e) => setPriceText(e.target.value)}
                      placeholder="Ex: 12,90"
                      className="mt-1.5 w-full min-h-[48px] rounded-xl border border-line bg-canvas px-3.5 font-mono-tabular text-sm text-ink focus:border-accent focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="edit-category"
                    className="block text-xs font-medium text-ink-muted"
                  >
                    Corredor
                  </label>
                  <select
                    id="edit-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as CategoryId)}
                    className="mt-1.5 w-full min-h-[48px] rounded-xl border border-line bg-canvas px-3 text-sm font-medium text-ink focus:border-accent focus:outline-none"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="edit-note"
                    className="block text-xs font-medium text-ink-muted"
                  >
                    Observação
                  </label>
                  <input
                    id="edit-note"
                    type="text"
                    maxLength={160}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Ex: Sem lactose, embalagem econômica..."
                    className="mt-1.5 w-full min-h-[44px] rounded-xl border border-line bg-canvas px-3.5 text-sm text-ink focus:border-accent focus:outline-none"
                  />
                </div>
              </div>

              <div className="shrink-0 border-t border-line bg-surface px-5 sm:px-6 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    onDelete(item.id);
                    onClose();
                  }}
                  className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-red-500/30 px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  <span>Excluir</span>
                </button>
                <button
                  type="submit"
                  className="flex-1 min-h-[48px] rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-accent-fg hover:bg-accent-hover transition-colors"
                >
                  Salvar alterações
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
