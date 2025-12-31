import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, ShoppingCart, Trash2, XCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

interface Sale {
  id: string;
  total_amount: number;
  created_at: string;
  status: string; // 'completed' | 'cancelled'
  cancellation_reason?: string;
  customers: { name: string } | null;
}

export default function Sales() {
  const { user } = useAuth();
  const { toast } = useToast();

  // States para Listagem e Criação
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSaleDialog, setShowSaleDialog] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // States para Cancelamento
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [saleToCancel, setSaleToCancel] = useState<Sale | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [returnToStock, setReturnToStock] = useState(true);

  useEffect(() => {
    if (user) fetchSales();
  }, [user]);

  const fetchSales = async () => {
    const { data, error } = await supabase
      .from('sales')
      .select('*, customers(name)')
      .order('created_at', { ascending: false });

    if (!error) setSales(data || []);
    setLoading(false);
  };

  // --- Lógica de Nova Venda ---

  const openSaleDialog = async () => {
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

  const calculateTotal = () => cart.reduce((sum, item) => sum + (item.product.sell_price * item.quantity), 0);

  const handleCompleteSale = async () => {
    if (!selectedCustomer || cart.length === 0) {
      toast({ title: 'Erro', description: 'Selecione um cliente e adicione produtos', variant: 'destructive' });
      return;
    }

    setSubmitting(true);

    try {
      // 1. Criar Venda
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert([{
          customer_id: selectedCustomer,
          total_amount: calculateTotal(),
          user_id: user?.id,
          status: 'completed'
        }])
        .select()
        .single();

      if (saleError) throw saleError;

      const saleItems = cart.map(item => ({
        sale_id: sale.id,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.product.sell_price,
      }));

      // 2. Criar Itens da Venda
      const { error: itemsError } = await supabase.from('sale_items').insert(saleItems);
      if (itemsError) throw itemsError;

      // 3. Baixar Estoque e Registrar Movimento
      for (const item of cart) {
        await supabase.from('stock_movements').insert([{
          product_id: item.product.id,
          type: 'exit',
          quantity: item.quantity,
          sale_id: sale.id,
          user_id: user?.id,
          reason: 'Venda Realizada'
        }]);
        await supabase.from('products').update({ stock_quantity: item.product.stock_quantity - item.quantity }).eq('id', item.product.id);
      }

      toast({ title: 'Sucesso', description: 'Venda registrada com sucesso!' });
      setShowSaleDialog(false);
      setCart([]);
      setSelectedCustomer('');
      fetchSales();
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro', description: 'Não foi possível registrar a venda', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // --- Lógica de Cancelamento ---

  const handleOpenCancelDialog = (sale: Sale) => {
    setSaleToCancel(sale);
    setCancelReason('');
    setReturnToStock(true); // Padrão: devolver ao estoque
    setShowCancelDialog(true);
  };

  const confirmCancellation = async () => {
    if (!saleToCancel || !cancelReason.trim()) {
      toast({ title: 'Atenção', description: 'Informe o motivo do cancelamento.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);

    try {
      // 1. Atualizar status da venda
      const { error: updateError } = await supabase
        .from('sales')
        .update({
          status: 'cancelled',
          cancellation_reason: cancelReason
        })
        .eq('id', saleToCancel.id);

      if (updateError) throw updateError;

      // 2. Se optou por devolver ao estoque
      if (returnToStock) {
        // Buscar itens dessa venda
        const { data: items } = await supabase
          .from('sale_items')
          .select('product_id, quantity')
          .eq('sale_id', saleToCancel.id);

        if (items) {
          for (const item of items) {
            // Buscar produto atual para saber estoque atual
            const { data: prodData } = await supabase
              .from('products')
              .select('stock_quantity')
              .eq('id', item.product_id)
              .single();

            if (prodData) {
              const currentStock = prodData.stock_quantity;

              // Devolver estoque
              await supabase.from('products')
                .update({ stock_quantity: currentStock + item.quantity })
                .eq('id', item.product_id);

              // Registrar movimento de ajuste/estorno
              await supabase.from('stock_movements').insert([{
                product_id: item.product_id,
                type: 'entry', // Entrada pois está voltando
                quantity: item.quantity,
                user_id: user?.id,
                reason: `Cancelamento Venda #${saleToCancel.id.slice(0, 6)}`
              }]);
            }
          }
        }
      }

      toast({ title: 'Sucesso', description: 'Venda cancelada com sucesso.' });
      setShowCancelDialog(false);
      setSaleToCancel(null);
      fetchSales();

    } catch (error) {
      console.error(error);
      toast({ title: 'Erro', description: 'Erro ao cancelar venda.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // --- Utilitários ---

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

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
        title="Vendas"
        subtitle={`${sales.length} registros`}
        action={
          <Button className="bg-primary text-primary-foreground shadow-medium" onClick={openSaleDialog}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Venda
          </Button>
        }
      />

      {/* Sales List */}
      <div className="space-y-3">
        {sales.map((sale) => {
          const isCancelled = sale.status === 'cancelled';
          return (
            <Card key={sale.id} className={`border-0 shadow-sm transition-all ${isCancelled ? 'opacity-70 bg-stone-50' : 'bg-card hover:shadow-md'}`}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${isCancelled ? 'bg-destructive/10 text-destructive' : 'bg-champagne text-white'
                      }`}>
                      {isCancelled ? <XCircle className="w-6 h-6" /> : <ShoppingCart className="w-6 h-6" />}
                    </div>
                    <div>
                      <h3 className={`font-semibold ${isCancelled ? 'line-through text-muted-foreground' : ''}`}>
                        {sale.customers?.name || 'Cliente não encontrado'}
                      </h3>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                        <p className="text-sm text-muted-foreground">{formatDate(sale.created_at)}</p>
                        {isCancelled && (
                          <span className="text-[10px] bg-destructive/10 text-destructive px-2 py-0.5 rounded-full font-bold w-fit">
                            CANCELADO
                          </span>
                        )}
                      </div>
                      {isCancelled && sale.cancellation_reason && (
                        <p className="text-xs text-muted-foreground mt-1 italic">
                          "{sale.cancellation_reason}"
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <span className={`text-xl font-display font-semibold ${isCancelled ? 'text-muted-foreground' : 'text-primary'}`}>
                      {formatCurrency(sale.total_amount)}
                    </span>
                    {!isCancelled && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                        onClick={() => handleOpenCancelDialog(sale)}
                      >
                        Cancelar
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {sales.length === 0 && (
          <div className="text-center py-16">
            <ShoppingCart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-display text-lg font-semibold mb-1">Nenhuma venda registrada</h3>
            <p className="text-muted-foreground">Registre sua primeira venda clicando no botão acima.</p>
          </div>
        )}
      </div>

      {/* Sale Dialog (New Sale) */}
      <Dialog open={showSaleDialog} onOpenChange={setShowSaleDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Nova Venda</DialogTitle>
            <DialogDescription>Registre uma venda para um cliente</DialogDescription>
          </DialogHeader>

          <div className="space-y-5 mt-4">
            <div>
              <Label>Cliente *</Label>
              <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                <SelectTrigger className="h-11 mt-1.5">
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map(customer => (
                    <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="p-4 bg-secondary/50 rounded-xl space-y-3 border border-border/50">
              <Label className="font-semibold">Adicionar Produto</Label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger className="h-11 bg-white">
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
              <div className="flex gap-3">
                <Input type="number" min="1" value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 1)} className="h-11 w-24 bg-white" placeholder="Qtd" />
                <Button onClick={addToCart} className="flex-1 h-11" variant="outline" disabled={!selectedProduct}>Adicionar</Button>
              </div>
            </div>

            {cart.length > 0 && (
              <div className="space-y-3">
                <Label className="font-semibold">Carrinho</Label>
                {cart.map(item => (
                  <div key={item.product.id} className="flex items-center justify-between p-4 bg-card border rounded-xl shadow-sm">
                    <div className="flex-1">
                      <p className="font-medium">{item.product.name}</p>
                      <p className="text-sm text-muted-foreground">{item.quantity}x {formatCurrency(item.product.sell_price)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-display font-semibold">{formatCurrency(item.product.sell_price * item.quantity)}</span>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removeFromCart(item.product.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                <div className="flex items-center justify-between p-4 bg-primary rounded-xl text-primary-foreground shadow-medium">
                  <span className="font-semibold">Total</span>
                  <span className="text-2xl font-display font-bold">{formatCurrency(calculateTotal())}</span>
                </div>
              </div>
            )}

            <Button
              onClick={handleCompleteSale}
              className="w-full h-12 text-base font-semibold"
              disabled={submitting || !selectedCustomer || cart.length === 0}
            >
              {submitting ? 'Processando...' : 'Finalizar Venda'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Sale Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-xl text-destructive flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Cancelar Venda
            </DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 mt-2">
            <div>
              <Label className="mb-2 block">Motivo do Cancelamento *</Label>
              <Textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ex: Cliente desistiu, troca, defeito..."
                className="resize-none"
                rows={3}
              />
            </div>

            <div className="flex items-start space-x-3 p-3 bg-secondary/30 rounded-lg border border-border/50">
              <Checkbox
                id="returnStock"
                checked={returnToStock}
                onCheckedChange={(checked) => setReturnToStock(checked as boolean)}
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="returnStock"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Devolver produtos ao estoque?
                </label>
                <p className="text-xs text-muted-foreground">
                  Se desmarcado, os itens serão considerados perdidos/avariados.
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowCancelDialog(false)}>
                Voltar
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={confirmCancellation}
                disabled={submitting || !cancelReason.trim()}
              >
                {submitting ? 'Cancelando...' : 'Confirmar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </AppLayout>
  );
}