import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Sparkles, Info } from 'lucide-react';

export default function Settings() {
  const { user } = useAuth();

  return (
    <AppLayout>
      <PageHeader 
        title="Ajustes"
        subtitle="Configurações da sua conta"
      />

      {/* Account Section */}
      <div className="space-y-4">
        <Card className="border shadow-card">
          <CardHeader>
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Minha Conta
            </CardTitle>
            <CardDescription>Informações da sua conta</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-muted rounded-xl">
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{user?.email}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-card">
          <CardHeader>
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Sobre o App
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-gold flex items-center justify-center shadow-gold">
                <Sparkles className="w-7 h-7 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold">Clube do Brilho</h3>
                <p className="text-sm text-muted-foreground">Versão 1.0.0</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-card bg-secondary/50">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <h4 className="font-medium mb-1">Dica</h4>
                <p className="text-sm text-muted-foreground">
                  Use o menu lateral para navegar entre as seções do app. Você pode abrir e fechar o menu clicando no ícone no topo da página.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
