import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LayoutDashboard, Package, Users, Settings, LogOut, Sparkles, ShoppingCart, Menu } from 'lucide-react';
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
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-4">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-gold flex items-center justify-center shadow-gold flex-shrink-0">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          {!isCollapsed && (
            <div className="animate-fade-in">
              <h1 className="font-display text-lg font-semibold text-foreground leading-tight">
                Clube do Brilho
              </h1>
              <p className="text-xs text-muted-foreground">Gestão de Semijoias</p>
            </div>
          )}
        </Link>
      </SidebarHeader>

      <Separator className="mx-4 w-auto" />

      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.label}
                      className={`h-11 transition-all duration-200 ${
                        active 
                          ? 'bg-primary text-primary-foreground shadow-gold hover:bg-primary hover:text-primary-foreground' 
                          : 'hover:bg-muted'
                      }`}
                    >
                      <Link to={item.path}>
                        <Icon className="w-5 h-5" />
                        <span className="font-medium">{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel className="px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Configurações
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive('/settings')}
                  tooltip="Configurações"
                  className={`h-11 transition-all duration-200 ${
                    isActive('/settings')
                      ? 'bg-primary text-primary-foreground shadow-gold hover:bg-primary hover:text-primary-foreground'
                      : 'hover:bg-muted'
                  }`}
                >
                  <Link to="/settings">
                    <Settings className="w-5 h-5" />
                    <span className="font-medium">Ajustes</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <Separator className="mx-4 w-auto" />

      <SidebarFooter className="p-4">
        <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
            <Users className="w-4 h-4 text-secondary-foreground" />
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0 animate-fade-in">
              <p className="text-sm font-medium truncate">{user?.email?.split('@')[0]}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          )}
        </div>
        
        <Button
          variant="ghost"
          size={isCollapsed ? 'icon' : 'default'}
          onClick={signOut}
          className={`mt-3 text-destructive hover:text-destructive hover:bg-destructive/10 ${
            isCollapsed ? 'w-full justify-center' : 'w-full justify-start'
          }`}
        >
          <LogOut className="w-4 h-4" />
          {!isCollapsed && <span className="ml-2">Sair</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

export function MobileHeader() {
  return (
    <header className="md:hidden fixed top-0 left-0 right-0 z-50 h-14 glass border-b border-border flex items-center px-4">
      <SidebarTrigger className="mr-3">
        <Menu className="w-5 h-5" />
      </SidebarTrigger>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-gold flex items-center justify-center shadow-gold">
          <Sparkles className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="font-display font-semibold text-foreground">Clube do Brilho</span>
      </div>
    </header>
  );
}
