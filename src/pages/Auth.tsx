import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

const authSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
});

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = authSchema.safeParse({ email, password });
    if (!validation.success) {
      toast({
        title: 'Erro de validação',
        description: validation.error.errors[0].message,
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          let message = 'Erro ao fazer login';
          if (error.message.includes('Invalid login credentials')) {
            message = 'Email ou senha incorretos';
          }
          toast({ title: 'Erro', description: message, variant: 'destructive' });
        } else {
          navigate('/');
        }
      } else {
        const { error } = await signUp(email, password);
        if (error) {
          let message = 'Erro ao criar conta';
          if (error.message.includes('already registered')) {
            message = 'Este email já está cadastrado';
          }
          toast({ title: 'Erro', description: message, variant: 'destructive' });
        } else {
          toast({ title: 'Conta criada!', description: 'Você já pode acessar o app.' });
          navigate('/');
        }
      }
    } catch (error) {
      toast({ title: 'Erro', description: 'Algo deu errado. Tente novamente.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 relative overflow-hidden">
      {/* Background decorativo fixo */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-champagne/30 rounded-full blur-3xl opacity-50 translate-y-1/2 -translate-x-1/2" />
      </div>

      <div className="w-full max-w-sm relative z-10 animate-fade-in">
        {/* Logo e Título */}
        <div className="text-center mb-8">
          {/* LOGO AUMENTADA AQUI (h-40) */}
          <img 
            src="/logo.png" 
            alt="Clube do Brilho Logo" 
            className="h-52 w-auto mx-auto mb-1 object-contain drop-shadow-md transition-transform hover:scale-105"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          
          <p className="text-muted-foreground mt-2">
            Gestão de semijoias com elegância
          </p>
        </div>

        <Card className="border-0 shadow-medium bg-card/90 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-primary" />
          
          <CardHeader className="space-y-1 pb-6 text-center pt-8">
            <CardTitle className="text-2xl font-display">
              {isLogin ? 'Bem-vindo(a)' : 'Criar conta'}
            </CardTitle>
            <CardDescription>
              {isLogin 
                ? 'Insira suas credenciais para acessar' 
                : 'Preencha os dados para começar'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <Button 
                type="submit" 
                className="w-full h-12 text-base font-semibold shadow-md hover:shadow-lg transition-all bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={loading}
              >
                {loading ? 'Carregando...' : isLogin ? 'Entrar no Sistema' : 'Cadastrar'}
              </Button>
            </form>

           
          </CardContent>
        </Card>
      </div>
    </div>
  );
}