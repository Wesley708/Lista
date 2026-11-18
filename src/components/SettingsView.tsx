import React, { useRef, useState } from 'react';
import { User } from 'firebase/auth';
import { Check, Download, RotateCcw, Upload, Users } from 'lucide-react';
import { ACCENT_THEMES, PRIMARY_THEMES } from '../data/themes';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { PWAInstallButton } from './PWAInstallButton';

import { MAX_BACKUP_FILE_BYTES } from '../utils/security';

interface SettingsViewProps {
  user: User | null;
  onOpenSync: () => void;
  primaryThemeId: string;
  accentThemeId: string;
  onSelectPrimaryTheme: (id: string) => void;
  onSelectAccentTheme: (id: string) => void;
  onExportBackup: () => string;
  onImportBackup: (json: string) => boolean;
  onResetDemo: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  user,
  onOpenSync,
  primaryThemeId,
  accentThemeId,
  onSelectPrimaryTheme,
  onSelectAccentTheme,
  onExportBackup,
  onImportBackup,
  onResetDemo,
}) => {
  const { isInstalled } = usePWAInstall();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleDownloadBackup = () => {
    const json = onExportBackup();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lista-de-compras-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setFeedback('Backup exportado em JSON.');
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const isJsonExtension = file.name.toLowerCase().endsWith('.json');
    const isJsonMime =
      file.type === '' || file.type === 'application/json' || file.type === 'text/json';
    if (!isJsonExtension && !isJsonMime) {
      setFeedback('Selecione apenas arquivos de backup .json.');
      setTimeout(() => setFeedback(null), 3500);
      return;
    }

    if (file.size === 0 || file.size > MAX_BACKUP_FILE_BYTES) {
      setFeedback('Arquivo vazio ou maior que o limite permitido de 2 MB.');
      setTimeout(() => setFeedback(null), 3500);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const ok = onImportBackup(String(reader.result ?? ''));
      setFeedback(ok ? 'Listas importadas com sucesso.' : 'Arquivo de backup inválido ou corrompido.');
      setTimeout(() => setFeedback(null), 3500);
    };
    reader.onerror = () => {
      setFeedback('Não foi possível ler o arquivo selecionado.');
      setTimeout(() => setFeedback(null), 3500);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink text-balance">
          Ajustes
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Cores do aplicativo, sincronização e backup.
        </p>
      </div>

      {feedback && (
        <div
          role="status"
          className="rounded-xl border border-line bg-accent-soft px-4 py-3 text-sm font-medium text-ink"
        >
          {feedback}
        </div>
      )}

      {/* Primary Color Customization */}
      <section className="rounded-2xl border border-line bg-surface p-5 space-y-3">
        <h2 className="text-base font-semibold text-ink">
          Cor primária
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {PRIMARY_THEMES.map((theme) => {
            const selected = primaryThemeId === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => onSelectPrimaryTheme(theme.id)}
                aria-pressed={selected}
                className={`flex min-h-[48px] items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left transition-all ${
                  selected
                    ? 'border-accent bg-accent-soft'
                    : 'border-line bg-canvas hover:border-ink-muted/40'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    aria-hidden="true"
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border"
                    style={{
                      backgroundColor: theme.canvas,
                      borderColor: theme.border,
                    }}
                  >
                    <span
                      className="h-3 w-3 rounded-xs border"
                      style={{
                        backgroundColor: theme.surface,
                        borderColor: theme.border,
                      }}
                    />
                  </span>
                  <span className="truncate text-xs font-semibold text-ink">
                    {theme.name}
                  </span>
                </div>
                {selected && (
                  <Check className="h-4 w-4 shrink-0 text-accent-ink" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Secondary Color Customization */}
      <section className="rounded-2xl border border-line bg-surface p-5 space-y-3">
        <h2 className="text-base font-semibold text-ink">
          Cor secundária
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {ACCENT_THEMES.map((theme) => {
            const selected = accentThemeId === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => onSelectAccentTheme(theme.id)}
                aria-pressed={selected}
                className={`flex min-h-[46px] items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left transition-all ${
                  selected
                    ? 'border-accent bg-accent-soft'
                    : 'border-line bg-canvas hover:border-ink-muted/40'
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <span
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 rounded-full border border-black/10 dark:border-white/15"
                    style={{ backgroundColor: theme.accent }}
                  />
                  <span className="truncate text-xs font-semibold text-ink">
                    {theme.name}
                  </span>
                </span>
                {selected && (
                  <Check className="h-4 w-4 shrink-0 text-accent-ink" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Multi-user Cloud Sync Card */}
      <section className="rounded-2xl border border-line bg-surface p-5 space-y-3">
        <div>
          <h2 className="text-base font-semibold text-ink">
            Sincronização em tempo real
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-ink-muted">
            {user
              ? `Conectado como ${user.displayName || user.email}.`
              : 'Entre com Google para sincronizar entre Android e iPhone.'}
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenSync}
          className="flex w-full min-h-[46px] items-center justify-center gap-2 rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-ink hover:bg-surface-muted transition-colors"
        >
          <Users className="h-4 w-4 shrink-0 text-accent-ink" aria-hidden="true" />
          <span>{user ? 'Gerenciar participantes e convites' : 'Conectar conta Google'}</span>
        </button>
      </section>

      {/* Install on Android & iPhone PWA card */}
      {!isInstalled && (
        <section className="rounded-2xl border border-line bg-surface p-5 space-y-3">
          <div>
            <h2 className="text-base font-semibold text-ink">
              Instalar no celular
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-ink-muted">
              Adicione na tela inicial do Android ou iPhone para abrir como aplicativo.
            </p>
          </div>
          <PWAInstallButton variant="full" />
        </section>
      )}

      {/* Backup & Reset */}
      <section className="rounded-2xl border border-line bg-surface p-5 space-y-3">
        <div>
          <h2 className="text-base font-semibold text-ink">
            Backup local
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-ink-muted">
            {user
              ? 'Exporte uma cópia limpa das suas listas (sem códigos ou dados de participantes). Para importar JSON local, desconecte sua conta antes.'
              : 'Exporte ou importe suas listas em arquivo JSON.'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={handleDownloadBackup}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-line px-4 py-2 text-xs sm:text-sm font-medium text-ink hover:bg-surface-muted"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            <span>Exportar JSON</span>
          </button>

          <button
            type="button"
            disabled={Boolean(user)}
            title={
              user
                ? 'Desconecte sua conta Google antes de importar um backup local.'
                : 'Importar backup JSON'
            }
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-line px-4 py-2 text-xs sm:text-sm font-medium text-ink hover:bg-surface-muted disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="h-4 w-4" aria-hidden="true" />
            <span>Importar JSON</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            disabled={Boolean(user)}
            onChange={handleFileChange}
            className="hidden"
          />

          {!user && (
            <button
              type="button"
              onClick={() => {
                onResetDemo();
                setFeedback('Listas iniciais restauradas.');
                setTimeout(() => setFeedback(null), 3000);
              }}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-medium text-ink-muted hover:bg-surface-muted"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              <span>Restaurar exemplos</span>
            </button>
          )}
        </div>
      </section>
    </div>
  );
};
