import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import { MetricCard } from '@/components/MetricCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, Users, Package, AlertTriangle, Star, Sparkles } from 'lucide-react';
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
      const { count: customersCount } = await supabase.from('customers').select('*', { count: 'exact', head: true });

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
        totalCustomers: customersCount || 0,
        lowStockProducts,
        topCustomers,
        bestSellers,
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Customers Chart */}
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
                      backgroundColor: 'hsl(45 40% 99%)',
                      border: '1px solid hsl(45 25% 88%)',
                      borderRadius: '8px',
                      fontSize: '13px'
                    }}
                  />
                  <Bar dataKey="total" radius={[0, 6, 6, 0]}>
                    {data.topCustomers.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? 'hsl(45 70% 42%)' : 'hsl(45 70% 70%)'} />
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
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg transition-colors hover:bg-muted"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full ${
                        index === 0 ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
                      }`}>
                        {index + 1}
                      </span>
                      <span className="text-sm font-medium">{product.name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground font-medium">
                      {product.quantity} vendidos
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Low Stock Alerts */}
      {data.lowStockProducts.length > 0 && (
        <Card className="mt-6 border-destructive/20 bg-destructive/5 shadow-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-display flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Estoque Baixo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.lowStockProducts.slice(0, 6).map((product) => (
                <div 
                  key={product.id}
                  className="flex items-center justify-between p-3 bg-card rounded-lg border"
                >
                  <span className="text-sm font-medium truncate mr-2">{product.name}</span>
                  <span className="text-xs font-semibold px-2 py-1 bg-destructive/10 text-destructive rounded-full whitespace-nowrap">
                    {product.stock_quantity} un.
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {data.totalCustomers === 0 && data.lowStockProducts.length === 0 && (
        <Card className="border shadow-card text-center p-12">
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
