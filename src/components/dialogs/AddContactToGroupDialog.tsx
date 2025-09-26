import React, { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { Progress } from '@/components/ui/progress';
import { getPhoneValidationError, isValidBrazilianPhone } from '@/lib/phone-utils';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, FileText, Plus, CheckCircle } from 'lucide-react';

interface AddContactToGroupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
  onContactAdded: () => void;
}

interface ImportResult {
  total: number;
  inserted: number;
  duplicates: number;
  errors: string[];
}

export const AddContactToGroupDialog: React.FC<AddContactToGroupDialogProps> = ({
  isOpen,
  onClose,
  groupId,
  groupName,
  onContactAdded,
}) => {
  const [activeTab, setActiveTab] = useState('manual');
  const [loading, setLoading] = useState(false);
  
  // Manual form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
  });

  // CSV Import state
  const [csvData, setCsvData] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
    });
    setCsvData([]);
    setResult(null);
    setProgress(0);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) return;

    // Validate phone number
    const phoneError = getPhoneValidationError(formData.phone.trim());
    if (phoneError) {
      toast({
        title: 'Erro de Validação',
        description: phoneError,
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const userId = (await supabase.auth.getUser()).data.user!.id;
      
      const contactData = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || null,
        signature: 1, // Sempre ativo por padrão
        group_id: groupId,
        user_id: userId,
      };

      const { error } = await supabase
        .from('contacts')
        .insert([contactData]);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Contato adicionado com sucesso!',
      });

      resetForm();
      onContactAdded();
      onClose();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const parseContactsCSV = (csvText: string) => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) throw new Error('CSV deve ter pelo menos uma linha de cabeçalho e uma de dados');

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
    const contacts: any[] = [];

    // Find required columns
    const nameIndex = headers.findIndex(h => 
      h.includes('nome') || h.includes('name')
    );
    const phoneIndex = headers.findIndex(h => 
      h.includes('telefone') || h.includes('phone') || h.includes('celular')
    );
    const emailIndex = headers.findIndex(h => 
      h.includes('email') || h.includes('e-mail')
    );

    if (nameIndex === -1) {
      throw new Error('CSV deve conter uma coluna "nome" ou "name"');
    }
    if (phoneIndex === -1) {
      throw new Error('CSV deve conter uma coluna "telefone", "phone" ou "celular"');
    }

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/['"]/g, ''));
      
      const name = values[nameIndex]?.trim();
      const phone = values[phoneIndex]?.trim();
      
      if (name && phone) {
        contacts.push({
          name,
          phone,
          email: emailIndex !== -1 ? values[emailIndex]?.trim() : '',
        });
      }
    }

    return contacts;
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
      const parsed = parseContactsCSV(text);
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

  const importContacts = async () => {
    if (csvData.length === 0) return;

    setImporting(true);
    setProgress(0);
    
    const importResult: ImportResult = {
      total: csvData.length,
      inserted: 0,
      duplicates: 0,
      errors: []
    };

    try {
      const userId = (await supabase.auth.getUser()).data.user!.id;

      for (let i = 0; i < csvData.length; i++) {
        const contact = csvData[i];
        
        try {
          // Validate phone
          const phoneError = getPhoneValidationError(contact.phone);
          if (phoneError) {
            importResult.errors.push(`Contato "${contact.name}": ${phoneError}`);
            setProgress(Math.round(((i + 1) / csvData.length) * 100));
            continue;
          }

          // Check for duplicates by phone
          const { data: existing, error: checkError } = await supabase
            .from('contacts')
            .select('id')
            .eq('phone', contact.phone)
            .eq('group_id', groupId)
            .maybeSingle();

          if (checkError) throw checkError;

          if (existing) {
            importResult.duplicates++;
          } else {
            // Insert new contact
            const { error: insertError } = await supabase
              .from('contacts')
              .insert([{
                name: contact.name,
                phone: contact.phone,
                email: contact.email || null,
                signature: 1, // Sempre ativo por padrão
                group_id: groupId,
                user_id: userId,
              }]);

            if (insertError) throw insertError;
            importResult.inserted++;
          }
        } catch (error: any) {
          importResult.errors.push(`Contato "${contact.name}": ${error.message}`);
        }

        setProgress(Math.round(((i + 1) / csvData.length) * 100));
      }

      setResult(importResult);
      
      if (importResult.inserted > 0) {
        toast({
          title: 'Importação Concluída',
          description: `${importResult.inserted} contatos importados com sucesso!`,
        });
        onContactAdded();
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

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Adicionar Contato ao Grupo</DialogTitle>
          <DialogDescription>
            Adicione contatos ao grupo "{groupName}" manualmente ou via CSV
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">Manual</TabsTrigger>
            <TabsTrigger value="csv">Via CSV</TabsTrigger>
          </TabsList>
          
          <TabsContent value="manual" className="space-y-4">
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  placeholder="Nome completo"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone *</Label>
                <Input
                  id="phone"
                  placeholder="(11) 99999-9999"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@exemplo.com"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Adicionando...' : 'Adicionar Contato'}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
          
          <TabsContent value="csv" className="space-y-4">
            {/* CSV Instructions */}
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2">Formato do arquivo:</h4>
              <p className="text-sm text-muted-foreground mb-2">
                O CSV deve conter as seguintes colunas (obrigatórias em negrito):
              </p>
              <ul className="text-sm space-y-1 ml-4">
                <li>• <strong>nome</strong> ou <strong>name</strong> (obrigatório)</li>
                <li>• <strong>telefone</strong>, <strong>phone</strong> ou <strong>celular</strong> (obrigatório)</li>
                <li>• email ou e-mail (opcional)</li>
              </ul>
            </div>

            {/* File Upload */}
            <div className="space-y-4">
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="contacts-csv-upload"
                />
                <Button 
                  variant="outline" 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                  disabled={importing}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Selecionar Arquivo CSV
                </Button>
              </div>

              {csvData.length > 0 && (
                <div className="p-4 bg-accent rounded-lg">
                  <div className="flex items-center mb-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    <span className="font-medium">Arquivo carregado com sucesso!</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {csvData.length} contatos prontos para importação no grupo "{groupName}"
                  </p>
                </div>
              )}

              {importing && (
                <div className="space-y-2">
                  <Progress value={progress} className="w-full" />
                  <p className="text-sm text-center text-muted-foreground">
                    Importando... {progress}%
                  </p>
                </div>
              )}

              {result && (
                <div className="p-4 bg-card border rounded-lg">
                  <h4 className="font-medium mb-2">Resultado da Importação</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Total processados:</span>
                      <span>{result.total}</span>
                    </div>
                    <div className="flex justify-between text-green-600">
                      <span>Inseridos:</span>
                      <span>{result.inserted}</span>
                    </div>
                    <div className="flex justify-between text-yellow-600">
                      <span>Duplicados ignorados:</span>
                      <span>{result.duplicates}</span>
                    </div>
                    <div className="flex justify-between text-red-600">
                      <span>Erros:</span>
                      <span>{result.errors.length}</span>
                    </div>
                  </div>
                  
                  {result.errors.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium mb-1 text-destructive">Erros encontrados:</p>
                      <div className="max-h-20 overflow-y-auto text-xs space-y-1">
                        {result.errors.map((error, index) => (
                          <p key={index} className="text-destructive">{error}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose}>
                  {result ? 'Fechar' : 'Cancelar'}
                </Button>
                {csvData.length > 0 && !result && (
                  <Button onClick={importContacts} disabled={importing}>
                    {importing ? 'Importando...' : 'Importar Contatos'}
                  </Button>
                )}
              </DialogFooter>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};