import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import {
  Check,
  Copy,
  LogIn,
  LogOut,
  RefreshCw,
  Share2,
  UserMinus,
  Users,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { ShoppingList } from '../types/shopping';
import {
  extractInviteCode,
  getSafeInviteUrl,
  sanitizeShareLine,
} from '../utils/security';

interface SyncShareSheetProps {
  open: boolean;
  onClose: () => void;
  user: User | null;
  authLoading: boolean;
  authError: string | null;
  syncError?: string | null;
  isSyncing?: boolean;
  activeList: ShoppingList | undefined;
  onLogin: () => Promise<void>;
  onLogout: () => Promise<void>;
  onSyncNow?: () => Promise<void>;
  onJoinByCode: (code: string) => Promise<{ listName: string; alreadyMember: boolean }>;
  onRegenerateInviteCode: (listId: string) => Promise<string>;
  onRemoveMember: (listId: string, memberUid: string) => Promise<void>;
}

export const SyncShareSheet: React.FC<SyncShareSheetProps> = ({
  open,
  onClose,
  user,
  authLoading,
  authError,
  syncError,
  isSyncing = false,
  activeList,
  onLogin,
  onLogout,
  onSyncNow,
  onJoinByCode,
  onRegenerateInviteCode,
  onRemoveMember,
}) => {
  const [inviteInput, setInviteInput] = useState('');
  const [joining, setJoining] = useState(false);
  const [rotatingCode, setRotatingCode] = useState(false);
  const [confirmRotate, setConfirmRotate] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [confirmRemoveUid, setConfirmRemoveUid] = useState<string | null>(null);
  const [removingUid, setRemovingUid] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setConfirmRemoveUid(null);
      setConfirmRotate(false);
      setFeedback(null);
    }
  }, [open]);

  const inviteCode = activeList?.inviteCode ?? '';
  const shareUrl = inviteCode ? getSafeInviteUrl(inviteCode) : '';
  const safeListName = activeList ? sanitizeShareLine(activeList.name, 80) || 'Lista' : 'Lista';
  const isOwner = Boolean(user && activeList?.ownerId === user.uid);
  const members = activeList?.members ?? [];

  const handleCopyCode = async () => {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleShareInvite = async () => {
    if (!inviteCode || !activeList || !shareUrl) return;
    const text = `Entre na minha lista "${safeListName}" no Lista de Compras para sincronizarmos as compras em tempo real.\n\nLink: ${shareUrl}\nCódigo: ${inviteCode}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Convite: ${safeListName}`,
          text,
          url: shareUrl,
        });
        return;
      } catch {
        // fallback
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setFeedback({ type: 'ok', text: 'Convite copiado! Cole no WhatsApp para a outra pessoa.' });
    } catch {
      setFeedback({ type: 'err', text: 'Não foi possível copiar o convite.' });
    }
  };

  const handleRotateInvite = async () => {
    if (!activeList || !isOwner || rotatingCode) return;
    setRotatingCode(true);
    setFeedback(null);
    try {
      await onRegenerateInviteCode(activeList.id);
      setConfirmRotate(false);
      setFeedback({
        type: 'ok',
        text: 'Novo código gerado! O código e o link anteriores foram revogados.',
      });
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Não foi possível gerar um novo código.',
      });
    } finally {
      setRotatingCode(false);
    }
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (joining || !inviteInput.trim()) return;
    setJoining(true);
    setFeedback(null);
    try {
      const res = await onJoinByCode(inviteInput);
      setInviteInput('');
      setFeedback({
        type: 'ok',
        text: res.alreadyMember
          ? `Você já participa da lista "${res.listName}".`
          : `Lista "${res.listName}" sincronizada com sucesso!`,
      });
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Não foi possível entrar na lista.',
      });
    } finally {
      setJoining(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="sync-sheet-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sync-sheet-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            key="sync-sheet-panel"
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-full sm:max-w-lg max-h-[90dvh] overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-surface p-5 sm:p-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl border-t sm:border border-line"
          >
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-surface-muted sm:hidden" />

            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="sync-sheet-title" className="text-lg font-semibold text-ink">
                  Sincronizar e dividir lista
                </h2>
                <p className="mt-0.5 text-xs text-ink-muted">
                  Android, iPhone e atualização em tempo real
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-ink-muted hover:bg-surface-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {(authError || syncError || feedback) && (
              <div
                role="status"
                className={`mt-4 rounded-xl px-3.5 py-2.5 text-xs font-medium border ${
                  authError || syncError || feedback?.type === 'err'
                    ? 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30'
                    : 'bg-accent-soft text-ink border-accent/30'
                }`}
              >
                {authError || syncError || feedback?.text}
              </div>
            )}

            {!user ? (
              <div className="mt-5 space-y-4">
                <ul className="space-y-1.5 border-t border-line pt-4 text-xs text-ink-muted leading-relaxed">
                  <li>1. Entre com sua conta Google no Android e no iPhone.</li>
                  <li>2. Envie o código ou link da lista para a segunda pessoa.</li>
                  <li>3. Quando um marcar um item no carrinho, o outro vê na hora.</li>
                </ul>

                <button
                  type="button"
                  disabled={authLoading}
                  onClick={() => void onLogin()}
                  className="flex w-full min-h-[48px] items-center justify-center gap-2.5 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-accent-fg hover:bg-accent-hover disabled:opacity-60 transition-colors"
                >
                  <LogIn className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{authLoading ? 'Conectando...' : 'Entrar com Google'}</span>
                </button>
              </div>
            ) : (
              <div className="mt-5 space-y-5">
                <div className="flex items-center justify-between gap-2 border-t border-line pt-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">
                      {user.displayName || 'Conta conectada'}
                    </p>
                    <p className="truncate text-xs text-ink-muted">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {onSyncNow && (
                      <button
                        type="button"
                        disabled={isSyncing}
                        onClick={() => void onSyncNow()}
                        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-accent-ink hover:bg-accent-soft disabled:opacity-60 whitespace-nowrap"
                        title="Forçar atualização imediata da lista"
                      >
                        <RefreshCw
                          className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`}
                          aria-hidden="true"
                        />
                        <span>{isSyncing ? 'Atualizando' : 'Atualizar'}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void onLogout()}
                      className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-ink-muted hover:bg-surface-muted whitespace-nowrap"
                      title="Sai da conta e limpa os dados locais deste aparelho"
                    >
                      <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Sair</span>
                    </button>
                  </div>
                </div>

                {activeList?.isSynced && inviteCode && (
                  <div className="border-t border-line pt-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-ink truncate">
                        Convidar para "{safeListName}"
                      </h3>
                      <span className="text-xs text-ink-muted shrink-0">
                        {members.length} {members.length === 1 ? 'pessoa' : 'pessoas'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-h-[48px] flex items-center justify-center rounded-xl border border-line bg-canvas font-mono-tabular text-lg font-bold tracking-widest text-ink">
                        {inviteCode}
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyCode}
                        className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-line px-3.5 text-xs font-semibold text-ink hover:bg-surface-muted whitespace-nowrap shrink-0"
                      >
                        {copiedCode ? (
                          <>
                            <Check className="h-4 w-4 text-accent-ink" aria-hidden="true" />
                            <span>Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" aria-hidden="true" />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleShareInvite}
                      className="flex w-full min-h-[46px] items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg hover:bg-accent-hover transition-colors"
                    >
                      <Share2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>Enviar convite</span>
                    </button>

                    {isOwner && (
                      <div className="pt-0.5">
                        {confirmRotate ? (
                          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 space-y-2.5">
                            <p className="text-xs font-medium text-ink leading-relaxed">
                              O código e o link anteriores serão revogados na hora. Quem já está na lista
                              continua com acesso.
                            </p>
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                disabled={rotatingCode}
                                onClick={() => setConfirmRotate(false)}
                                className="min-h-[38px] rounded-lg px-3 text-xs font-medium text-ink hover:bg-surface"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                disabled={rotatingCode}
                                onClick={() => void handleRotateInvite()}
                                className="min-h-[38px] rounded-lg bg-accent px-3.5 text-xs font-semibold text-accent-fg hover:bg-accent-hover disabled:opacity-50"
                              >
                                {rotatingCode ? 'Gerando...' : 'Gerar novo e revogar antigo'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmRotate(true)}
                            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-ink-muted hover:bg-surface-muted hover:text-ink transition-colors"
                          >
                            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Gerar novo código e revogar antigo</span>
                          </button>
                        )}
                      </div>
                    )}

                    {members.length > 0 && (
                      <div className="pt-2 space-y-1">
                        <p className="text-xs font-medium text-ink-muted flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Quem tem acesso</span>
                        </p>
                        {members.map((m) => (
                          <div
                            key={m.uid}
                            className="flex items-center justify-between gap-2 py-1 text-xs"
                          >
                            <span className="truncate text-ink font-medium">
                              {m.displayName}
                              <span className="text-ink-muted font-normal">
                                {' · '}
                                {m.role === 'owner' ? 'Criador' : 'Editor'}
                                {m.uid === user.uid ? ' (Você)' : ''}
                              </span>
                            </span>
                            {isOwner && m.uid !== user.uid && (
                              confirmRemoveUid === m.uid ? (
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => setConfirmRemoveUid(null)}
                                    className="min-h-[34px] rounded-lg px-2 text-ink-muted hover:bg-surface-muted"
                                  >
                                    Não
                                  </button>
                                  <button
                                    type="button"
                                    disabled={removingUid === m.uid}
                                    onClick={() => {
                                      if (removingUid) return;
                                      setRemovingUid(m.uid);
                                      void onRemoveMember(activeList.id, m.uid).finally(() => {
                                        setRemovingUid(null);
                                        setConfirmRemoveUid(null);
                                      });
                                    }}
                                    className="min-h-[34px] rounded-lg bg-red-600 px-2.5 font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                                  >
                                    {removingUid === m.uid ? 'Removendo...' : 'Remover'}
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmRemoveUid(m.uid)}
                                  aria-label={`Remover ${m.displayName}`}
                                  className="inline-flex min-h-[36px] items-center gap-1 rounded-lg px-2 text-red-600 dark:text-red-400 hover:bg-red-500/10 shrink-0"
                                >
                                  <UserMinus className="h-3.5 w-3.5" aria-hidden="true" />
                                  <span>Remover</span>
                                </button>
                              )
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <form
                  onSubmit={handleJoinSubmit}
                  className="border-t border-line pt-4 space-y-2.5"
                >
                  <label
                    htmlFor="join-invite-code"
                    className="block text-sm font-semibold text-ink"
                  >
                    Entrar na lista de outra pessoa
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="join-invite-code"
                      type="text"
                      value={inviteInput}
                      onChange={(e) => setInviteInput(extractInviteCode(e.target.value))}
                      placeholder="Código ou link do convite"
                      maxLength={256}
                      className="min-h-[48px] flex-1 rounded-xl border border-line bg-canvas px-3.5 font-mono-tabular text-sm uppercase tracking-wider text-ink placeholder:normal-case placeholder:tracking-normal placeholder:text-ink-muted/60 focus:border-accent focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={joining || inviteInput.trim().length < 8}
                      className="min-h-[48px] rounded-xl bg-accent px-4 text-sm font-semibold text-accent-fg hover:bg-accent-hover disabled:opacity-50 whitespace-nowrap shrink-0"
                    >
                      {joining ? 'Entrando...' : 'Entrar'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
