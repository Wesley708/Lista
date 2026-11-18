import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Minus, Plus, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  CATALOG_ITEMS,
  CATEGORIES,
  EMOJI_PRESETS,
  UNITS,
  detectCategory,
  detectItemEmoji,
  formatBRL,
} from '../data/catalog';
import { AddItemInput } from '../hooks/useShoppingStore';
import { CategoryId, UnitType } from '../types/shopping';

interface QuickAddSheetProps {
  open: boolean;
  onClose: () => void;
  onAdd: (input: AddItemInput) => void;
}

export const QuickAddSheet: React.FC<QuickAddSheetProps> = ({ open, onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState<UnitType>('un');
  const [priceText, setPriceText] = useState('');
  const [category, setCategory] = useState<CategoryId>('outros');
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [emoji, setEmoji] = useState('🛒');
  const [emojiTouched, setEmojiTouched] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [note, setNote] = useState('');
  const [addedHint, setAddedHint] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const hintTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      setName('');
      setQuantity(1);
      setUnit('un');
      setPriceText('');
      setCategory('outros');
      setCategoryTouched(false);
      setEmoji('🛒');
      setEmojiTouched(false);
      setShowEmojiPicker(false);
      setNote('');
      setAddedHint(null);
      const t = window.setTimeout(() => nameInputRef.current?.focus(), 60);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    return () => {
      if (hintTimerRef.current) window.clearTimeout(hintTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const nextCategory =
      !categoryTouched && name.trim().length > 1 ? detectCategory(name) : category;
    if (!categoryTouched && name.trim().length > 1) {
      setCategory(nextCategory);
    }
    if (!emojiTouched) {
      setEmoji(detectItemEmoji(name, nextCategory));
    }
  }, [name, categoryTouched, emojiTouched, category]);

  const suggestions = useMemo(() => {
    const q = name.trim().toLowerCase();
    if (!q) return [];
    return CATALOG_ITEMS.filter((item) => item.name.toLowerCase().includes(q)).slice(0, 5);
  }, [name]);

  const handleSelectSuggestion = (s: (typeof CATALOG_ITEMS)[number]) => {
    setName(s.name);
    setCategory(s.category);
    setCategoryTouched(true);
    setEmoji(s.emoji || detectItemEmoji(s.name, s.category));
    setEmojiTouched(true);
    setUnit(s.defaultUnit);
    if (s.estimatedPrice !== undefined) {
      setPriceText(s.estimatedPrice.toFixed(2).replace('.', ','));
    }
  };

  const commitItem = (keepOpen: boolean) => {
    const trimmed = name.trim();
    if (!trimmed) {
      nameInputRef.current?.focus();
      return;
    }
    const parsedPrice = priceText.trim() ? Number(priceText.replace(',', '.')) : null;

    onAdd({
      name: trimmed,
      quantity,
      unit,
      price: parsedPrice !== null && !Number.isNaN(parsedPrice) ? parsedPrice : null,
      category,
      note,
      emoji,
    });

    if (keepOpen) {
      setName('');
      setQuantity(1);
      setUnit('un');
      setPriceText('');
      setCategory('outros');
      setCategoryTouched(false);
      setEmoji('🛒');
      setEmojiTouched(false);
      setShowEmojiPicker(false);
      setNote('');
      setAddedHint(`"${trimmed}" adicionado! Digite o próximo:`);
      if (hintTimerRef.current) window.clearTimeout(hintTimerRef.current);
      hintTimerRef.current = window.setTimeout(() => setAddedHint(null), 2600);
      nameInputRef.current?.focus();
    } else {
      onClose();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    commitItem(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="quick-add-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="quick-add-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            key="quick-add-panel"
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-full sm:max-w-lg max-h-[90dvh] flex flex-col overflow-hidden rounded-t-3xl sm:rounded-2xl bg-surface shadow-xl border-t sm:border border-line"
          >
            <div className="shrink-0 px-5 sm:px-6 pt-3 sm:pt-5 pb-3 border-b border-line/70">
              <div className="mx-auto mb-2.5 h-1.5 w-10 rounded-full bg-surface-muted sm:hidden" />
              <div className="flex items-center justify-between gap-4">
                <h2 id="quick-add-title" className="text-lg font-semibold text-ink">
                  Adicionar item
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
              {addedHint && (
                <p
                  role="status"
                  className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-accent-ink"
                >
                  <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">{addedHint}</span>
                </p>
              )}
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4">
                <div>
                  <label
                    htmlFor="item-name-input"
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
                      ref={nameInputRef}
                      id="item-name-input"
                      type="text"
                      required
                      maxLength={100}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Café, Leite integral, Banana..."
                      className="w-full min-h-[48px] rounded-xl border border-line bg-canvas px-3.5 text-base text-ink placeholder:text-ink-muted/60 focus:border-accent focus:outline-none"
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
                              setEmojiTouched(true);
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

                {suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {suggestions.map((s) => (
                      <button
                        key={s.name}
                        type="button"
                        onClick={() => handleSelectSuggestion(s)}
                        className="min-h-[38px] rounded-lg border border-line bg-surface-muted/70 px-3 py-1.5 text-xs font-medium text-ink hover:border-accent transition-colors whitespace-nowrap shrink-0"
                      >
                        {s.emoji ? `${s.emoji} ` : ''}
                        {s.name}
                        {s.estimatedPrice ? ` · ${formatBRL(s.estimatedPrice)}` : ''}
                      </button>
                    ))}
                  </div>
                )}

                <div className="space-y-3">
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
                      <label className="block text-xs font-medium text-ink-muted">
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
                        htmlFor="item-price-input"
                        className="block text-xs font-medium text-ink-muted"
                      >
                        Preço unitário (R$)
                      </label>
                      <input
                        id="item-price-input"
                        type="text"
                        inputMode="decimal"
                        value={priceText}
                        onChange={(e) => setPriceText(e.target.value)}
                        placeholder="Ex: 12,90"
                        className="mt-1.5 w-full min-h-[48px] rounded-xl border border-line bg-canvas px-3.5 font-mono-tabular text-sm text-ink placeholder:text-ink-muted/60 focus:border-accent focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="item-category-select"
                    className="block text-xs font-medium text-ink-muted"
                  >
                    Corredor
                  </label>
                  <select
                    id="item-category-select"
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value as CategoryId);
                      setCategoryTouched(true);
                    }}
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
                    htmlFor="item-note-input"
                    className="block text-xs font-medium text-ink-muted"
                  >
                    Observação (opcional)
                  </label>
                  <input
                    id="item-note-input"
                    type="text"
                    maxLength={160}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Ex: Sem lactose, marca preferida..."
                    className="mt-1.5 w-full min-h-[44px] rounded-xl border border-line bg-canvas px-3.5 text-sm text-ink placeholder:text-ink-muted/60 focus:border-accent focus:outline-none"
                  />
                </div>
              </div>

              <div className="shrink-0 border-t border-line bg-surface px-5 sm:px-6 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => commitItem(true)}
                  className="min-h-[48px] rounded-xl border border-line px-3.5 py-3 text-xs sm:text-sm font-semibold text-ink hover:bg-surface-muted active:scale-[0.99] transition-all whitespace-nowrap shrink-0"
                >
                  Salvar e outro
                </button>
                <button
                  type="submit"
                  className="flex-1 min-h-[48px] rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-accent-fg hover:bg-accent-hover active:scale-[0.99] transition-all"
                >
                  Adicionar à lista
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
