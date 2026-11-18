import React, { useState } from 'react';
import { Check, Copy, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { formatBRL } from '../data/catalog';
import { ShoppingList } from '../types/shopping';
import { parseBoundedBudget, sanitizeText } from '../utils/security';

interface ListsManagerViewProps {
  lists: ShoppingList[];
  activeListId: string;
  isSignedIn: boolean;
  onOpenSync: () => void;
  onSelectList: (id: string) => void;
  onCreateList: (name: string, budget: number | null) => Promise<void> | void;
  onRenameList: (id: string, name: string, budget?: number | null) => Promise<void> | void;
  onDuplicateList: (id: string) => Promise<void> | void;
  onDeleteList: (id: string) => Promise<void> | void;
}

export const ListsManagerView: React.FC<ListsManagerViewProps> = ({
  lists,
  activeListId,
  isSignedIn,
  onOpenSync,
  onSelectList,
  onCreateList,
  onRenameList,
  onDuplicateList,
  onDeleteList,
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newBudget, setNewBudget] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editBudget, setEditBudget] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busyActionKey, setBusyActionKey] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = sanitizeText(newName, 80);
    if (!cleanName || busyActionKey === 'create') return;
    setBusyActionKey('create');
    try {
      await onCreateList(cleanName, parseBoundedBudget(newBudget));
      setNewName('');
      setNewBudget('');
      setShowCreateForm(false);
    } finally {
      setBusyActionKey(null);
    }
  };

  const handleSaveRename = async (e: React.FormEvent, id: string) => {
    e.preventDefault();
    const cleanName = sanitizeText(editName, 80);
    if (!cleanName || busyActionKey === `rename:${id}`) return;
    setBusyActionKey(`rename:${id}`);
    try {
      await onRenameList(id, cleanName, parseBoundedBudget(editBudget));
      setEditingId(null);
    } finally {
      setBusyActionKey(null);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5 max-w-3xl">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink text-balance">
            Minhas listas
          </h1>
          <p className="mt-0.5 text-sm text-ink-muted">
            Alterne entre listas ou entre em uma lista compartilhada.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={onOpenSync}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-line bg-surface px-3.5 py-2 text-xs font-semibold text-ink hover:bg-surface-muted whitespace-nowrap shrink-0"
          >
            <Users className="h-4 w-4 text-accent-ink" aria-hidden="true" />
            <span>{isSignedIn ? 'Entrar com código' : 'Sincronizar'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCreateForm((v) => !v)}
            aria-expanded={showCreateForm}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-accent-fg hover:bg-accent-hover whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Nova lista</span>
          </button>
        </div>
      </div>

      {/* Collapsible New List Form */}
      {showCreateForm && (
        <form
          onSubmit={handleCreate}
          className="rounded-2xl border border-accent/50 bg-surface p-4 space-y-3"
        >
          <h2 className="text-sm font-semibold text-ink">
            Criar nova lista
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              required
              autoFocus
              maxLength={80}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nome (ex: Feira de Sábado)"
              className="sm:col-span-2 min-h-[48px] rounded-xl border border-line bg-canvas px-3.5 text-sm text-ink placeholder:text-ink-muted/60 focus:border-accent focus:outline-none"
            />
            <input
              type="text"
              inputMode="decimal"
              maxLength={12}
              value={newBudget}
              onChange={(e) => setNewBudget(e.target.value)}
              placeholder="Meta R$ (opcional)"
              className="min-h-[48px] rounded-xl border border-line bg-canvas px-3.5 font-mono-tabular text-sm text-ink placeholder:text-ink-muted/60 focus:border-accent focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={busyActionKey === 'create'}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-accent px-5 py-2 text-xs font-semibold text-accent-fg hover:bg-accent-hover disabled:opacity-50 transition-colors"
            >
              {busyActionKey === 'create' ? 'Criando...' : 'Criar lista'}
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="min-h-[44px] rounded-xl px-4 text-xs font-medium text-ink-muted hover:bg-surface-muted"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Lists */}
      <div className="space-y-2.5">
        {lists.map((list) => {
          const isActive = list.id === activeListId;
          const totalItems = list.items.length;
          const checkedItems = list.items.filter((i) => i.checked).length;
          const progressRatio = totalItems > 0 ? checkedItems / totalItems : 0;
          const estimated = list.items.reduce(
            (s, i) => s + (i.price !== null ? i.price * i.quantity : 0),
            0
          );
          const memberCount = list.members?.length || list.memberIds?.length || 1;

          if (editingId === list.id) {
            return (
              <form
                key={list.id}
                onSubmit={(e) => handleSaveRename(e, list.id)}
                className="rounded-2xl border border-accent bg-surface p-3.5 space-y-3"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    autoFocus
                    maxLength={80}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="min-h-[44px] rounded-xl border border-line bg-canvas px-3 text-sm text-ink focus:border-accent focus:outline-none"
                  />
                  <input
                    type="text"
                    inputMode="decimal"
                    maxLength={12}
                    value={editBudget}
                    onChange={(e) => setEditBudget(e.target.value)}
                    placeholder="Meta R$ (opcional)"
                    className="min-h-[44px] rounded-xl border border-line bg-canvas px-3 font-mono-tabular text-sm text-ink focus:border-accent focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={busyActionKey === `rename:${list.id}`}
                    className="min-h-[44px] rounded-xl bg-accent px-4 text-xs font-semibold text-accent-fg hover:bg-accent-hover disabled:opacity-50"
                  >
                    {busyActionKey === `rename:${list.id}` ? 'Salvando...' : 'Salvar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="min-h-[44px] rounded-xl px-4 text-xs font-medium text-ink-muted hover:bg-surface-muted"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            );
          }

          return (
            <div
              key={list.id}
              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-2xl border p-3.5 transition-colors bg-surface ${
                isActive ? 'border-accent' : 'border-line'
              }`}
            >
              <button
                type="button"
                aria-current={isActive ? 'true' : undefined}
                onClick={() => onSelectList(list.id)}
                className="flex-1 text-left min-w-0 rounded-xl focus-visible:outline-2 focus-visible:outline-accent"
              >
                <div className="flex items-center gap-2">
                  <span className="truncate text-[15px] font-semibold text-ink">
                    {list.name}
                  </span>
                  {isActive && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent-ink shrink-0">
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      Ativa
                    </span>
                  )}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ink-muted">
                  <span className="font-mono-tabular">
                    {checkedItems}/{totalItems} itens
                  </span>
                  {estimated > 0 && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-tabular">Estimado: {formatBRL(estimated)}</span>
                    </>
                  )}
                  {list.budget !== null && list.budget > 0 && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-tabular">Meta: {formatBRL(list.budget)}</span>
                    </>
                  )}
                  {list.isSynced && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>
                        {memberCount > 1 ? `Compartilhada (${memberCount})` : 'Na nuvem'}
                      </span>
                    </>
                  )}
                </div>
                {totalItems > 0 && (
                  <div
                    aria-hidden="true"
                    className="mt-2 h-1 w-full overflow-hidden rounded-full bg-surface-muted"
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
              </button>

              <div className="flex items-center gap-1 self-end sm:self-center shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(list.id);
                    setEditName(list.name);
                    setEditBudget(list.budget ? String(list.budget) : '');
                  }}
                  aria-label={`Renomear ${list.name}`}
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-ink-muted hover:bg-surface-muted hover:text-ink"
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  disabled={busyActionKey === `dup:${list.id}`}
                  onClick={() => {
                    if (busyActionKey) return;
                    setBusyActionKey(`dup:${list.id}`);
                    void Promise.resolve(onDuplicateList(list.id)).finally(() =>
                      setBusyActionKey(null)
                    );
                  }}
                  aria-label={`Duplicar ${list.name}`}
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-ink-muted hover:bg-surface-muted hover:text-ink disabled:opacity-50"
                >
                  <Copy className="h-4 w-4" aria-hidden="true" />
                </button>
                {lists.length > 1 && (
                  confirmDeleteId === list.id ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={busyActionKey === `del:${list.id}`}
                        onClick={() => {
                          if (busyActionKey) return;
                          setBusyActionKey(`del:${list.id}`);
                          void Promise.resolve(onDeleteList(list.id)).finally(() => {
                            setBusyActionKey(null);
                            setConfirmDeleteId(null);
                          });
                        }}
                        className="min-h-[44px] rounded-xl bg-red-600 px-3 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors whitespace-nowrap"
                      >
                        {busyActionKey === `del:${list.id}` ? 'Excluindo...' : 'Excluir'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="min-h-[44px] rounded-xl border border-line px-3 text-xs font-medium text-ink-muted hover:bg-surface-muted whitespace-nowrap"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(list.id)}
                      aria-label={`Excluir ${list.name}`}
                      className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-ink-muted hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
