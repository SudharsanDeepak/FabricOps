import * as React from 'react';
import { cn } from '../../lib/utils';

const buttonVariants = {
  default: 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm active:bg-blue-800',
  destructive: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
  outline: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900',
  secondary: 'bg-slate-100 text-slate-800 hover:bg-slate-200',
  ghost: 'hover:bg-slate-100 text-slate-700 hover:text-slate-900',
  link: 'text-blue-600 underline-offset-4 hover:underline p-0 h-auto',
};

const buttonSizes = {
  default: 'h-9 px-4 py-2 text-sm',
  sm: 'h-8 rounded-md px-3 text-xs',
  lg: 'h-11 rounded-md px-8 text-base',
  icon: 'h-9 w-9 p-0 flex items-center justify-center',
};

export const Button = React.forwardRef(
  ({ className, variant = 'default', size = 'default', disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-50 select-none',
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

