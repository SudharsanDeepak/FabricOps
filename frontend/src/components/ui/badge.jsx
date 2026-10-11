import * as React from 'react';
import { cn } from '../../lib/utils';

const badgeVariants = {
  default: 'bg-gradient-to-r from-[#5227FF]/20 to-[#FF9FFC]/20 text-[#FF9FFC] border border-[#5227FF]/40 font-rajdhani font-bold uppercase tracking-wider shadow-[0_0_12px_rgba(82,39,255,0.25)]',
  secondary: 'bg-slate-900/90 text-slate-300 border-slate-700 font-mono text-[11px]',
  success: 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/80 font-mono font-semibold shadow-[0_0_10px_rgba(16,185,129,0.15)]',
  warning: 'bg-amber-950/60 text-[#EBA832] border border-amber-800/80 font-semibold shadow-[0_0_10px_rgba(235,168,50,0.15)]',
  destructive: 'bg-rose-950/60 text-rose-400 border border-rose-800/80 font-semibold shadow-[0_0_10px_rgba(244,63,94,0.15)]',
  outline: 'text-slate-300 border-slate-700 font-rajdhani font-bold uppercase tracking-wider hover:border-[#5227FF]/60 hover:text-white',
  molten: 'bg-gradient-to-r from-[#5227FF]/30 via-[#FF9FFC]/25 to-white/10 text-white border border-[#FF9FFC]/40 font-rajdhani font-bold tracking-wider uppercase shadow-[0_0_15px_rgba(255,159,252,0.3)]',
};

export function Badge({ className, variant = 'default', as: Component = 'span', ...props }) {
  return (
    <Component
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200',
        badgeVariants[variant] || badgeVariants.default,
        className
      )}
      {...props}
    />
  );
}
