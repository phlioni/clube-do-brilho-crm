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
import { Plus, Package, Edit2, Trash2, ArrowUpCircle, ArrowDownCircle, Search, Upload, X, Loader2 } from 'lucide-react';
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
  const [uploadingImage, setUploadingImage] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    buy_price: '0,00',
    sell_price: '0,00',
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

  // Função para formatar moeda enquanto digita (1250 -> 12,50)
  const handlePriceChange = (value: string, field: 'buy_price' | 'sell_price') => {
    // Remove tudo que não é número
    const numericValue = value.replace(/\D/g, '');

    // Converte para centavos e divide por 100
    const floatValue = parseFloat(numericValue) / 100;

    // Formata para exibição brasileira
    const formatted = new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(floatValue);

    setFormData(prev => ({ ...prev, [field]: formatted }));
  };

  // Converter string formatada "1.234,56" de volta para número float 1234.56 para salvar no banco
  const parseCurrency = (value: string) => {
    if (!value) return 0;
    return parseFloat(value.replace(/\./g, '').replace(',', '.'));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({ title: 'Erro', description: 'A imagem deve ter no máximo 5MB', variant: 'destructive' });
      return;
    }

    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${user?.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('products')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, image_url: publicUrl }));
      toast({ title: 'Sucesso', description: 'Imagem enviada!' });
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro', description: 'Falha ao enviar imagem', variant: 'destructive' });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveProduct = async () => {
    const buyPriceFloat = parseCurrency(formData.buy_price);
    const sellPriceFloat = parseCurrency(formData.sell_price);

    if (!formData.name || sellPriceFloat <= 0) {
      toast({ title: 'Erro', description: 'Nome e preço de venda são obrigatórios', variant: 'destructive' });
      return;
    }

    const productData = {
      name: formData.name,
      description: formData.description || null,
      category: formData.category || null,
      buy_price: buyPriceFloat,
      sell_price: sellPriceFloat,
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

    // Registra movimento
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

    // Atualiza produto
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
    setFormData({
      name: '',
      description: '',
      category: '',
      buy_price: '0,00',
      sell_price: '0,00',
      stock_quantity: '',
      image_url: ''
    });
    setEditingProduct(null);
    setShowProductDialog(false);
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      category: product.category || '',
      buy_price: new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(product.buy_price),
      sell_price: new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(product.sell_price),
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
          <Dialog open={showProductDialog} onOpenChange={(open) => !open && resetForm()}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground shadow-medium" onClick={() => { resetForm(); setShowProductDialog(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Produto
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-display text-xl">
                  {editingProduct ? 'Editar Produto' : 'Novo Produto'}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                {/* Image Upload */}
                <div className="flex flex-col items-center justify-center gap-3">
                  <div className="relative w-24 h-24 rounded-2xl bg-secondary flex items-center justify-center overflow-hidden border border-border">
                    {formData.image_url ? (
                      <>
                        <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
                        <button
                          onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                          className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white hover:bg-black/70"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <Package className="w-8 h-8 text-muted-foreground/50" />
                    )}
                    {uploadingImage && (
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      id="image-upload"
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8"
                      disabled={uploadingImage}
                      onClick={() => document.getElementById('image-upload')?.click()}
                    >
                      <Upload className="w-3 h-3 mr-2" />
                      {uploadingImage ? 'Enviando...' : 'Carregar Foto'}
                    </Button>
                  </div>
                </div>

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
                      value={formData.buy_price}
                      onChange={(e) => handlePriceChange(e.target.value, 'buy_price')}
                      placeholder="0,00"
                      className="h-11 mt-1.5 font-medium"
                    />
                  </div>
                  <div>
                    <Label>Venda (R$) *</Label>
                    <Input
                      value={formData.sell_price}
                      onChange={(e) => handlePriceChange(e.target.value, 'sell_price')}
                      placeholder="0,00"
                      className="h-11 mt-1.5 font-medium text-primary"
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
                    placeholder="Detalhes da peça..."
                    rows={2}
                    className="mt-1.5"
                  />
                </div>

                <Button onClick={handleSaveProduct} className="w-full h-11 text-base">
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
          className="pl-12 h-12 text-base rounded-xl border-border/60 bg-white/50 backdrop-blur-sm focus:bg-white transition-colors"
        />
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts.map((product) => (
          <Card key={product.id} className="border-0 shadow-medium overflow-hidden hover:shadow-luxury transition-all duration-300 group">
            <CardContent className="p-0">
              <div className="flex p-4 gap-4 items-start">
                <div className="w-20 h-20 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0 overflow-hidden border border-border/50">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  ) : (
                    <Package className="w-8 h-8 text-muted-foreground/40" />
                  )}
                </div>
                <div className="flex-1 min-w-0 py-1">
                  <h3 className="font-display font-semibold text-lg truncate leading-tight mb-1">{product.name}</h3>
                  {product.category && (
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{product.category}</span>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-base font-bold text-primary">
                      {formatCurrency(product.sell_price)}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${product.stock_quantity < 3
                        ? 'bg-red-50 text-red-600 border-red-100'
                        : 'bg-stone-50 text-stone-600 border-stone-200'
                      }`}>
                      {product.stock_quantity} UN
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions - Flat Design */}
              <div className="grid grid-cols-4 border-t border-border/50 divide-x divide-border/50 bg-stone-50/50">
                <button
                  className="h-10 flex items-center justify-center text-green-600 hover:bg-green-50 transition-colors"
                  onClick={() => { setSelectedProduct(product); setStockType('entry'); setShowStockDialog(true); }}
                  title="Entrada"
                >
                  <ArrowUpCircle className="w-4 h-4" />
                </button>
                <button
                  className="h-10 flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors"
                  onClick={() => { setSelectedProduct(product); setStockType('exit'); setShowStockDialog(true); }}
                  title="Saída"
                >
                  <ArrowDownCircle className="w-4 h-4" />
                </button>
                <button
                  className="h-10 flex items-center justify-center text-foreground hover:bg-stone-100 transition-colors"
                  onClick={() => openEditDialog(product)}
                  title="Editar"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  className="h-10 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-red-50 transition-colors"
                  onClick={() => handleDeleteProduct(product.id)}
                  title="Excluir"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredProducts.length === 0 && (
        <div className="text-center py-16 px-4">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-display text-lg font-semibold mb-1">Nenhum produto encontrado</h3>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto">
            Comece adicionando peças ao seu estoque clicando no botão "Novo Produto".
          </p>
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
            <div className="p-4 bg-secondary/50 rounded-xl border border-border/50">
              <p className="font-semibold text-sm">{selectedProduct?.name}</p>
              <p className="text-xs text-muted-foreground mt-1">Estoque atual: {selectedProduct?.stock_quantity} un.</p>
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
                placeholder="Ex: Reposição, Defeito..."
                rows={2}
                className="mt-1.5"
              />
            </div>
            <Button
              onClick={handleStockMovement}
              className={`w-full h-11 text-white ${stockType === 'entry' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-500 hover:bg-red-600'}`}
            >
              Confirmar {stockType === 'entry' ? 'Entrada' : 'Saída'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}