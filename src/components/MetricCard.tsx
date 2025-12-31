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
  const variants = {
    default: 'bg-card border border-border',
    gold: 'bg-gradient-gold border-0',
    blush: 'bg-secondary border border-secondary',
    accent: 'bg-accent border border-accent',
  };

  const isGold = variant === 'gold';

  return (
    <Card className={`${variants[variant]} shadow-card overflow-hidden transition-all duration-200 hover:shadow-soft`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className={`text-xs font-medium uppercase tracking-wider mb-2 ${
              isGold ? 'text-primary-foreground/80' : 'text-muted-foreground'
            }`}>
              {title}
            </p>
            <p className={`text-2xl font-display font-semibold ${
              isGold ? 'text-primary-foreground' : 'text-foreground'
            }`}>
              {value}
            </p>
            {subtitle && (
              <p className={`text-xs mt-1.5 ${
                isGold ? 'text-primary-foreground/70' : 'text-muted-foreground'
              }`}>
                {subtitle}
              </p>
            )}
          </div>
          <div className={`p-2.5 rounded-xl ${
            isGold 
              ? 'bg-primary-foreground/20' 
              : variant === 'blush'
                ? 'bg-secondary-foreground/10'
                : 'bg-muted'
          }`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
