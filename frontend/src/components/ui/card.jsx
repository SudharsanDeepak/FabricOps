import * as React from 'react';
import { cn } from '../../lib/utils';

export function Card({ className, ...props }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-slate-800/80 bg-[#0D1220]/90 backdrop-blur-md text-slate-100 shadow-xl transition-all duration-300 hover:border-[#5227FF]/50 hover:shadow-[0_8px_30px_rgb(82,39,255,0.15)] relative overflow-hidden group',
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }) {
  return (
    <div className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
  );
}

export function CardTitle({ className, ...props }) {
  return (
    <h3
      className={cn('font-bold leading-none tracking-tight text-white font-rajdhani text-lg sm:text-xl', className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }) {
  return (
    <p className={cn('text-xs text-slate-400 font-opensans leading-relaxed', className)} {...props} />
  );
}

export function CardContent({ className, ...props }) {
  return <div className={cn('p-6 pt-0', className)} {...props} />;
}

export function CardFooter({ className, ...props }) {
  return (
    <div className={cn('flex items-center p-6 pt-0', className)} {...props} />
  );
}
