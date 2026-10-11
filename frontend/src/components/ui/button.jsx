import * as React from 'react';
import { cn } from '../../lib/utils';

const buttonVariants = {
  default: 'bg-gradient-to-r from-[#5227FF] via-[#7B42FF] to-[#FF9FFC] hover:opacity-95 text-white font-rajdhani font-bold tracking-wider uppercase shadow-[0_4px_20px_rgba(82,39,255,0.35)] hover:shadow-[0_6px_25px_rgba(255,159,252,0.45)] active:scale-[0.98] transition-all duration-200',
  amber: 'bg-[#EBA832] hover:bg-[#d99426] text-black font-rajdhani font-bold tracking-wider uppercase shadow-md shadow-amber-500/20 active:scale-[0.98] transition-all',
  destructive: 'bg-rose-600 text-white hover:bg-rose-500 shadow-[0_4px_15px_rgba(225,29,72,0.3)] font-rajdhani font-bold tracking-wider uppercase active:scale-[0.98] transition-all',
  outline: 'border border-slate-700 bg-slate-900/80 text-slate-200 font-rajdhani font-bold tracking-wider uppercase hover:border-[#5227FF] hover:bg-[#5227FF]/15 hover:text-white shadow-xs active:scale-[0.98] transition-all',
  secondary: 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 font-rajdhani font-bold tracking-wider uppercase border border-slate-700/80 active:scale-[0.98] transition-all',
  ghost: 'hover:bg-slate-800/60 hover:text-white text-slate-300 font-rajdhani font-semibold active:scale-[0.98] transition-all',
  link: 'text-[#FF9FFC] hover:text-white underline-offset-4 hover:underline p-0 h-auto font-rajdhani font-bold transition-colors',
};

const buttonSizes = {
  default: 'h-9 px-4 py-2 text-sm rounded-lg',
  sm: 'h-8 rounded-lg px-3 text-xs',
  lg: 'h-11 rounded-lg px-8 text-base',
  icon: 'h-9 w-9 p-0 rounded-lg flex items-center justify-center',
};

export const Button = React.forwardRef(
  ({ className, variant = 'default', size = 'default', disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5227FF] disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer',
          buttonVariants[variant] || buttonVariants.default,
          buttonSizes[size] || buttonSizes.default,
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
