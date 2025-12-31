import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, Users, Settings } from 'lucide-react';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Início' },
  { path: '/inventory', icon: Package, label: 'Estoque' },
  { path: '/customers', icon: Users, label: 'Clientes' },
  { path: '/settings', icon: Settings, label: 'Ajustes' },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2 pb-safe">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center flex-1 h-full touch-target transition-all duration-200 ${
                isActive 
                  ? 'text-primary' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon 
                className={`h-5 w-5 mb-1 transition-transform duration-200 ${
                  isActive ? 'scale-110' : ''
                }`}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className={`text-xs font-medium ${isActive ? 'font-semibold' : ''}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
