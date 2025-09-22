import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MakeBundle {
  contact: {
    id: string;
    name: string;
    phone: string;
    email?: string;
    signature?: string;
  };
  group: {
    id: string;
    name: string;
  };
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

    console.log('Iniciando envio para Make.com...');

    // Enviar para Make.com (servidor para servidor - sem CORS)
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(contacts), // Enviar diretamente o array
    });

    const responseText = await response.text();
    console.log('Resposta do Make.com - Status:', response.status);
    console.log('Resposta do Make.com - Headers:', Object.fromEntries(response.headers.entries()));
    console.log('Resposta do Make.com - Body:', responseText);

    if (response.ok) {
      console.log('✅ Envio bem-sucedido para Make.com');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `${contacts.length} contatos enviados com sucesso`,
          makeResponse: responseText
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    } else {
      console.error('❌ Erro na resposta do Make.com:', response.status, responseText);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Make.com retornou erro ${response.status}: ${responseText}`,
          makeStatus: response.status,
          makeResponse: responseText
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