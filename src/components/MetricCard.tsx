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
    default: 'bg-card',
    gold: 'bg-gradient-gold text-primary-foreground',
    blush: 'bg-secondary',
    accent: 'bg-accent',
  };

  const isGold = variant === 'gold';

  return (
    <Card className={`${variants[variant]} shadow-card border-0 overflow-hidden`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className={`text-xs font-medium uppercase tracking-wide mb-1 ${
              isGold ? 'text-primary-foreground/80' : 'text-muted-foreground'
            }`}>
              {title}
            </p>
            <p className={`text-xl font-display font-semibold ${
              isGold ? 'text-primary-foreground' : 'text-foreground'
            }`}>
              {value}
            </p>
            {subtitle && (
              <p className={`text-xs mt-1 ${
                isGold ? 'text-primary-foreground/70' : 'text-muted-foreground'
              }`}>
                {subtitle}
              </p>
            )}
          </div>
          <div className={`p-2 rounded-lg ${
            isGold 
              ? 'bg-primary-foreground/20' 
              : 'bg-secondary'
          }`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
