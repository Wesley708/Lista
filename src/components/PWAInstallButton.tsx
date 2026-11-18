import React, { useEffect, useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'compact' | 'full';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'compact' }) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const [guideTab, setGuideTab] = useState<'android' | 'ios'>(isIOS ? 'ios' : 'android');

  useEffect(() => {
    if (!showGuide) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowGuide(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showGuide]);

  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setGuideTab(isIOS ? 'ios' : 'android');
      setShowGuide(true);
    }
  };

  if (variant === 'compact' && !isInstallable && !isIOS && !isAndroid) {
    return null;
  }

  const labelCompact = isIOS ? 'Instalar no iPhone' : 'Instalar app';
  const labelFull = isInstallable
    ? 'Instalar no Android agora'
    : isIOS
      ? 'Como instalar no iPhone'
      : 'Instalar no Android ou iPhone';

  return (
    <>
      {variant === 'compact' ? (
        <button
          type="button"
          onClick={handleClick}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-accent px-3.5 py-2 text-xs font-semibold text-accent-fg transition-colors hover:bg-accent-hover active:scale-[0.98] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{labelCompact}</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          className="flex w-full min-h-[48px] items-center justify-center gap-2.5 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-hover active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <Smartphone className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{labelFull}</span>
        </button>
      )}

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-guide-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowGuide(false);
          }}
        >
          <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-surface p-6 shadow-xl border border-line">
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-surface-muted sm:hidden" />
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3
                  id="pwa-guide-title"
                  className="text-lg font-semibold text-ink"
                >
                  Instalar no celular
                </h3>
                <p className="mt-1 text-sm text-ink-muted">
                  Use o Lista de Compras como aplicativo em tela cheia no Android e no iPhone.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="Fechar instruções"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-ink-muted hover:bg-surface-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 inline-flex w-full rounded-xl bg-surface-muted p-1">
              <button
                type="button"
                onClick={() => setGuideTab('android')}
                className={`flex-1 min-h-[40px] rounded-lg text-xs font-semibold transition-colors ${
                  guideTab === 'android'
                    ? 'bg-surface text-ink shadow-xs'
                    : 'text-ink-muted'
                }`}
              >
                Android (Chrome)
              </button>
              <button
                type="button"
                onClick={() => setGuideTab('ios')}
                className={`flex-1 min-h-[40px] rounded-lg text-xs font-semibold transition-colors ${
                  guideTab === 'ios'
                    ? 'bg-surface text-ink shadow-xs'
                    : 'text-ink-muted'
                }`}
              >
                iPhone (Safari)
              </button>
            </div>

            {guideTab === 'ios' ? (
              <ol className="mt-4 space-y-3 text-sm text-ink">
                <li className="flex gap-3">
                  <span className="font-mono-tabular font-semibold text-accent-ink">1.</span>
                  <span>
                    Abra este link no navegador <strong>Safari</strong> do iPhone.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="font-mono-tabular font-semibold text-accent-ink">2.</span>
                  <span>
                    Toque no botão <strong>Compartilhar</strong> (ícone de quadrado com seta para
                    cima) na barra inferior.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="font-mono-tabular font-semibold text-accent-ink">3.</span>
                  <span>
                    Role para baixo e toque em <strong>Adicionar à Tela de Início</strong>.
                  </span>
                </li>
              </ol>
            ) : (
              <ol className="mt-4 space-y-3 text-sm text-ink">
                <li className="flex gap-3">
                  <span className="font-mono-tabular font-semibold text-accent-ink">1.</span>
                  <span>
                    Abra este link no <strong>Google Chrome</strong> do seu Android (fora do modo
                    anônimo).
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="font-mono-tabular font-semibold text-accent-ink">2.</span>
                  <span>
                    Toque no menu <strong>⋮</strong> (canto superior direito) e selecione{' '}
                    <strong>Instalar aplicativo</strong> ou{' '}
                    <strong>Adicionar à tela inicial</strong>.
                  </span>
                </li>
              </ol>
            )}

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-6 w-full min-h-[48px] rounded-xl bg-accent text-sm font-semibold text-accent-fg hover:bg-accent-hover transition-colors"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
};
