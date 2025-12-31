import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Package, Edit2, Trash2, ArrowUpCircle, ArrowDownCircle, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Product {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  buy_price: number;
  sell_price: number;
  stock_quantity: number;
  image_url: string | null;
}

const categories = ['Anéis', 'Brincos', 'Colares', 'Pulseiras', 'Conjuntos', 'Outros'];

export default function Inventory() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [showStockDialog, setShowStockDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [stockType, setStockType] = useState<'entry' | 'exit'>('entry');
  const [stockQuantity, setStockQuantity] = useState(1);
  const [stockNotes, setStockNotes] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    buy_price: '',
    sell_price: '',
    stock_quantity: '',
    image_url: '',
  });

  useEffect(() => {
    if (user) fetchProducts();
  }, [user]);

  const fetchProducts = async () => {
    const { data, error } = await supabase.from('products').select('*').order('name');
    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível carregar os produtos', variant: 'destructive' });
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  };

  const handleSaveProduct = async () => {
    if (!formData.name || !formData.sell_price) {
      toast({ title: 'Erro', description: 'Nome e preço de venda são obrigatórios', variant: 'destructive' });
      return;
    }

    const productData = {
      name: formData.name,
      description: formData.description || null,
      category: formData.category || null,
      buy_price: parseFloat(formData.buy_price) || 0,
      sell_price: parseFloat(formData.sell_price) || 0,
      stock_quantity: parseInt(formData.stock_quantity) || 0,
      image_url: formData.image_url || null,
      user_id: user?.id,
    };

    if (editingProduct) {
      const { error } = await supabase.from('products').update(productData).eq('id', editingProduct.id);
      if (error) {
        toast({ title: 'Erro', description: 'Não foi possível atualizar o produto', variant: 'destructive' });
      } else {
        toast({ title: 'Sucesso', description: 'Produto atualizado!' });
        fetchProducts();
        resetForm();
      }
    } else {
      const { error } = await supabase.from('products').insert([productData]);
      if (error) {
        toast({ title: 'Erro', description: 'Não foi possível criar o produto', variant: 'destructive' });
      } else {
        toast({ title: 'Sucesso', description: 'Produto criado!' });
        fetchProducts();
        resetForm();
      }
    }
  };

  const handleDeleteProduct = async (id: string) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível excluir o produto', variant: 'destructive' });
    } else {
      toast({ title: 'Sucesso', description: 'Produto excluído!' });
      fetchProducts();
    }
  };

  const handleStockMovement = async () => {
    if (!selectedProduct || stockQuantity <= 0) return;

    const newQuantity = stockType === 'entry' 
      ? selectedProduct.stock_quantity + stockQuantity 
      : selectedProduct.stock_quantity - stockQuantity;

    if (newQuantity < 0) {
      toast({ title: 'Erro', description: 'Estoque insuficiente', variant: 'destructive' });
      return;
    }

    const { error: movementError } = await supabase.from('stock_movements').insert([{
      product_id: selectedProduct.id,
      type: stockType,
      quantity: stockQuantity,
      notes: stockNotes || null,
      user_id: user?.id,
    }]);

    if (movementError) {
      toast({ title: 'Erro', description: 'Não foi possível registrar o movimento', variant: 'destructive' });
      return;
    }

    const { error: updateError } = await supabase.from('products').update({ stock_quantity: newQuantity }).eq('id', selectedProduct.id);

    if (updateError) {
      toast({ title: 'Erro', description: 'Não foi possível atualizar o estoque', variant: 'destructive' });
    } else {
      toast({ 
        title: 'Sucesso', 
        description: `${stockType === 'entry' ? 'Entrada' : 'Saída'} de ${stockQuantity} unidades registrada!` 
      });
      fetchProducts();
      setShowStockDialog(false);
      setStockQuantity(1);
      setStockNotes('');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', category: '', buy_price: '', sell_price: '', stock_quantity: '', image_url: '' });
    setEditingProduct(null);
    setShowProductDialog(false);
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      category: product.category || '',
      buy_price: product.buy_price.toString(),
      sell_price: product.sell_price.toString(),
      stock_quantity: product.stock_quantity.toString(),
      image_url: product.image_url || '',
    });
    setShowProductDialog(true);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

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
        title="Estoque"
        subtitle={`${products.length} produtos cadastrados`}
        action={
          <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-gold shadow-gold" onClick={() => { resetForm(); setShowProductDialog(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Produto
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="font-display text-xl">
                  {editingProduct ? 'Editar Produto' : 'Novo Produto'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Nome *</Label>
                  <Input 
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nome do produto"
                    className="h-11 mt-1.5"
                  />
                </div>
                <div>
                  <Label>Categoria</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                    <SelectTrigger className="h-11 mt-1.5">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Custo (R$)</Label>
                    <Input 
                      type="number"
                      step="0.01"
                      value={formData.buy_price}
                      onChange={(e) => setFormData({ ...formData, buy_price: e.target.value })}
                      placeholder="0,00"
                      className="h-11 mt-1.5"
                    />
                  </div>
                  <div>
                    <Label>Venda (R$) *</Label>
                    <Input 
                      type="number"
                      step="0.01"
                      value={formData.sell_price}
                      onChange={(e) => setFormData({ ...formData, sell_price: e.target.value })}
                      placeholder="0,00"
                      className="h-11 mt-1.5"
                    />
                  </div>
                </div>
                <div>
                  <Label>Estoque Inicial</Label>
                  <Input 
                    type="number"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                    placeholder="0"
                    className="h-11 mt-1.5"
                  />
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Textarea 
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descrição do produto..."
                    rows={2}
                    className="mt-1.5"
                  />
                </div>
                <Button onClick={handleSaveProduct} className="w-full h-11 bg-gradient-gold">
                  {editingProduct ? 'Salvar Alterações' : 'Criar Produto'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input 
          placeholder="Buscar produtos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-12 h-12 text-base"
        />
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts.map((product) => (
          <Card key={product.id} className="border shadow-card overflow-hidden hover:shadow-soft transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <Package className="w-7 h-7 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base truncate">{product.name}</h3>
                  {product.category && (
                    <span className="text-xs text-muted-foreground">{product.category}</span>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-lg font-display font-semibold text-primary">
                      {formatCurrency(product.sell_price)}
                    </span>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      product.stock_quantity < 3 
                        ? 'bg-destructive/10 text-destructive' 
                        : 'bg-secondary text-secondary-foreground'
                    }`}>
                      {product.stock_quantity} un.
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex gap-2 mt-4 pt-4 border-t">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="flex-1 h-10"
                  onClick={() => {
                    setSelectedProduct(product);
                    setStockType('entry');
                    setShowStockDialog(true);
                  }}
                >
                  <ArrowUpCircle className="w-4 h-4 mr-1.5 text-green-600" />
                  Entrada
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="flex-1 h-10"
                  onClick={() => {
                    setSelectedProduct(product);
                    setStockType('exit');
                    setShowStockDialog(true);
                  }}
                >
                  <ArrowDownCircle className="w-4 h-4 mr-1.5 text-destructive" />
                  Saída
                </Button>
                <Button size="icon" variant="ghost" className="h-10 w-10" onClick={() => openEditDialog(product)}>
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-10 w-10 text-destructive hover:text-destructive" onClick={() => handleDeleteProduct(product.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-16">
          <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-display text-lg font-semibold mb-1">Nenhum produto encontrado</h3>
          <p className="text-muted-foreground">Adicione seu primeiro produto clicando no botão acima.</p>
        </div>
      )}

      {/* Stock Movement Dialog */}
      <Dialog open={showStockDialog} onOpenChange={setShowStockDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              {stockType === 'entry' ? 'Entrada de Estoque' : 'Saída de Estoque'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="p-4 bg-muted rounded-xl">
              <p className="font-semibold">{selectedProduct?.name}</p>
              <p className="text-sm text-muted-foreground">Estoque atual: {selectedProduct?.stock_quantity} un.</p>
            </div>
            <div>
              <Label>Quantidade</Label>
              <Input 
                type="number"
                min="1"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(parseInt(e.target.value) || 0)}
                className="h-11 mt-1.5"
              />
            </div>
            <div>
              <Label>Observação</Label>
              <Textarea 
                value={stockNotes}
                onChange={(e) => setStockNotes(e.target.value)}
                placeholder="Opcional..."
                rows={2}
                className="mt-1.5"
              />
            </div>
            <Button 
              onClick={handleStockMovement} 
              className={`w-full h-11 ${stockType === 'entry' ? 'bg-green-600 hover:bg-green-700' : 'bg-destructive hover:bg-destructive/90'}`}
            >
              Confirmar {stockType === 'entry' ? 'Entrada' : 'Saída'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
