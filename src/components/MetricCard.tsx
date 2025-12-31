import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: ReactNode;
  variant?: 'default' | 'gold' | 'blush' | 'accent';
}

export function MetricCard({ title, value, subtitle, icon, variant = 'default' }: MetricCardProps) {
  // Configuração das variantes com cores sólidas e alto contraste
  const variants = {
    default: 'bg-card border border-border/50 text-card-foreground',
    gold: 'bg-champagne text-white border-0', // Fundo Bronze Sólido
    blush: 'bg-secondary border border-secondary text-secondary-foreground', // Cinza Pedra Claro
    accent: 'bg-primary text-primary-foreground border-0', // Preto Carvão
  };

  const isDarkBg = variant === 'gold' || variant === 'accent';

  return (
    <Card className={`${variants[variant]} shadow-medium overflow-hidden transition-all duration-200 hover:shadow-luxury hover:-translate-y-0.5`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${isDarkBg ? 'text-white/80' : 'text-muted-foreground'
              }`}>
              {title}
            </p>
            <p className={`text-3xl font-display font-medium tracking-tight ${isDarkBg ? 'text-white' : 'text-foreground'
              }`}>
              {value}
            </p>
            {subtitle && (
              <p className={`text-xs mt-2 font-medium ${isDarkBg ? 'text-white/70' : 'text-muted-foreground'
                }`}>
                {subtitle}
              </p>
            )}
          </div>
          <div className={`p-3 rounded-xl flex items-center justify-center ${isDarkBg
              ? 'bg-white/10 text-white backdrop-blur-sm'
              : 'bg-sidebar-accent text-foreground'
            }`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}