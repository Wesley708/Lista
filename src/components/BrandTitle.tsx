import React from 'react';
import { ShoppingCart } from 'lucide-react';

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
      className="group inline-flex items-center gap-2 sm:gap-2.5 text-left rounded-xl py-1 pr-1 focus-visible:outline-2 focus-visible:outline-accent whitespace-nowrap shrink-0 active:scale-[0.98] transition-transform"
      aria-label="Lista de Compras — voltar para a lista atual"
    >
      <ShoppingCart
        aria-hidden="true"
        strokeWidth={2.1}
        className={`shrink-0 text-accent-ink transition-transform duration-150 group-hover:scale-105 ${
          isDesktop ? 'h-[23px] w-[23px]' : 'h-[21px] w-[21px]'
        }`}
      />
      <span
        className={`font-display font-bold tracking-tight text-ink ${
          isDesktop ? 'text-[1.28rem]' : 'text-[1.12rem]'
        }`}
      >
        Lista de Compras
      </span>
    </button>
  );
};
