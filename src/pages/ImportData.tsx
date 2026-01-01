import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Download, Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

export default function ImportData() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    // --- FUNÇÕES DE DOWNLOAD DE MODELO ---

    const downloadTemplate = (type: 'products' | 'customers') => {
        let data = [];
        let fileName = '';

        if (type === 'products') {
            fileName = 'modelo_produtos.xlsx';
            data = [{
                'Nome': 'Brinco de Ouro Exemplo',
                'Categoria': 'Brincos',
                'Custo (R$)': 50.00,
                'Venda (R$)': 120.00,
                'Estoque': 10,
                'Descrição': 'Brinco pequeno folheado'
            }];
        } else {
            fileName = 'modelo_clientes.xlsx';
            data = [{
                'Nome': 'Maria Silva',
                'Telefone': '(11) 99999-9999',
                'Data Nascimento': '1990-05-25',
                'Rua': 'Rua das Flores',
                'Número': '123',
                'Bairro': 'Centro',
                'Cidade': 'São Paulo',
                'Estado': 'SP',
                'Complemento': 'Apto 10',
                'Observações': 'Cliente VIP'
            }];
        }

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Dados");
        XLSX.writeFile(wb, fileName);
    };

    // --- FUNÇÕES DE IMPORTAÇÃO ---

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'products' | 'customers') => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        setSummary(null);

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);

                if (data.length === 0) throw new Error("O arquivo está vazio.");

                if (type === 'products') {
                    await importProducts(data);
                } else {
                    await importCustomers(data);
                }

            } catch (error: any) {
                console.error(error);
                setSummary({ type: 'error', message: `Erro ao processar arquivo: ${error.message}` });
                toast({ title: 'Erro', description: 'Falha na importação.', variant: 'destructive' });
            } finally {
                setLoading(false);
                // Limpar o input para permitir subir o mesmo arquivo se quiser
                e.target.value = '';
            }
        };
        reader.readAsBinaryString(file);
    };

    const importProducts = async (data: any[]) => {
        const formattedData = data.map((row) => ({
            user_id: user?.id,
            name: row['Nome'],
            category: row['Categoria'] || 'Outros',
            buy_price: Number(row['Custo (R$)']) || 0,
            sell_price: Number(row['Venda (R$)']) || 0,
            stock_quantity: Number(row['Estoque']) || 0,
            description: row['Descrição'] || '',
        })).filter(p => p.name && p.sell_price > 0); // Validação básica

        if (formattedData.length === 0) throw new Error("Nenhum produto válido encontrado. Verifique as colunas.");

        const { error } = await supabase.from('products').insert(formattedData);

        if (error) throw error;

        setSummary({ type: 'success', message: `${formattedData.length} produtos importados com sucesso!` });
        toast({ title: 'Sucesso', description: 'Estoque atualizado.' });
    };

    const importCustomers = async (data: any[]) => {
        const formattedData = data.map((row) => ({
            user_id: user?.id,
            name: row['Nome'],
            phone: row['Telefone'] ? String(row['Telefone']) : null,
            birth_date: row['Data Nascimento'] ? String(row['Data Nascimento']) : null, // Espera formato YYYY-MM-DD ou texto
            street: row['Rua'] || null,
            number: row['Número'] ? String(row['Número']) : null,
            neighborhood: row['Bairro'] || null,
            city: row['Cidade'] || null,
            state: row['Estado'] || null,
            complement: row['Complemento'] || null,
            notes: row['Observações'] || null,
        })).filter(c => c.name);

        if (formattedData.length === 0) throw new Error("Nenhum cliente válido encontrado.");

        const { error } = await supabase.from('customers').insert(formattedData);

        if (error) throw error;

        setSummary({ type: 'success', message: `${formattedData.length} clientes cadastrados com sucesso!` });
        toast({ title: 'Sucesso', description: 'Carteira de clientes atualizada.' });
    };

    return (
        <AppLayout>
            <PageHeader
                title="Importar Dados"
                subtitle="Cadastre produtos e clientes em massa via Excel"
            />

            <div className="max-w-4xl mx-auto mt-6">
                <Tabs defaultValue="products" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-8">
                        <TabsTrigger value="products">Importar Estoque</TabsTrigger>
                        <TabsTrigger value="customers">Importar Clientes</TabsTrigger>
                    </TabsList>

                    {/* ABA DE PRODUTOS */}
                    <TabsContent value="products">
                        <div className="grid gap-6 md:grid-cols-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Download className="w-5 h-5 text-primary" />
                                        1. Baixar Modelo
                                    </CardTitle>
                                    <CardDescription>
                                        Baixe a planilha padrão para preencher seus produtos corretamente.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Button variant="outline" className="w-full" onClick={() => downloadTemplate('products')}>
                                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                                        Download Modelo (.xlsx)
                                    </Button>
                                    <div className="mt-4 text-xs text-muted-foreground bg-secondary/30 p-3 rounded-md">
                                        <strong>Colunas Obrigatórias:</strong> Nome, Venda (R$).<br />
                                        As demais são opcionais, mas recomendadas.
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Upload className="w-5 h-5 text-primary" />
                                        2. Enviar Arquivo
                                    </CardTitle>
                                    <CardDescription>
                                        Selecione o arquivo Excel preenchido para realizar o cadastro.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center justify-center w-full">
                                        <label htmlFor="dropzone-file-products" className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                {loading ? (
                                                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                                ) : (
                                                    <Upload className="w-8 h-8 mb-3 text-muted-foreground" />
                                                )}
                                                <p className="text-sm text-muted-foreground">
                                                    {loading ? 'Processando...' : 'Clique para selecionar o arquivo'}
                                                </p>
                                            </div>
                                            <input
                                                id="dropzone-file-products"
                                                type="file"
                                                className="hidden"
                                                accept=".xlsx, .xls"
                                                onChange={(e) => handleFileUpload(e, 'products')}
                                                disabled={loading}
                                            />
                                        </label>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* ABA DE CLIENTES */}
                    <TabsContent value="customers">
                        <div className="grid gap-6 md:grid-cols-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Download className="w-5 h-5 text-primary" />
                                        1. Baixar Modelo
                                    </CardTitle>
                                    <CardDescription>
                                        Baixe a planilha padrão para preencher seus clientes.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Button variant="outline" className="w-full" onClick={() => downloadTemplate('customers')}>
                                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                                        Download Modelo (.xlsx)
                                    </Button>
                                    <div className="mt-4 text-xs text-muted-foreground bg-secondary/30 p-3 rounded-md">
                                        <strong>Atenção:</strong> A data de nascimento deve estar no formato AAAA-MM-DD (Ex: 1990-12-25) para funcionar corretamente.
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Upload className="w-5 h-5 text-primary" />
                                        2. Enviar Arquivo
                                    </CardTitle>
                                    <CardDescription>
                                        Selecione o arquivo Excel preenchido.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center justify-center w-full">
                                        <label htmlFor="dropzone-file-customers" className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                {loading ? (
                                                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                                ) : (
                                                    <Upload className="w-8 h-8 mb-3 text-muted-foreground" />
                                                )}
                                                <p className="text-sm text-muted-foreground">
                                                    {loading ? 'Processando...' : 'Clique para selecionar o arquivo'}
                                                </p>
                                            </div>
                                            <input
                                                id="dropzone-file-customers"
                                                type="file"
                                                className="hidden"
                                                accept=".xlsx, .xls"
                                                onChange={(e) => handleFileUpload(e, 'customers')}
                                                disabled={loading}
                                            />
                                        </label>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>

                {/* FEEDBACK VISUAL */}
                {summary && (
                    <Alert className={`mt-6 ${summary.type === 'success' ? 'border-green-500 bg-green-50' : 'border-destructive bg-red-50'}`}>
                        {summary.type === 'success' ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <AlertCircle className="h-4 w-4 text-destructive" />}
                        <AlertTitle className={summary.type === 'success' ? 'text-green-800' : 'text-destructive'}>
                            {summary.type === 'success' ? 'Importação Concluída' : 'Erro na Importação'}
                        </AlertTitle>
                        <AlertDescription className={summary.type === 'success' ? 'text-green-700' : 'text-red-700'}>
                            {summary.message}
                        </AlertDescription>
                    </Alert>
                )}
            </div>
        </AppLayout>
    );
}