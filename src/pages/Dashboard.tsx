import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import { MetricCard } from '@/components/MetricCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, Users, Package, AlertTriangle, Star, Sparkles, Cake } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';

interface DashboardData {
  totalInventoryValue: number;
  potentialRevenue: number;
  monthlyRevenue: number;
  monthlyExpenses: number;
  totalCustomers: number;
  lowStockProducts: { id: string; name: string; stock_quantity: number }[];
  topCustomers: { name: string; total: number }[];
  bestSellers: { name: string; quantity: number }[];
  birthdays: { name: string; day: string; isToday: boolean }[];
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData>({
    totalInventoryValue: 0,
    potentialRevenue: 0,
    monthlyRevenue: 0,
    monthlyExpenses: 0,
    totalCustomers: 0,
    lowStockProducts: [],
    topCustomers: [],
    bestSellers: [],
    birthdays: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      const { data: products } = await supabase.from('products').select('*');

      // Buscamos name e birth_date para calcular os aniversariantes
      const { data: allCustomers } = await supabase.from('customers').select('name, birth_date');

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: monthlySales } = await supabase
        .from('sales')
        .select('total_amount, created_at')
        .gte('created_at', startOfMonth.toISOString());

      const { data: monthlyEntries } = await supabase
        .from('stock_movements')
        .select('quantity, product_id, products(buy_price)')
        .eq('type', 'entry')
        .gte('created_at', startOfMonth.toISOString());

      const { data: salesWithCustomers } = await supabase
        .from('sales')
        .select('total_amount, customer_id, customers(name)');

      const { data: saleItems } = await supabase
        .from('sale_items')
        .select('quantity, product_id, products(name), sale_id, sales(created_at)')
        .gte('sales.created_at', startOfMonth.toISOString());

      const totalInventoryValue = products?.reduce((sum, p) => sum + (p.buy_price * p.stock_quantity), 0) || 0;
      const potentialRevenue = products?.reduce((sum, p) => sum + (p.sell_price * p.stock_quantity), 0) || 0;
      const monthlyRevenue = monthlySales?.reduce((sum, s) => sum + Number(s.total_amount), 0) || 0;

      const monthlyExpenses = monthlyEntries?.reduce((sum, e) => {
        const buyPrice = (e.products as any)?.buy_price || 0;
        return sum + (buyPrice * e.quantity);
      }, 0) || 0;

      const lowStockProducts = products?.filter(p => p.stock_quantity < 3) || [];

      // Lógica de Aniversariantes
      const today = new Date();
      const currentMonth = today.getMonth(); // 0-11
      const currentDay = today.getDate();

      const birthdays = allCustomers
        ?.filter(c => {
          if (!c.birth_date) return false;
          // Ajuste de data para evitar problemas de fuso horário ao fazer split
          const [year, month, day] = c.birth_date.split('-').map(Number);
          return (month - 1) === currentMonth; // month vem 1-12, js usa 0-11
        })
        .map(c => {
          const [year, month, day] = c.birth_date!.split('-').map(Number);
          return {
            name: c.name,
            day: `${day}/${month}`,
            isToday: day === currentDay && (month - 1) === currentMonth,
            dayNum: day // auxiliar para ordenar
          };
        })
        .sort((a, b) => a.dayNum - b.dayNum) || [];

      // Lógica de Melhores Clientes
      const customerTotals: { [key: string]: { name: string; total: number } } = {};
      salesWithCustomers?.forEach(sale => {
        const customerId = sale.customer_id;
        const customerName = (sale.customers as any)?.name || 'Desconhecido';
        if (!customerTotals[customerId]) {
          customerTotals[customerId] = { name: customerName, total: 0 };
        }
        customerTotals[customerId].total += Number(sale.total_amount);
      });
      const topCustomers = Object.values(customerTotals)
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

      // Lógica de Mais Vendidos
      const productSales: { [key: string]: { name: string; quantity: number } } = {};
      saleItems?.forEach(item => {
        const productId = item.product_id;
        const productName = (item.products as any)?.name || 'Desconhecido';
        if (!productSales[productId]) {
          productSales[productId] = { name: productName, quantity: 0 };
        }
        productSales[productId].quantity += item.quantity;
      });
      const bestSellers = Object.values(productSales)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

      setData({
        totalInventoryValue,
        potentialRevenue,
        monthlyRevenue,
        monthlyExpenses,
        totalCustomers: allCustomers?.length || 0,
        lowStockProducts,
        topCustomers,
        bestSellers,
        birthdays,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const firstName = user?.email?.split('@')[0] || 'Usuário';

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title={`Olá, ${firstName}!`}
        subtitle="Aqui está o resumo do seu negócio"
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard
          title="Valor em Estoque"
          value={formatCurrency(data.totalInventoryValue)}
          subtitle={`Potencial: ${formatCurrency(data.potentialRevenue)}`}
          icon={<Package className="w-5 h-5 text-primary" />}
          variant="default"
        />
        <MetricCard
          title="Receita do Mês"
          value={formatCurrency(data.monthlyRevenue)}
          icon={<TrendingUp className="w-5 h-5 text-primary-foreground" />}
          variant="gold"
        />
        <MetricCard
          title="Gastos do Mês"
          value={formatCurrency(data.monthlyExpenses)}
          subtitle="Reposição de estoque"
          icon={<DollarSign className="w-5 h-5 text-secondary-foreground" />}
          variant="blush"
        />
        <MetricCard
          title="Clientes"
          value={data.totalCustomers.toString()}
          subtitle="Total cadastrados"
          icon={<Users className="w-5 h-5 text-accent-foreground" />}
          variant="accent"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Customers Chart - Ocupa 2 colunas */}
        <div className="lg:col-span-2 space-y-6">
          {data.topCustomers.length > 0 && (
            <Card className="border shadow-card">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-display flex items-center gap-2">
                  <Star className="w-5 h-5 text-primary" />
                  Melhores Clientes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data.topCustomers} layout="vertical" margin={{ left: 0, right: 20 }}>
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={100}
                      tick={{ fontSize: 13, fill: 'hsl(30 15% 18%)' }}
                    />
                    <Tooltip
                      formatter={(value) => formatCurrency(Number(value))}
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e5e5e5',
                        borderRadius: '8px',
                        fontSize: '13px'
                      }}
                    />
                    <Bar dataKey="total" radius={[0, 6, 6, 0]}>
                      {data.topCustomers.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? 'var(--primary)' : 'var(--champagne)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Best Sellers */}
          {data.bestSellers.length > 0 && (
            <Card className="border shadow-card">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-display flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Mais Vendidos do Mês
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.bestSellers.map((product, index) => (
                    <div
                      key={product.name}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg transition-colors hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${index === 0 ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
                          }`}>
                          {index + 1}
                        </span>
                        <span className="text-sm font-medium">{product.name}</span>
                      </div>
                      <span className="text-sm text-muted-foreground font-medium">
                        {product.quantity} un.
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Birthdays Column - Ocupa 1 coluna */}
        <div className="space-y-6">
          <Card className="border shadow-card h-full">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-display flex items-center gap-2">
                <Cake className="w-5 h-5 text-primary" />
                Aniversariantes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.birthdays.length > 0 ? (
                <div className="space-y-3">
                  {data.birthdays.map((b, i) => (
                    <div
                      key={i}
                      className={`flex items-center justify-between p-3 rounded-lg border ${b.isToday
                          ? 'bg-primary/5 border-primary/20'
                          : 'bg-card border-border/50'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        {b.isToday && (
                          <Cake className="w-4 h-4 text-primary animate-pulse" />
                        )}
                        <span className={`text-sm ${b.isToday ? 'font-bold text-primary' : 'font-medium'}`}>
                          {b.name}
                        </span>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${b.isToday
                          ? 'bg-primary text-primary-foreground font-bold'
                          : 'bg-secondary text-secondary-foreground'
                        }`}>
                        {b.isToday ? 'Hoje!' : b.day}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Nenhum aniversariante este mês.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Low Stock Alerts (moved to side column on desktop) */}
          {data.lowStockProducts.length > 0 && (
            <Card className="border-destructive/20 bg-destructive/5 shadow-card">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-display flex items-center gap-2 text-destructive">
                  <AlertTriangle className="w-5 h-5" />
                  Estoque Baixo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.lowStockProducts.slice(0, 6).map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-2 bg-white/60 rounded border border-destructive/10"
                    >
                      <span className="text-sm font-medium truncate mr-2">{product.name}</span>
                      <span className="text-xs font-bold text-destructive">
                        {product.stock_quantity} un.
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Empty State */}
      {data.totalCustomers === 0 && data.lowStockProducts.length === 0 && (
        <Card className="border shadow-card text-center p-12 mt-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-gold shadow-gold mb-6">
            <Sparkles className="w-8 h-8 text-primary-foreground" />
          </div>
          <h3 className="font-display text-xl font-semibold mb-2">Bem-vindo ao Clube do Brilho!</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Comece adicionando seus primeiros produtos e clientes para ver as métricas do seu negócio aqui.
          </p>
        </Card>
      )}
    </AppLayout>
  );
}