import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
// Removed tenant dependency
import { normalizePhoneNumber, isValidBrazilianPhone, getPhoneValidationError } from '@/lib/phone-utils';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Upload, FileText, AlertTriangle, CheckCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useEffect } from "react";

interface Group {
  id: string;
  name: string;
}

interface CSVData {
  name: string;
  phone: string;
  email?: string;
  signature?: string;
}

interface ImportResult {
  total: number;
  inserted: number;
  duplicates: number;
  invalidPhones: number;
  errors: string[];
  duplicateContacts?: CSVData[];
}

export const CSVImporter = () => {
  // Removed tenant dependency
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [csvData, setCsvData] = useState<CSVData[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const { data, error } = await supabase
        .from("contact_groups")
        .select("*")
        .order("name");

      if (error) throw error;
      setGroups(data || []);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao carregar grupos: " + error.message,
        variant: "destructive",
      });
    }
  };

  const parseCSV = (csvText: string): CSVData[] => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) throw new Error("CSV deve ter pelo menos uma linha de cabeçalho e uma de dados");

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
          signature: signatureIndex !== -1 ? values[signatureIndex] : undefined,
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
        title: "Erro",
        description: "Por favor, selecione um arquivo CSV válido.",
        variant: "destructive",
      });
      return;
    }

    try {
      const text = await file.text();
      const parsed = parseCSV(text);
      setCsvData(parsed);
      setResult(null);

      toast({
        title: "CSV Carregado",
        description: `${parsed.length} contatos encontrados no arquivo.`,
      });
    } catch (error: any) {
      toast({
        title: "Erro no CSV",
        description: error.message,
        variant: "destructive",
      });
      setCsvData([]);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const importContacts = async () => {
    if (!selectedGroup || csvData.length === 0) return;

    setImporting(true);
    setProgress(0);
    
    const importResult: ImportResult = {
      total: csvData.length,
      inserted: 0,
      duplicates: 0,
      invalidPhones: 0,
      errors: []
    };

    try {
      for (let i = 0; i < csvData.length; i++) {
        const contact = csvData[i];
        
        try {
          // Validate phone number format first
          if (!isValidBrazilianPhone(contact.phone)) {
            importResult.invalidPhones++;
            const error = getPhoneValidationError(contact.phone);
            importResult.errors.push(`Linha ${i + 2}: ${error || 'Formato de telefone inválido'}`);
            setProgress(Math.round(((i + 1) / csvData.length) * 100));
            continue;
          }

          // Normalize phone for duplicate checking
          const normalizedPhone = normalizePhoneNumber(contact.phone);
          if (!normalizedPhone) {
            importResult.invalidPhones++;
            importResult.errors.push(`Linha ${i + 2}: Não foi possível normalizar o telefone`);
            setProgress(Math.round(((i + 1) / csvData.length) * 100));
            continue;
          }

          // Check for duplicates using normalized phone
          const { data: allContacts, error: fetchError } = await supabase
            .from("contacts")
            .select("phone");

          if (fetchError) throw fetchError;

          // Check if any existing contact has the same normalized phone
          const isDuplicate = allContacts?.some(existingContact => {
            const existingNormalized = normalizePhoneNumber(existingContact.phone);
            return existingNormalized === normalizedPhone;
          });

          if (isDuplicate) {
            importResult.duplicates++;
          } else {
            // Insert new contact
            const { error: insertError } = await supabase
              .from("contacts")
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
          }
        } catch (error: any) {
          importResult.errors.push(`Linha ${i + 2}: ${error.message}`);
        }

        setProgress(Math.round(((i + 1) / csvData.length) * 100));
      }

      setResult(importResult);
      
      if (importResult.inserted > 0) {
        toast({
          title: "Importação Concluída",
          description: `${importResult.inserted} contatos importados com sucesso!`,
        });
      }

    } catch (error: any) {
      toast({
        title: "Erro na Importação",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setImporting(false);
      setCsvData([]);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Importar Contatos via CSV</h2>
        <p className="text-muted-foreground">Importe contatos em lote a partir de um arquivo CSV</p>
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Formato do Arquivo CSV
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              O arquivo CSV deve conter as seguintes colunas (obrigatórias):
            </p>
            <ul className="text-sm space-y-1 ml-4">
              <li>• <strong>nome</strong> ou <strong>name</strong> - Nome do contato</li>
              <li>• <strong>telefone</strong> ou <strong>phone</strong> - Número de telefone</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-3">
              Colunas opcionais:
            </p>
            <ul className="text-sm space-y-1 ml-4">
              <li>• <strong>email</strong> ou <strong>e-mail</strong> - Email do contato</li>
              <li>• <strong>assinatura</strong> ou <strong>signature</strong> - Assinatura personalizada</li>
            </ul>
            <div className="bg-muted p-3 rounded-lg mt-4">
              <p className="text-sm font-medium">Exemplo:</p>
              <code className="text-xs">nome,telefone,email,assinatura</code><br />
              <code className="text-xs">João Silva,11987654321,joao@email.com,Obrigado!</code><br />
              <code className="text-xs">Maria Santos,(21) 98765-4321,maria@email.com,Atenciosamente</code><br />
              <code className="text-xs">Pedro Costa,1187654321,pedro@email.com,Até mais!</code>
              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                <p className="font-medium text-blue-800">Formatos aceitos:</p>
                <div className="text-blue-700">
                  11 dígitos: 11987654321 | 10 dígitos: 1187654321
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
              <CardTitle>Selecionar Grupo</CardTitle>
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
              <CardTitle>Upload do Arquivo</CardTitle>
              <CardDescription>
                Selecione o arquivo CSV para importar
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
                      {csvData.length} contatos prontos para importação
                    </p>
                  </div>
                )}

                {csvData.length > 0 && selectedGroup && (
                  <Button 
                    onClick={importContacts} 
                    disabled={importing}
                    className="w-full"
                  >
                    {importing ? "Importando..." : "Importar Contatos"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Progress */}
          {importing && (
            <Card>
              <CardContent className="py-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Importando contatos...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="w-full" />
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
                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{result.total}</div>
                    <div className="text-sm text-muted-foreground">Total</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{result.inserted}</div>
                    <div className="text-sm text-muted-foreground">Importados</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{result.duplicates}</div>
                    <div className="text-sm text-muted-foreground">Duplicados</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{result.invalidPhones}</div>
                    <div className="text-sm text-muted-foreground">Inválidos</div>
                  </div>
                </div>

                {result.errors.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium text-destructive mb-2">Erros encontrados:</h4>
                    <div className="bg-destructive/10 p-3 rounded-lg">
                      {result.errors.slice(0, 5).map((error, index) => (
                        <p key={index} className="text-sm text-destructive">{error}</p>
                      ))}
                      {result.errors.length > 5 && (
                        <p className="text-sm text-muted-foreground">
                          ... e mais {result.errors.length - 5} erros
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
    </div>
  );
};