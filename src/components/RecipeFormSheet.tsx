import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Plus, Trash2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  CATEGORIES,
  CATEGORY_MAP,
  RECIPE_EMOJI_PRESETS,
  UNITS,
  detectCategory,
  detectItemEmoji,
} from '../data/catalog';
import { CategoryId, Recipe, RecipeIngredient, UnitType } from '../types/shopping';

interface RecipeFormSheetProps {
  open: boolean;
  editingRecipe: Recipe | null;
  onClose: () => void;
  onSave: (input: {
    id?: string;
    name: string;
    emoji: string;
    notes?: string;
    ingredients: RecipeIngredient[];
  }) => void;
}

export const RecipeFormSheet: React.FC<RecipeFormSheetProps> = ({
  open,
  editingRecipe,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🍲');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [notes, setNotes] = useState('');
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);

  // New ingredient draft fields
  const [ingName, setIngName] = useState('');
  const [ingQty, setIngQty] = useState(1);
  const [ingUnit, setIngUnit] = useState<UnitType>('un');
  const [ingCategory, setIngCategory] = useState<CategoryId>('mercearia');
  const [ingCatTouched, setIngCatTouched] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [ingFeedback, setIngFeedback] = useState<string | null>(null);
  const ingInputRef = useRef<HTMLInputElement | null>(null);
  const feedbackTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) window.clearTimeout(feedbackTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    if (editingRecipe) {
      setName(editingRecipe.name);
      setEmoji(editingRecipe.emoji || '🍲');
      setNotes(editingRecipe.notes ?? '');
      setIngredients(editingRecipe.ingredients);
    } else {
      setName('');
      setEmoji('🍲');
      setNotes('');
      setIngredients([]);
    }
    setShowEmojiPicker(false);
    setIngName('');
    setIngQty(1);
    setIngUnit('un');
    setIngCategory('mercearia');
    setIngCatTouched(false);
    setErrorMsg(null);
    setIngFeedback(null);
  }, [open, editingRecipe]);

  useEffect(() => {
    if (!ingCatTouched && ingName.trim().length > 1) {
      setIngCategory(detectCategory(ingName));
    }
  }, [ingName, ingCatTouched]);

  const previewIngCategory = ingCatTouched ? ingCategory : detectCategory(ingName);
  const previewIngEmoji = ingName.trim()
    ? detectItemEmoji(ingName, previewIngCategory)
    : '🥄';

  const handleAddIngredient = () => {
    const trimmed = ingName.trim();
    if (!trimmed) {
      setErrorMsg('Digite o nome do ingrediente antes de incluir.');
      ingInputRef.current?.focus();
      return;
    }
    if (ingredients.length >= 30) {
      setErrorMsg('Máximo de 30 ingredientes por receita.');
      return;
    }
    const category = ingCatTouched ? ingCategory : detectCategory(trimmed);
    const nextIng: RecipeIngredient = {
      name: trimmed.slice(0, 100),
      quantity: Math.min(10000, Math.max(0.1, Number(ingQty) || 1)),
      unit: ingUnit,
      category,
      emoji: detectItemEmoji(trimmed, category),
    };
    setIngredients((prev) => [...prev, nextIng]);
    setIngName('');
    setIngQty(1);
    setIngUnit('un');
    setIngCategory('mercearia');
    setIngCatTouched(false);
    setErrorMsg(null);
    setIngFeedback(`"${nextIng.name}" incluído`);
    if (feedbackTimerRef.current) window.clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = window.setTimeout(() => setIngFeedback(null), 2000);
    ingInputRef.current?.focus();
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredients((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setErrorMsg('Dê um nome para a receita.');
      return;
    }

    const finalIngredients = [...ingredients];
    if (ingName.trim() && finalIngredients.length < 30) {
      const trimmed = ingName.trim();
      const cat = ingCatTouched ? ingCategory : detectCategory(trimmed);
      finalIngredients.push({
        name: trimmed.slice(0, 100),
        quantity: Math.min(10000, Math.max(0.1, Number(ingQty) || 1)),
        unit: ingUnit,
        category: cat,
        emoji: detectItemEmoji(trimmed, cat),
      });
    }

    if (finalIngredients.length === 0) {
      setErrorMsg('Adicione pelo menos 1 ingrediente à receita.');
      ingInputRef.current?.focus();
      return;
    }

    onSave({
      id: editingRecipe?.id,
      name: cleanName,
      emoji,
      notes: notes.trim() || undefined,
      ingredients: finalIngredients,
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="recipe-form-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="recipe-form-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            key="recipe-form-panel"
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-full sm:max-w-lg max-h-[92dvh] flex flex-col overflow-hidden rounded-t-3xl sm:rounded-2xl bg-surface shadow-xl border-t sm:border border-line"
          >
            <div className="shrink-0 px-5 sm:px-6 pt-3 sm:pt-5 pb-3 border-b border-line/70">
              <div className="mx-auto mb-2.5 h-1.5 w-10 rounded-full bg-surface-muted sm:hidden" />
              <div className="flex items-center justify-between gap-4">
                <h2 id="recipe-form-title" className="text-lg font-semibold text-ink">
                  {editingRecipe ? 'Editar receita' : 'Nova receita'}
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
                    htmlFor="recipe-name-input"
                    className="block text-xs font-medium text-ink-muted"
                  >
                    Nome da receita
                  </label>
                  <div className="mt-1.5 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker((v) => !v)}
                      aria-expanded={showEmojiPicker}
                      aria-label="Trocar emoji da receita"
                      title="Trocar emoji"
                      className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border text-2xl transition-colors ${
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
                      id="recipe-name-input"
                      type="text"
                      autoFocus
                      required
                      maxLength={80}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Feijoada, Bolo de cenoura..."
                      className="w-full min-h-[48px] rounded-xl border border-line bg-canvas px-3.5 text-base text-ink placeholder:text-ink-muted/60 focus:border-accent focus:outline-none"
                    />
                  </div>

                  {showEmojiPicker && (
                    <div className="mt-2 rounded-xl border border-line bg-canvas p-2.5">
                      <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 max-h-32 overflow-y-auto pr-1">
                        {RECIPE_EMOJI_PRESETS.map((preset) => (
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
                  <label
                    htmlFor="recipe-notes-input"
                    className="block text-xs font-medium text-ink-muted"
                  >
                    Observação (opcional)
                  </label>
                  <input
                    id="recipe-notes-input"
                    type="text"
                    maxLength={200}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ex: Almoço de domingo, serve 6 pessoas..."
                    className="mt-1.5 w-full min-h-[44px] rounded-xl border border-line bg-canvas px-3.5 text-sm text-ink placeholder:text-ink-muted/60 focus:border-accent focus:outline-none"
                  />
                </div>

                {/* Ingredient Builder */}
                <div className="border-t border-line pt-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-ink">
                      Ingredientes ({ingredients.length}/30)
                    </p>
                    {ingFeedback && (
                      <span
                        role="status"
                        className="inline-flex items-center gap-1 text-xs font-medium text-accent-ink"
                      >
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{ingFeedback}</span>
                      </span>
                    )}
                  </div>

                  <div className="space-y-2.5">
                    <div className="relative flex items-center">
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute left-3 text-base leading-none"
                      >
                        {previewIngEmoji}
                      </span>
                      <input
                        ref={ingInputRef}
                        type="text"
                        maxLength={100}
                        value={ingName}
                        onChange={(e) => setIngName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddIngredient();
                          }
                        }}
                        placeholder="Ingrediente (ex: Feijão preto, Calabresa...)"
                        aria-label="Nome do ingrediente"
                        className="w-full min-h-[44px] rounded-xl border border-line bg-canvas pl-10 pr-3.5 text-sm text-ink placeholder:text-ink-muted/60 focus:border-accent focus:outline-none"
                      />
                    </div>

                    <div
                      role="group"
                      aria-label="Unidade do ingrediente"
                      className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5"
                    >
                      {UNITS.map((u) => {
                        const selected = ingUnit === u.value;
                        return (
                          <button
                            key={u.value}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => setIngUnit(u.value)}
                            className={`min-h-[40px] min-w-[44px] rounded-xl border px-2.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
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

                    <div className="grid grid-cols-12 gap-2">
                      <input
                        type="number"
                        step="any"
                        min="0.1"
                        value={ingQty}
                        onChange={(e) => setIngQty(Math.max(0.1, Number(e.target.value) || 1))}
                        aria-label="Quantidade do ingrediente"
                        className="col-span-4 min-h-[44px] rounded-xl border border-line bg-canvas px-2.5 text-center font-mono-tabular text-sm text-ink focus:border-accent focus:outline-none"
                      />

                      <select
                        value={ingCategory}
                        onChange={(e) => {
                          setIngCategory(e.target.value as CategoryId);
                          setIngCatTouched(true);
                        }}
                        aria-label="Corredor do ingrediente"
                        className="col-span-8 min-h-[44px] rounded-xl border border-line bg-canvas px-2.5 text-sm text-ink focus:border-accent focus:outline-none"
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddIngredient}
                      className="flex w-full min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-accent/40 bg-accent-soft px-3 text-xs font-semibold text-accent-ink hover:opacity-90 active:scale-[0.99] transition-all"
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      <span>Incluir ingrediente</span>
                    </button>
                  </div>

                  {ingredients.length > 0 && (
                    <ul className="divide-y divide-line border-t border-line max-h-52 overflow-y-auto">
                      {ingredients.map((ing, idx) => (
                        <li
                          key={`${ing.name}-${idx}`}
                          className="flex items-center justify-between gap-2 py-1.5"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span aria-hidden="true" className="text-base shrink-0">
                              {ing.emoji || detectItemEmoji(ing.name, ing.category)}
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-ink truncate">
                                {ing.name}
                              </p>
                              <p className="text-xs text-ink-muted truncate">
                                <span className="font-mono-tabular">
                                  {ing.quantity} {ing.unit}
                                </span>
                                <span aria-hidden="true"> · </span>
                                <span>{CATEGORY_MAP[ing.category].label}</span>
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveIngredient(idx)}
                            aria-label={`Remover ${ing.name} da receita`}
                            className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl text-ink-muted hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {errorMsg && (
                  <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                    {errorMsg}
                  </p>
                )}
              </div>

              <div className="shrink-0 border-t border-line bg-surface px-5 sm:px-6 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
                <button
                  type="submit"
                  className="w-full min-h-[48px] rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-accent-fg hover:bg-accent-hover active:scale-[0.99] transition-all"
                >
                  Salvar receita
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
