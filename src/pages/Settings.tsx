import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { LogOut, User, ShoppingCart, HelpCircle, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface Product {
  id: string;
  name: string;
  sell_price: number;
  stock_quantity: number;
}

interface Customer {
  id: string;
  name: string;
}

interface CartItem {
  product: Product;
  quantity: number;
}

export default function Settings() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showSaleDialog, setShowSaleDialog] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const openSaleDialog = async () => {
    // Fetch customers and products
    const [customersRes, productsRes] = await Promise.all([
      supabase.from('customers').select('id, name').order('name'),
      supabase.from('products').select('id, name, sell_price, stock_quantity').gt('stock_quantity', 0).order('name'),
    ]);

    setCustomers(customersRes.data || []);
    setProducts(productsRes.data || []);
    setShowSaleDialog(true);
  };

  const addToCart = () => {
    const product = products.find(p => p.id === selectedProduct);
    if (!product || quantity <= 0) return;

    const existingIndex = cart.findIndex(item => item.product.id === product.id);
    
    if (existingIndex >= 0) {
      const newCart = [...cart];
      newCart[existingIndex].quantity += quantity;
      setCart(newCart);
    } else {
      setCart([...cart, { product, quantity }]);
    }
    
    setSelectedProduct('');
    setQuantity(1);
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + (item.product.sell_price * item.quantity), 0);
  };

  const handleCompleteSale = async () => {
    if (!selectedCustomer || cart.length === 0) {
      toast({ title: 'Erro', description: 'Selecione um cliente e adicione produtos', variant: 'destructive' });
      return;
    }

    setLoading(true);

    try {
      // Create sale
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert([{
          customer_id: selectedCustomer,
          total_amount: calculateTotal(),
          user_id: user?.id,
        }])
        .select()
        .single();

      if (saleError) throw saleError;

      // Create sale items
      const saleItems = cart.map(item => ({
        sale_id: sale.id,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.product.sell_price,
      }));

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems);

      if (itemsError) throw itemsError;

      // Update stock and create movements
      for (const item of cart) {
        // Create stock movement
        await supabase.from('stock_movements').insert([{
          product_id: item.product.id,
          type: 'exit',
          quantity: item.quantity,
          sale_id: sale.id,
          user_id: user?.id,
        }]);

        // Update product stock
        await supabase
          .from('products')
          .update({ stock_quantity: item.product.stock_quantity - item.quantity })
          .eq('id', item.product.id);
      }

      toast({ title: 'Sucesso', description: 'Venda registrada com sucesso!' });
      setShowSaleDialog(false);
      setCart([]);
      setSelectedCustomer('');
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível registrar a venda', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <AppLayout>
      <PageHeader 
        title="Ajustes"
        subtitle="Configurações e ações rápidas"
      />

      {/* Quick Actions */}
      <div className="space-y-3 mb-6">
        <Card 
          className="border-0 shadow-card cursor-pointer hover:shadow-soft transition-shadow"
          onClick={openSaleDialog}
        >
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-gold flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium">Nova Venda</h3>
              <p className="text-xs text-muted-foreground">Registrar uma venda para um cliente</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Account Section */}
      <h2 className="text-sm font-semibold text-muted-foreground mb-3 px-1">Conta</h2>
      <div className="space-y-3 mb-6">
        <Card className="border-0 shadow-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
              <User className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-sm">Minha Conta</h3>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="border-0 shadow-card cursor-pointer hover:shadow-soft transition-shadow"
          onClick={handleSignOut}
        >
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <LogOut className="w-5 h-5 text-destructive" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-destructive">Sair</h3>
              <p className="text-xs text-muted-foreground">Encerrar sessão</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* About Section */}
      <h2 className="text-sm font-semibold text-muted-foreground mb-3 px-1">Sobre</h2>
      <Card className="border-0 shadow-card">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-gold flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <h3 className="font-display font-medium">Clube do Brilho</h3>
            <p className="text-xs text-muted-foreground">Versão 1.0.0</p>
          </div>
        </CardContent>
      </Card>

      {/* Sale Dialog */}
      <Dialog open={showSaleDialog} onOpenChange={setShowSaleDialog}>
        <DialogContent className="max-w-sm mx-4 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Nova Venda</DialogTitle>
            <DialogDescription>Registre uma venda para um cliente</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            {/* Customer Selection */}
            <div>
              <Label>Cliente *</Label>
              <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map(customer => (
                    <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Add Product */}
            <div className="p-3 bg-muted rounded-lg space-y-3">
              <Label className="text-sm font-medium">Adicionar Produto</Label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Selecione um produto" />
                </SelectTrigger>
                <SelectContent>
                  {products.map(product => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} - {formatCurrency(product.sell_price)} ({product.stock_quantity} un.)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Input 
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className="h-10 w-24"
                  placeholder="Qtd"
                />
                <Button onClick={addToCart} className="flex-1 h-10" variant="outline" disabled={!selectedProduct}>
                  Adicionar
                </Button>
              </div>
            </div>

            {/* Cart */}
            {cart.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Carrinho</Label>
                {cart.map(item => (
                  <div key={item.product.id} className="flex items-center justify-between p-2 bg-secondary rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.quantity}x {formatCurrency(item.product.sell_price)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">
                        {formatCurrency(item.product.sell_price * item.quantity)}
                      </span>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 w-8 p-0 text-destructive"
                        onClick={() => removeFromCart(item.product.id)}
                      >
                        ×
                      </Button>
                    </div>
                  </div>
                ))}
                
                {/* Total */}
                <div className="flex items-center justify-between p-3 bg-gradient-gold rounded-lg">
                  <span className="font-semibold text-primary-foreground">Total</span>
                  <span className="text-lg font-bold text-primary-foreground">
                    {formatCurrency(calculateTotal())}
                  </span>
                </div>
              </div>
            )}

            <Button 
              onClick={handleCompleteSale} 
              className="w-full h-11 bg-gradient-gold"
              disabled={loading || !selectedCustomer || cart.length === 0}
            >
              {loading ? 'Processando...' : 'Finalizar Venda'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
