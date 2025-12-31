import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LayoutDashboard, Package, Users, LogOut, ShoppingCart, Menu } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
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
      {/* Ajuste de padding do header para acomodar logo maior */}
      <SidebarHeader className="p-4 pb-2">
        <Link to="/" className={`flex items-center gap-4 group ${isCollapsed ? 'justify-center' : ''}`}>
          {/* LOGO AUMENTADA NO SIDEBAR */}
          <img
            src="/logo.png"
            alt="Logo Clube do Brilho"
            // Expandido: h-16 (64px), Recolhido: h-12 w-12 (48px)
            className={`transition-all duration-300 object-contain ${isCollapsed ? 'h-12 w-12' : 'h-16 w-auto'}`}
          />

          {!isCollapsed && (
            <div className="animate-fade-in flex flex-col">
              <h1 className="font-display text-lg font-bold text-primary tracking-tight leading-none">
                Clube do Brilho
              </h1>
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-3 py-2 mt-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);

                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.label}
                      className={`h-11 px-4 rounded-lg transition-all duration-200 font-medium ${active
                          ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                          : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                        }`}
                    >
                      <Link to={item.path} className="flex items-center gap-3">
                        <Icon className={`w-[18px] h-[18px] ${active ? 'text-sidebar-primary-foreground' : 'text-muted-foreground'}`} />
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
        <div className={`flex items-center gap-3 p-3 rounded-xl bg-sidebar-accent/40 border border-sidebar-border ${isCollapsed ? 'justify-center p-2' : ''}`}>
          <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 text-sm font-bold ring-2 ring-background font-display">
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0 animate-fade-in">
              <p className="text-sm font-semibold text-sidebar-foreground truncate leading-none mb-1.5">
                {user?.email?.split('@')[0]}
              </p>
              <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span> Online
              </p>
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          size={isCollapsed ? 'icon' : 'default'}
          onClick={signOut}
          className={`mt-3 h-10 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors border border-transparent hover:border-destructive/20 ${isCollapsed ? 'w-full justify-center' : 'w-full justify-start'
            }`}
        >
          <LogOut className="w-5 h-5" />
          {!isCollapsed && <span className="ml-2 text-sm font-medium">Sair do sistema</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

export function MobileHeader() {
  return (
    <header className="md:hidden fixed top-0 left-0 right-0 z-50 h-16 glass flex items-center px-4 justify-between transition-all duration-200 border-b border-border/50">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="h-10 w-10 rounded-lg hover:bg-secondary/80 text-primary">
          <Menu className="w-6 h-6" />
        </SidebarTrigger>
        <span className="font-display text-lg font-bold text-primary tracking-tight">Clube do Brilho</span>
      </div>
      {/* LOGO AUMENTADA NO MOBILE HEADER (h-12) */}
      <img
        src="/logo.png"
        alt="Logo Clube do Brilho"
        className="h-12 w-auto object-contain drop-shadow-sm"
      />
    </header>
  );
}