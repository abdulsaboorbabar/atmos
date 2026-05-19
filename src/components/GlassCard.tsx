import { ReactNode } from 'react';
import { cn } from '../lib/utils';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function GlassCard({ children, className, onClick }: GlassCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'glass-card p-5 rounded-2xl transition-all duration-300',
        onClick && 'cursor-pointer hover:bg-white/5 active:scale-[0.98]',
        className
      )}
    >
      {children}
    </div>
  );
}
