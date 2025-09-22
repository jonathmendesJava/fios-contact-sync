import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ContactPayload {
  contact_id: string;
  name: string;
  email?: string;
  phone: string;
  signature?: string;
  group_id: string;
  group_name: string;
  total_contacts: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== Edge Function send-to-make iniciada ===');
    
    const { webhookUrl, contacts } = await req.json();
    
    console.log('Webhook URL:', webhookUrl);
    console.log('Número de contatos:', contacts?.length);
    console.log('Payload que será enviado:', JSON.stringify(contacts, null, 2));

    if (!webhookUrl || !contacts || !Array.isArray(contacts)) {
      console.error('Dados inválidos recebidos:', { webhookUrl, contacts });
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'webhookUrl e contacts (array) são obrigatórios' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validar se é URL do Make.com
    if (!webhookUrl.includes('hook.us1.make.com') && !webhookUrl.includes('hook.eu1.make.com')) {
      console.error('URL não é do Make.com:', webhookUrl);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'URL deve ser um webhook do Make.com' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('=== ENVIANDO ARRAY COMPLETO PARA MAKE.COM ===');
    console.log(`📦 Total de contatos no array: ${contacts.length}`);
    console.log(`📤 Enviando array completo em 1 única requisição`);

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contacts),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Make.com retornou erro ${response.status}: ${errorText}`);
      }

      console.log('✅ Array completo enviado com sucesso para Make.com');
      console.log('📋 Para processar cada contato individualmente, configure um Iterator no Make.com');
      console.log('📈 Estatísticas:');
      console.log(`   📊 Total de contatos enviados: ${contacts.length}`);
      console.log(`   🎯 Formato: Array completo em 1 requisição`);

      return new Response(
        JSON.stringify({ 
          success: true,
          message: `Array com ${contacts.length} contatos enviado com sucesso`,
          stats: {
            total: contacts.length,
            format: 'complete_array',
            requests_sent: 1
          },
          note: 'Configure um Iterator no Make.com para processar cada contato como bundle individual'
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );

    } catch (error) {
      console.error('❌ Erro ao enviar array para Make.com:', error);
      return new Response(
        JSON.stringify({ 
          success: false,
          message: `Erro ao enviar array: ${error.message}`,
          stats: {
            total: contacts.length,
            sent: 0,
            failed: contacts.length
          }
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

  } catch (error) {
    console.error('❌ Erro na Edge Function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Erro interno: ${error.message}` 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});