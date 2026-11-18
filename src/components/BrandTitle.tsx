import React from 'react';

interface BrandTitleProps {
  size?: 'sm' | 'md';
  onClick?: () => void;
}

export const BrandTitle: React.FC<BrandTitleProps> = ({ size = 'sm', onClick }) => {
  const isDesktop = size === 'md';

  return (
    <button
      type="button"
      onClick={onClick}
      className="group inline-flex items-center gap-2 sm:gap-2.5 text-left rounded-xl py-1 pr-1 focus-visible:outline-2 focus-visible:outline-accent whitespace-nowrap shrink-0"
      aria-label="Lista de Compras — voltar para a lista atual"
    >
      <span
        aria-hidden="true"
        className={`relative flex items-center justify-center rounded-[10px] bg-accent text-accent-fg shadow-xs transition-transform duration-150 group-hover:scale-[1.04] group-active:scale-95 ${
          isDesktop ? 'h-8 w-8' : 'h-7 w-7'
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={isDesktop ? 'h-[18px] w-[18px]' : 'h-4 w-4'}
        >
          <path
            d="M8.5 8.5V7a3.5 3.5 0 0 1 7 0v1.5"
            stroke="currentColor"
            strokeWidth="2.1"
            strokeLinecap="round"
          />
          <path
            d="M5.2 8.5h13.6l1.05 9.45a2 2 0 0 1-1.99 2.22H6.14a2 2 0 0 1-1.99-2.22L5.2 8.5Z"
            fill="currentColor"
            fillOpacity="0.95"
          />
          <path
            d="m9.2 14.2 1.9 1.9 3.7-3.8"
            stroke="var(--sacola-accent)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>

      <span className="flex flex-col leading-none">
        <span
          className={`font-display tracking-tight ${
            isDesktop ? 'text-[1.22rem]' : 'text-[1.06rem]'
          }`}
        >
          <span className="font-extrabold text-ink">Lista</span>{' '}
          <span className="font-semibold text-ink-muted">de</span>{' '}
          <span className="relative inline-block font-extrabold text-accent-ink">
            Compras
            <span
              aria-hidden="true"
              className="absolute -bottom-0.5 left-0 right-0 h-[2.5px] rounded-full bg-accent/45"
            />
          </span>
        </span>
      </span>
    </button>
  );
};
