import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LayoutDashboard, Package, Users, LogOut, Sparkles, ShoppingCart, Menu } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/inventory', icon: Package, label: 'Estoque' },
  { path: '/customers', icon: Users, label: 'Clientes' },
  { path: '/sales', icon: ShoppingCart, label: 'Vendas' },
];

export function AppSidebar() {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className="p-6">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-soft flex-shrink-0 transition-transform group-hover:scale-105">
            <Sparkles className="w-5 h-5" />
          </div>
          {!isCollapsed && (
            <div className="animate-fade-in flex flex-col">
              <h1 className="font-display text-lg font-semibold text-sidebar-foreground tracking-tight">
                Clube do Brilho
              </h1>
              <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                Gerenciador
              </span>
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-3 py-2">
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 mb-2 text-[11px] font-bold text-muted-foreground/70 uppercase tracking-widest">
            Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);

                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.label}
                      className={`h-12 px-4 rounded-xl transition-all duration-200 ${active
                          ? 'bg-primary text-primary-foreground shadow-soft font-medium'
                          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                        }`}
                    >
                      <Link to={item.path} className="flex items-center gap-3">
                        <Icon className={`w-[20px] h-[20px] ${active ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                        <span className="text-[14px]">{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <div className="px-4 py-4 mt-auto">
        <Separator className="bg-sidebar-border" />
      </div>

      <SidebarFooter className="p-4 pt-0">
        <div className={`flex items-center gap-3 p-3 rounded-xl bg-sidebar-accent/50 border border-sidebar-border ${isCollapsed ? 'justify-center p-2' : ''}`}>
          <div className="w-8 h-8 rounded-full bg-champagne text-champagne-dark flex items-center justify-center flex-shrink-0 text-xs font-bold ring-2 ring-background">
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0 animate-fade-in">
              <p className="text-sm font-semibold text-sidebar-foreground truncate leading-none mb-1">
                {user?.email?.split('@')[0]}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">Logado</p>
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          size={isCollapsed ? 'icon' : 'default'}
          onClick={signOut}
          className={`mt-2 h-10 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors ${isCollapsed ? 'w-full justify-center' : 'w-full justify-start'
            }`}
        >
          <LogOut className="w-4 h-4" />
          {!isCollapsed && <span className="ml-2 text-sm font-medium">Sair da conta</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

export function MobileHeader() {
  return (
    <header className="md:hidden fixed top-0 left-0 right-0 z-50 h-16 glass flex items-center px-4 justify-between transition-all duration-200">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="h-10 w-10 rounded-xl hover:bg-secondary/80">
          <Menu className="w-5 h-5 text-foreground" />
        </SidebarTrigger>
        <span className="font-display text-lg font-semibold text-foreground tracking-tight">Clube do Brilho</span>
      </div>
      <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-soft">
        <Sparkles className="w-4 h-4" />
      </div>
    </header>
  );
}