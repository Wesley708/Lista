import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(): void {
    console.error('Erro inesperado interceptado na interface do aplicativo.');
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-dvh flex items-center justify-center bg-canvas px-4 py-8 text-ink">
          <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 text-center shadow-sm space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-accent-ink">
              <AlertTriangle className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="space-y-1.5">
              <h1 className="font-display text-xl font-bold text-ink">
                Algo inesperado aconteceu
              </h1>
              <p className="text-sm text-ink-muted leading-relaxed">
                Por segurança, a tela foi interrompida antes de exibir dados incompletos.
                Recarregue para continuar de onde parou.
              </p>
            </div>
            <button
              type="button"
              onClick={this.handleReload}
              className="inline-flex w-full min-h-[46px] items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg hover:bg-accent-hover transition-colors"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              <span>Recarregar aplicativo</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
