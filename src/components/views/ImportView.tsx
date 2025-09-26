import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { normalizePhoneNumber, isValidBrazilianPhone, getPhoneValidationError } from '@/lib/phone-utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { 
  Upload, 
  FileText, 
  AlertTriangle, 
  CheckCircle,
  Download,
  Info,
  Eye
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface Group {
  id: string;
  name: string;
}

interface CSVData {
  name: string;
  phone: string;
  email?: string;
  signature?: number;
}

interface ImportResult {
  total: number;
  inserted: number;
  duplicates: number;
  invalidPhones: number;
  errors: string[];
  duplicateContacts: CSVData[];
}

export const ImportView: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [csvData, setCsvData] = useState<CSVData[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [duplicateContacts, setDuplicateContacts] = useState<CSVData[]>([]);
  const [validContacts, setValidContacts] = useState<CSVData[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('contact_groups')
        .select('*')
        .order('name');

      if (error) throw error;
      setGroups(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar grupos: ' + error.message,
        variant: 'destructive',
      });
    }
  };

  const parseCSV = (csvText: string): CSVData[] => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) throw new Error('CSV deve ter pelo menos uma linha de cabeçalho e uma de dados');

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
    const data: CSVData[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/['"]/g, ''));
      
      const nameIndex = headers.findIndex(h => h.includes('nome') || h.includes('name'));
      const phoneIndex = headers.findIndex(h => h.includes('telefone') || h.includes('phone') || h.includes('fone'));
      const emailIndex = headers.findIndex(h => h.includes('email') || h.includes('e-mail'));
      const signatureIndex = headers.findIndex(h => h.includes('assinatura') || h.includes('signature'));

      if (nameIndex === -1 || phoneIndex === -1) {
        throw new Error(`Linha ${i + 1}: CSV deve conter colunas 'nome' e 'telefone'`);
      }

      if (values[nameIndex] && values[phoneIndex]) {
        data.push({
          name: values[nameIndex],
          phone: values[phoneIndex],
          email: emailIndex !== -1 ? values[emailIndex] : undefined,
          signature: 1 // Sempre ativo por padrão
        });
      }
    }

    return data;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast({
        title: 'Erro',
        description: 'Por favor, selecione um arquivo CSV válido.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const text = await file.text();
      const parsed = parseCSV(text);
      setCsvData(parsed);
      setResult(null);

      toast({
        title: 'CSV Carregado',
        description: `${parsed.length} contatos encontrados no arquivo.`,
      });
    } catch (error: any) {
      toast({
        title: 'Erro no CSV',
        description: error.message,
        variant: 'destructive',
      });
      setCsvData([]);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const checkForDuplicates = async (contacts: CSVData[]) => {
    if (!contacts.length) return { valid: [], duplicates: [], invalid: [] };

    // Get all existing contacts
    const { data: existingContacts, error } = await supabase
      .from('contacts')
      .select('phone');

    if (error) throw error;

    const valid: CSVData[] = [];
    const duplicates: CSVData[] = [];
    const invalid: CSVData[] = [];

    contacts.forEach((contact, index) => {
      // Check if phone is valid
      if (!isValidBrazilianPhone(contact.phone)) {
        invalid.push(contact);
        return;
      }

      // Check for duplicates
      const normalizedPhone = normalizePhoneNumber(contact.phone);
      const isDuplicate = existingContacts?.some(existing => {
        const existingNormalized = normalizePhoneNumber(existing.phone);
        return existingNormalized === normalizedPhone;
      });

      // Also check for duplicates within the CSV itself
      const csvDuplicate = contacts.some((other, otherIndex) => {
        if (otherIndex >= index) return false; // Only check previous contacts
        const otherNormalized = normalizePhoneNumber(other.phone);
        return otherNormalized === normalizedPhone;
      });

      if (isDuplicate || csvDuplicate) {
        duplicates.push(contact);
      } else {
        valid.push(contact);
      }
    });

    return { valid, duplicates, invalid };
  };

  const preCheckContacts = async () => {
    if (!selectedGroup || csvData.length === 0) return;

    try {
      const { valid, duplicates, invalid } = await checkForDuplicates(csvData);
      
      setValidContacts(valid);
      setDuplicateContacts([...duplicates, ...invalid]);

      if (duplicates.length > 0 || invalid.length > 0) {
        setShowDuplicateDialog(true);
      } else {
        // No issues, proceed directly
        await importValidContacts(valid);
      }
    } catch (error: any) {
      toast({
        title: 'Erro na Verificação',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const importValidContacts = async (contactsToImport: CSVData[]) => {
    setImporting(true);
    setProgress(0);
    setShowDuplicateDialog(false);
    
    const importResult: ImportResult = {
      total: csvData.length,
      inserted: 0,
      duplicates: duplicateContacts.length,
      invalidPhones: duplicateContacts.filter(c => !isValidBrazilianPhone(c.phone)).length,
      errors: [],
      duplicateContacts: duplicateContacts
    };

    try {
      for (let i = 0; i < contactsToImport.length; i++) {
        const contact = contactsToImport[i];
        
        try {
          const { error: insertError } = await supabase
            .from('contacts')
            .insert([{
              name: contact.name,
              phone: contact.phone,
              email: contact.email || null,
              signature: 1, // Sempre ativo por padrão
              group_id: selectedGroup,
              user_id: (await supabase.auth.getUser()).data.user!.id,
            }]);

          if (insertError) throw insertError;
          importResult.inserted++;
        } catch (error: any) {
          importResult.errors.push(`${contact.name}: ${error.message}`);
        }

        setProgress(Math.round(((i + 1) / contactsToImport.length) * 100));
      }

      setResult(importResult);
      
      if (importResult.inserted > 0) {
        toast({
          title: 'Importação Concluída',
          description: `${importResult.inserted} contatos importados com sucesso!`,
        });
      }

    } catch (error: any) {
      toast({
        title: 'Erro na Importação',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
      setCsvData([]);
    }
  };

  const importContacts = async () => {
    await preCheckContacts();
  };

  const downloadTemplate = () => {
    const template = 'nome,telefone,email,assinatura\nJoão Silva,11987654321,joao@email.com,Obrigado pelo contato!\nMaria Santos,(21) 98765-4321,maria@email.com,Atenciosamente\nPedro Costa,85987654321,pedro@email.com,Até mais!\nAna Oliveira,(11) 8765-4321,ana@email.com,Cordialmente';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_contatos.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Importar Contatos via CSV</h2>
        <p className="text-muted-foreground">Importe contatos em lote com instruções completas</p>
      </div>

      {/* Instructions Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Format Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2 text-primary" />
              Formato do Arquivo
            </CardTitle>
            <CardDescription>
              Instruções detalhadas sobre o formato CSV
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2 text-green-600">Colunas Obrigatórias:</h4>
              <ul className="space-y-2">
                <li className="flex items-center space-x-2">
                  <Badge variant="default" className="text-xs">nome</Badge>
                  <span className="text-sm">ou <code>name</code> - Nome completo do contato</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Badge variant="default" className="text-xs">telefone</Badge>
                  <span className="text-sm">ou <code>phone</code> - Número de telefone</span>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-2 text-blue-600">Colunas Opcionais:</h4>
              <ul className="space-y-2">
                <li className="flex items-center space-x-2">
                  <Badge variant="secondary" className="text-xs">email</Badge>
                  <span className="text-sm">ou <code>e-mail</code> - Email do contato</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Badge variant="secondary" className="text-xs">assinatura</Badge>
                  <span className="text-sm">ou <code>signature</code> - Mensagem personalizada</span>
                </li>
              </ul>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2">Exemplo de arquivo:</h4>
              <div className="bg-background p-3 rounded border font-mono text-xs overflow-x-auto">
                <div className="text-green-600">nome,telefone,email,assinatura</div>
                <div>João Silva,11987654321,joao@email.com,Obrigado!</div>
                <div>Maria Santos,(21) 98765-4321,maria@email.com,Atenciosamente</div>
                <div>Pedro Costa,85987654321,pedro@email.com,Até mais!</div>
                <div>Ana Oliveira,(11) 8765-4321,ana@email.com,Cordialmente</div>
              </div>
              <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                <p className="font-medium text-blue-800 mb-1">Formatos de telefone aceitos:</p>
                <div className="space-y-1 text-blue-700">
                  <div>• <strong>11 dígitos:</strong> 11987654321 ou (11) 98765-4321</div>
                  <div>• <strong>10 dígitos:</strong> 1187654321 ou (11) 8765-4321</div>
                  <div>• <strong>Observação:</strong> Números iguais com 10 e 11 dígitos são detectados como duplicados</div>
                </div>
              </div>
            </div>

            <Button onClick={downloadTemplate} variant="outline" size="sm" className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Baixar Template CSV
            </Button>
          </CardContent>
        </Card>

        {/* Tips and Best Practices */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Info className="h-5 w-5 mr-2 text-blue-500" />
              Dicas e Boas Práticas
            </CardTitle>
            <CardDescription>
              Como preparar seu arquivo para melhor importação
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2 text-green-600">✅ Recomendações:</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Use codificação UTF-8 para caracteres especiais</li>
                <li>• Mantenha uma linha de cabeçalho sempre</li>
                <li>• Formate telefones consistentemente</li>
                <li>• Verifique emails antes da importação</li>
                <li>• Use vírgulas apenas como separadores</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-2 text-red-600">❌ Evite:</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Linhas vazias no meio do arquivo</li>
                <li>• Vírgulas dentro dos dados (use aspas)</li>
                <li>• Caracteres especiais não-UTF8</li>
                <li>• Duplicar telefones entre grupos</li>
                <li>• Arquivos muito grandes (máx. 1000 linhas)</li>
              </ul>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-800">Validação de Telefones</p>
                  <p className="text-yellow-700">
                    Apenas telefones com 10 dígitos (DDD + 8) ou 11 dígitos (DDD + 9 + 8) serão aceitos. Números duplicados (mesmo número com 10 e 11 dígitos) serão detectados.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {groups.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <CardTitle className="mb-2">Nenhum grupo encontrado</CardTitle>
            <CardDescription>
              Você precisa criar pelo menos um grupo antes de importar contatos.
            </CardDescription>
          </CardContent>
        </Card>
      )}

      {groups.length > 0 && (
        <>
          {/* Group Selection */}
          <Card>
            <CardHeader>
              <CardTitle>1. Selecionar Grupo de Destino</CardTitle>
              <CardDescription>
                Escolha o grupo onde os contatos serão importados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="group-select">Grupo de Destino</Label>
                <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um grupo" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* File Upload */}
          <Card>
            <CardHeader>
              <CardTitle>2. Upload do Arquivo CSV</CardTitle>
              <CardDescription>
                Selecione o arquivo CSV preparado conforme as instruções
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="csv-upload"
                  />
                  <Button 
                    variant="outline" 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-20 border-dashed border-2"
                    disabled={importing}
                  >
                    <div className="text-center">
                      <Upload className="h-6 w-6 mx-auto mb-2" />
                      <span className="font-medium">Clique para selecionar arquivo CSV</span>
                      <p className="text-xs text-muted-foreground">
                        Ou arraste e solte aqui
                      </p>
                    </div>
                  </Button>
                </div>

                {csvData.length > 0 && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                        <span className="font-medium text-green-800">Arquivo carregado com sucesso!</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowPreview(true)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Visualizar
                      </Button>
                    </div>
                    <p className="text-sm text-green-700">
                      {csvData.length} contatos prontos para importação
                    </p>
                    
                    {/* Quick stats */}
                    <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Com email: </span>
                        <span>{csvData.filter(c => c.email).length}</span>
                      </div>
                      <div>
                        <span className="font-medium">Com assinatura: </span>
                        <span>{csvData.filter(c => c.signature).length}</span>
                      </div>
                    </div>
                  </div>
                )}

                {csvData.length > 0 && selectedGroup && (
                  <Button 
                    onClick={importContacts} 
                    disabled={importing}
                    className="w-full h-12"
                    size="lg"
                  >
                    {importing ? 'Verificando contatos...' : `Verificar e Importar ${csvData.length} Contatos`}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Progress */}
          {importing && (
            <Card>
              <CardContent className="py-6">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Importando contatos válidos...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="w-full h-2" />
                  <p className="text-xs text-muted-foreground text-center">
                    Inserindo contatos na base de dados...
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {result && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                  Resultado da Importação
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-3xl font-bold text-blue-600">{result.total}</div>
                    <div className="text-sm text-blue-800 font-medium">Total Processados</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-3xl font-bold text-green-600">{result.inserted}</div>
                    <div className="text-sm text-green-800 font-medium">Importados</div>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <div className="text-3xl font-bold text-yellow-600">{result.duplicates}</div>
                    <div className="text-sm text-yellow-800 font-medium">Duplicados</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-3xl font-bold text-red-600">{result.invalidPhones}</div>
                    <div className="text-sm text-red-800 font-medium">Telefones Inválidos</div>
                  </div>
                </div>

                {result.duplicateContacts && result.duplicateContacts.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium text-yellow-600 mb-2">Contatos duplicados/inválidos (não importados):</h4>
                    <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg max-h-40 overflow-y-auto">
                      {result.duplicateContacts.slice(0, 10).map((contact, index) => (
                        <div key={index} className="text-sm text-yellow-800 mb-1 p-2 bg-white rounded border">
                          <div className="font-medium">{contact.name} - {contact.phone}</div>
                          <div className="text-xs text-yellow-600">
                            {!isValidBrazilianPhone(contact.phone) ? 'Telefone inválido' : 'Número duplicado'}
                          </div>
                        </div>
                      ))}
                      {result.duplicateContacts.length > 10 && (
                        <p className="text-sm text-muted-foreground">
                          ... e mais {result.duplicateContacts.length - 10} contatos
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {result.errors.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium text-destructive mb-2">Outros erros:</h4>
                    <div className="bg-destructive/10 p-3 rounded-lg max-h-40 overflow-y-auto">
                      {result.errors.slice(0, 10).map((error, index) => (
                        <p key={index} className="text-sm text-destructive mb-1">{error}</p>
                      ))}
                      {result.errors.length > 10 && (
                        <p className="text-sm text-muted-foreground">
                          ... e mais {result.errors.length - 10} erros
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Duplicate Confirmation Dialog */}
      <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-yellow-600" />
              Contatos Duplicados/Inválidos Encontrados
            </DialogTitle>
            <DialogDescription>
              Encontramos {duplicateContacts.length} contatos que não podem ser importados. 
              Você pode continuar importando apenas os contatos válidos ou cancelar a operação.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-green-50 border-green-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-green-800">Contatos Válidos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{validContacts.length}</div>
                  <div className="text-sm text-green-700">Serão importados</div>
                </CardContent>
              </Card>
              
              <Card className="bg-yellow-50 border-yellow-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-yellow-800">Problemas Encontrados</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">{duplicateContacts.length}</div>
                  <div className="text-sm text-yellow-700">Não serão importados</div>
                </CardContent>
              </Card>
            </div>

            <div>
              <h4 className="font-medium text-destructive mb-3">Contatos com problemas:</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {duplicateContacts.map((contact, index) => (
                  <div key={index} className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-yellow-900">{contact.name}</div>
                        <div className="text-sm text-yellow-800">{contact.phone}</div>
                        {contact.email && (
                          <div className="text-xs text-yellow-700">{contact.email}</div>
                        )}
                      </div>
                      <Badge variant="destructive" className="text-xs">
                        {!isValidBrazilianPhone(contact.phone) ? 'Telefone Inválido' : 'Duplicado'}
                      </Badge>
                    </div>
                    <div className="mt-2 text-xs text-yellow-600">
                      {!isValidBrazilianPhone(contact.phone) 
                        ? getPhoneValidationError(contact.phone)
                        : 'Este número já existe no sistema ou está duplicado no arquivo'
                      }
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => setShowDuplicateDialog(false)}
            >
              Cancelar Importação
            </Button>
            <Button 
              onClick={() => importValidContacts(validContacts)}
              disabled={validContacts.length === 0}
            >
              {validContacts.length > 0 
                ? `Importar ${validContacts.length} Contatos Válidos`
                : 'Nenhum Contato Válido'
              }
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Prévia dos Dados</DialogTitle>
            <DialogDescription>
              Confira os dados antes da importação ({csvData.length} contatos)
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            <div className="space-y-2">
              {csvData.slice(0, 50).map((contact, index) => (
                <div key={index} className="border rounded p-3 text-sm">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div>
                      <span className="font-medium">Nome:</span> {contact.name}
                    </div>
                    <div>
                      <span className="font-medium">Telefone:</span> {contact.phone}
                    </div>
                    <div>
                      <span className="font-medium">Email:</span> {contact.email || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">Assinatura:</span> {contact.signature || 'N/A'}
                    </div>
                  </div>
                </div>
              ))}
              {csvData.length > 50 && (
                <div className="text-center text-muted-foreground py-4">
                  ... e mais {csvData.length - 50} contatos
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};