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
import { Plus, Users, Edit2, Trash2, Phone, Mail, Search, ShoppingBag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
}

interface Sale {
  id: string;
  total_amount: number;
  created_at: string;
}

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
  });

  useEffect(() => {
    if (user) fetchCustomers();
  }, [user]);

  const fetchCustomers = async () => {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('name');
    
    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível carregar os clientes', variant: 'destructive' });
    } else {
      setCustomers(data || []);
    }
    setLoading(false);
  };

  const fetchCustomerSales = async (customerId: string) => {
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });
    
    if (!error) {
      setCustomerSales(data || []);
    }
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
      user_id: user?.id,
    };

    if (editingCustomer) {
      const { error } = await supabase
        .from('customers')
        .update(customerData)
        .eq('id', editingCustomer.id);

      if (error) {
        toast({ title: 'Erro', description: 'Não foi possível atualizar o cliente', variant: 'destructive' });
      } else {
        toast({ title: 'Sucesso', description: 'Cliente atualizado!' });
        fetchCustomers();
        resetForm();
      }
    } else {
      const { error } = await supabase
        .from('customers')
        .insert([customerData]);

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
    setFormData({ name: '', phone: '', email: '', notes: '' });
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
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
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-gradient-gold shadow-gold" onClick={() => { resetForm(); setShowDialog(true); }}>
                <Plus className="w-4 h-4 mr-1" />
                Novo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm mx-4">
              <DialogHeader>
                <DialogTitle className="font-display">
                  {editingCustomer ? 'Editar Cliente' : 'Novo Cliente'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Nome *</Label>
                  <Input 
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nome completo"
                    className="h-11"
                  />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input 
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(00) 00000-0000"
                    className="h-11"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input 
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@exemplo.com"
                    className="h-11"
                  />
                </div>
                <div>
                  <Label>Observações</Label>
                  <Textarea 
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Anotações sobre o cliente..."
                    rows={3}
                  />
                </div>
                <Button onClick={handleSaveCustomer} className="w-full h-11 bg-gradient-gold">
                  {editingCustomer ? 'Salvar Alterações' : 'Cadastrar Cliente'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Buscar clientes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 h-11"
        />
      </div>

      {/* Customers List */}
      <div className="space-y-3">
        {filteredCustomers.map((customer) => (
          <Card key={customer.id} className="border-0 shadow-card">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm truncate">{customer.name}</h3>
                  {customer.phone && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <Phone className="w-3 h-3" />
                      <span>{customer.phone}</span>
                    </div>
                  )}
                  {customer.email && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <Mail className="w-3 h-3" />
                      <span className="truncate">{customer.email}</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8"
                    onClick={() => openHistoryDialog(customer)}
                  >
                    <ShoppingBag className="w-4 h-4" />
                  </Button>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8"
                    onClick={() => openEditDialog(customer)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDeleteCustomer(customer.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              {customer.notes && (
                <p className="text-xs text-muted-foreground mt-3 pt-3 border-t line-clamp-2">
                  {customer.notes}
                </p>
              )}
            </CardContent>
          </Card>
        ))}

        {filteredCustomers.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhum cliente encontrado</p>
          </div>
        )}
      </div>

      {/* Purchase History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle className="font-display">
              Histórico de Compras
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <div className="p-3 bg-secondary rounded-lg mb-4">
              <p className="font-medium text-sm">{selectedCustomer?.name}</p>
              <p className="text-xs text-muted-foreground">
                {customerSales.length} compras realizadas
              </p>
            </div>
            
            {customerSales.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {customerSales.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span className="text-xs text-muted-foreground">
                      {formatDate(sale.created_at)}
                    </span>
                    <span className="font-semibold text-sm text-primary">
                      {formatCurrency(sale.total_amount)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8 text-sm">
                Nenhuma compra registrada
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
