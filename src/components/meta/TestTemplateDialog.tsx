import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { MetaConnection } from '@/hooks/useMetaConnection';

interface TestTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: {
    id: string;
    name: string;
    language: string;
    components: any;
  };
  connection: MetaConnection;
}

export const TestTemplateDialog: React.FC<TestTemplateDialogProps> = ({
  open,
  onOpenChange,
  template,
  connection,
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [variables, setVariables] = useState<Record<string, string>>({});

  const variableCount = useMemo(() => {
    const bodyComponent = template.components?.find((c: any) => c.type === 'BODY');
    const text = bodyComponent?.text || '';
    const matches = text.match(/\{\{(\d+)\}\}/g);
    return matches ? matches.length : 0;
  }, [template]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const variableValues = Array.from({ length: variableCount }, (_, i) => 
        variables[`${i + 1}`] || ''
      );

      const response = await fetch(
        `https://kdwxmroxfbhmwxkyniph.supabase.co/functions/v1/meta-api/send-test/${connection.phone_number_id}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: phoneNumber,
            template_name: template.name,
            language: template.language,
            components: variableCount > 0 ? [{
              type: 'body',
              parameters: variableValues.map(v => ({
                type: 'text',
                text: v
              }))
            }] : [],
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send test');
      }

      toast({
        title: 'Mensagem enviada',
        description: 'Template de teste foi enviado com sucesso.',
      });

      onOpenChange(false);
      setPhoneNumber('');
      setVariables({});
    } catch (error: any) {
      console.error('Error sending test:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível enviar o teste.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Testar Template</DialogTitle>
          <DialogDescription>
            Envie uma mensagem de teste para validar o template: <strong>{template.name}</strong>
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Número de Telefone</Label>
            <Input
              id="phone"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+5511999999999"
              required
            />
            <p className="text-xs text-muted-foreground">
              Incluir código do país (ex: +55)
            </p>
          </div>

          {variableCount > 0 && (
            <div className="space-y-2">
              <Label>Variáveis do Template</Label>
              {Array.from({ length: variableCount }, (_, i) => (
                <div key={i} className="space-y-1">
                  <Label htmlFor={`var-${i + 1}`} className="text-sm text-muted-foreground">
                    Variável {i + 1}
                  </Label>
                  <Input
                    id={`var-${i + 1}`}
                    value={variables[`${i + 1}`] || ''}
                    onChange={(e) => setVariables({ ...variables, [`${i + 1}`]: e.target.value })}
                    placeholder={`Valor para {{${i + 1}}}`}
                    required
                  />
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar Teste'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
