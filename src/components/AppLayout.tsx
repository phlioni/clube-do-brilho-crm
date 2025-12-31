import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar, MobileHeader } from './AppSidebar';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        
        {/* Mobile Header */}
        <MobileHeader />
        
        {/* Main content */}
        <main className="flex-1 min-h-screen">
          {/* Desktop header with trigger */}
          <header className="hidden md:flex h-14 items-center border-b border-border px-6 sticky top-0 bg-background/95 backdrop-blur z-40">
            <SidebarTrigger className="mr-4" />
          </header>
          
          {/* Page content */}
          <div className="p-4 md:p-6 pt-20 md:pt-6 page-enter">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
