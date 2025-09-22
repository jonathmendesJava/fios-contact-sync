import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CONCURRENCY = 5;           // Processar 5 contatos por batch
const INTERVAL_MS = 60;          // 60ms entre envios para rate limiting

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

async function sendSingleContact(webhookUrl: string, contact: ContactPayload): Promise<void> {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(contact),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Make.com retornou erro ${response.status}: ${errorText}`);
  }

  console.log(`✅ Contato ${contact.name} (${contact.contact_id}) enviado com sucesso`);
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

    console.log('=== INICIANDO FAN-OUT PARA MAKE.COM ===');
    console.log(`📦 Total de contatos para enviar: ${contacts.length}`);
    console.log(`⚡ Processamento em batches de ${CONCURRENCY} contatos`);
    console.log(`⏱️ Intervalo entre envios: ${INTERVAL_MS}ms`);

    let totalSent = 0;
    let totalFailed = 0;
    const errors: string[] = [];

    // Processar contatos em batches com rate limiting
    for (let i = 0; i < contacts.length; i += CONCURRENCY) {
      const batch = contacts.slice(i, i + CONCURRENCY);
      const batchNumber = Math.floor(i / CONCURRENCY) + 1;
      const totalBatches = Math.ceil(contacts.length / CONCURRENCY);
      
      console.log(`🔄 Processando batch ${batchNumber}/${totalBatches} (${batch.length} contatos)`);

      // Enviar batch com Promise.allSettled para não falhar tudo se 1 der erro
      const results = await Promise.allSettled(
        batch.map(async (contact, idx) => {
          // Rate limiting: delay entre envios dentro do batch
          if (idx > 0) {
            await new Promise(resolve => setTimeout(resolve, idx * INTERVAL_MS));
          }
          
          console.log(`📤 Enviando ${contact.name} (${totalSent + idx + 1}/${contacts.length})`);
          await sendSingleContact(webhookUrl, contact);
          return contact.name;
        })
      );

      // Processar resultados do batch
      results.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          totalSent++;
          console.log(`✅ ${result.value} enviado com sucesso`);
        } else {
          totalFailed++;
          const contactName = batch[idx].name;
          const errorMsg = `❌ Erro ao enviar ${contactName}: ${result.reason.message}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      });

      console.log(`📊 Batch ${batchNumber} concluído. Sucessos: ${results.filter(r => r.status === 'fulfilled').length}, Falhas: ${results.filter(r => r.status === 'rejected').length}`);
      
      // Pequena pausa entre batches para não sobrecarregar
      if (i + CONCURRENCY < contacts.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log('=== FAN-OUT CONCLUÍDO ===');
    console.log(`📈 Estatísticas finais:`);
    console.log(`   ✅ Enviados com sucesso: ${totalSent}`);
    console.log(`   ❌ Falhas: ${totalFailed}`);
    console.log(`   📊 Total processado: ${totalSent + totalFailed}`);

    const isPartialSuccess = totalSent > 0 && totalFailed > 0;
    const isCompleteSuccess = totalSent === contacts.length && totalFailed === 0;

    return new Response(
      JSON.stringify({ 
        success: isCompleteSuccess,
        partial_success: isPartialSuccess,
        message: isCompleteSuccess 
          ? `Todos os ${totalSent} contatos foram enviados com sucesso` 
          : isPartialSuccess
          ? `${totalSent} contatos enviados, ${totalFailed} falharam`
          : `Falha no envio. ${totalFailed} erros encontrados`,
        stats: {
          total: contacts.length,
          sent: totalSent,
          failed: totalFailed,
          success_rate: Math.round((totalSent / contacts.length) * 100)
        },
        errors: totalFailed > 0 ? errors.slice(0, 5) : [] // Limitar erros no response
      }),
      { 
        status: isCompleteSuccess ? 200 : (isPartialSuccess ? 207 : 500),
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

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