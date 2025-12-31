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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Users, Edit2, Trash2, Phone, Mail, Search, ShoppingBag, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  street: string | null;
  number: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  complement: string | null;
  created_at: string;
}

interface Sale {
  id: string;
  total_amount: number;
  created_at: string;
}

const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export default function Customers() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSales, setCustomerSales] = useState<Sale[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    notes: '',
    street: '',
    number: '',
    neighborhood: '',
    city: '',
    state: '',
    complement: '',
  });

  useEffect(() => {
    if (user) fetchCustomers();
  }, [user]);

  const fetchCustomers = async () => {
    const { data, error } = await supabase.from('customers').select('*').order('name');
    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível carregar os clientes', variant: 'destructive' });
    } else {
      setCustomers(data || []);
    }
    setLoading(false);
  };

  const fetchCustomerSales = async (customerId: string) => {
    const { data, error } = await supabase.from('sales').select('*').eq('customer_id', customerId).order('created_at', { ascending: false });
    if (!error) setCustomerSales(data || []);
  };

  const handleSaveCustomer = async () => {
    if (!formData.name.trim()) {
      toast({ title: 'Erro', description: 'Nome é obrigatório', variant: 'destructive' });
      return;
    }

    const customerData = {
      name: formData.name.trim(),
      phone: formData.phone.trim() || null,
      email: formData.email.trim() || null,
      notes: formData.notes.trim() || null,
      street: formData.street.trim() || null,
      number: formData.number.trim() || null,
      neighborhood: formData.neighborhood.trim() || null,
      city: formData.city.trim() || null,
      state: formData.state.trim() || null,
      complement: formData.complement.trim() || null,
      user_id: user?.id,
    };

    if (editingCustomer) {
      const { error } = await supabase.from('customers').update(customerData).eq('id', editingCustomer.id);
      if (error) {
        toast({ title: 'Erro', description: 'Não foi possível atualizar o cliente', variant: 'destructive' });
      } else {
        toast({ title: 'Sucesso', description: 'Cliente atualizado!' });
        fetchCustomers();
        resetForm();
      }
    } else {
      const { error } = await supabase.from('customers').insert([customerData]);
      if (error) {
        toast({ title: 'Erro', description: 'Não foi possível criar o cliente', variant: 'destructive' });
      } else {
        toast({ title: 'Sucesso', description: 'Cliente cadastrado!' });
        fetchCustomers();
        resetForm();
      }
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível excluir o cliente', variant: 'destructive' });
    } else {
      toast({ title: 'Sucesso', description: 'Cliente excluído!' });
      fetchCustomers();
    }
  };

  const resetForm = () => {
    setFormData({
      name: '', phone: '', email: '', notes: '',
      street: '', number: '', neighborhood: '', city: '', state: '', complement: ''
    });
    setEditingCustomer(null);
    setShowDialog(false);
  };

  const openEditDialog = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone || '',
      email: customer.email || '',
      notes: customer.notes || '',
      street: customer.street || '',
      number: customer.number || '',
      neighborhood: customer.neighborhood || '',
      city: customer.city || '',
      state: customer.state || '',
      complement: customer.complement || '',
    });
    setShowDialog(true);
  };

  const openHistoryDialog = async (customer: Customer) => {
    setSelectedCustomer(customer);
    await fetchCustomerSales(customer.id);
    setShowHistoryDialog(true);
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone?.includes(searchTerm)
  );

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

  // Função auxiliar para formatar endereço na listagem
  const formatAddress = (c: Customer) => {
    const parts = [
      c.street,
      c.number ? `nº ${c.number}` : null,
      c.neighborhood,
      c.city ? `${c.city}${c.state ? `/${c.state}` : ''}` : null
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  };

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
        title="Clientes"
        subtitle={`${customers.length} clientes cadastrados`}
        action={
          <Dialog open={showDialog} onOpenChange={(open) => !open && resetForm()}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground shadow-medium" onClick={() => { resetForm(); setShowDialog(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Cliente
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-display text-xl">
                  {editingCustomer ? 'Editar Cliente' : 'Novo Cliente'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                {/* Dados Pessoais */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Dados Pessoais</h4>
                  <div>
                    <Label>Nome *</Label>
                    <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Nome completo" className="h-11 mt-1.5" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Telefone</Label>
                      <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="(00) 00000-0000" className="h-11 mt-1.5" />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="email@exemplo.com" className="h-11 mt-1.5" />
                    </div>
                  </div>
                </div>

                {/* Endereço */}
                <div className="space-y-4 pt-2 border-t border-border/50">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mt-2">Endereço</h4>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="col-span-3">
                      <Label>Rua</Label>
                      <Input value={formData.street} onChange={(e) => setFormData({ ...formData, street: e.target.value })} placeholder="Nome da rua" className="h-11 mt-1.5" />
                    </div>
                    <div className="col-span-1">
                      <Label>Número</Label>
                      <Input value={formData.number} onChange={(e) => setFormData({ ...formData, number: e.target.value })} placeholder="123" className="h-11 mt-1.5" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Bairro</Label>
                      <Input value={formData.neighborhood} onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })} placeholder="Bairro" className="h-11 mt-1.5" />
                    </div>
                    <div>
                      <Label>Complemento</Label>
                      <Input value={formData.complement} onChange={(e) => setFormData({ ...formData, complement: e.target.value })} placeholder="Apto, Bloco..." className="h-11 mt-1.5" />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="col-span-3">
                      <Label>Cidade</Label>
                      <Input value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} placeholder="Cidade" className="h-11 mt-1.5" />
                    </div>
                    <div className="col-span-1">
                      <Label>UF</Label>
                      <Select value={formData.state} onValueChange={(v) => setFormData({ ...formData, state: v })}>
                        <SelectTrigger className="h-11 mt-1.5">
                          <SelectValue placeholder="UF" />
                        </SelectTrigger>
                        <SelectContent>
                          {UFS.map(uf => (
                            <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Anotações */}
                <div className="pt-2 border-t border-border/50">
                  <Label>Observações</Label>
                  <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Anotações sobre o cliente..." rows={3} className="mt-1.5 resize-none" />
                </div>

                <Button onClick={handleSaveCustomer} className="w-full h-11 text-base font-medium">
                  {editingCustomer ? 'Salvar Alterações' : 'Cadastrar Cliente'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input placeholder="Buscar clientes..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-12 h-12 text-base rounded-xl border-border/60 bg-white/50 backdrop-blur-sm focus:bg-white transition-colors" />
      </div>

      {/* Customers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map((customer) => (
          <Card key={customer.id} className="border-0 shadow-medium hover:shadow-luxury transition-all duration-300 group">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                  <Users className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg truncate">{customer.name}</h3>

                  <div className="space-y-1 mt-1">
                    {customer.phone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="w-3.5 h-3.5" />
                        <span>{customer.phone}</span>
                      </div>
                    )}
                    {customer.email && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="w-3.5 h-3.5" />
                        <span className="truncate">{customer.email}</span>
                      </div>
                    )}
                    {(customer.street || customer.city) && (
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                        <span className="truncate line-clamp-1">{formatAddress(customer)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {customer.notes && (
                <p className="text-sm text-muted-foreground mt-4 pt-4 border-t border-border/50 line-clamp-2 italic">"{customer.notes}"</p>
              )}

              <div className="flex gap-2 mt-4 pt-4 border-t border-border/50">
                <Button size="sm" variant="outline" className="flex-1 h-9" onClick={() => openHistoryDialog(customer)}>
                  <ShoppingBag className="w-3.5 h-3.5 mr-1.5" />
                  Histórico
                </Button>
                <Button size="icon" variant="ghost" className="h-9 w-9 text-muted-foreground hover:text-foreground" onClick={() => openEditDialog(customer)}>
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteCustomer(customer.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCustomers.length === 0 && (
        <div className="text-center py-16 px-4">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-display text-lg font-semibold mb-1">Nenhum cliente encontrado</h3>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto">
            Cadastre seus clientes para manter um histórico de vendas e contatos.
          </p>
        </div>
      )}

      {/* Purchase History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Histórico de Compras</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <div className="p-4 bg-secondary/30 rounded-xl mb-4 border border-border/50">
              <p className="font-semibold">{selectedCustomer?.name}</p>
              <p className="text-sm text-muted-foreground">{customerSales.length} compras realizadas</p>
            </div>

            {customerSales.length > 0 ? (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                {customerSales.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between p-4 bg-card border rounded-xl hover:bg-secondary/20 transition-colors">
                    <span className="text-sm text-muted-foreground">{formatDate(sale.created_at)}</span>
                    <span className="font-display font-semibold text-primary">{formatCurrency(sale.total_amount)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-secondary/10 rounded-xl border border-dashed border-border">
                <ShoppingBag className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">Nenhuma compra registrada</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}