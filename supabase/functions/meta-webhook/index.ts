import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Handle verification challenge from Meta
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    const verifyToken = Deno.env.get('META_VERIFY_TOKEN') || 'my_verify_token';

    if (mode === 'subscribe' && token === verifyToken) {
      console.log('Webhook verified successfully');
      return new Response(challenge, { status: 200 });
    } else {
      console.error('Webhook verification failed');
      return new Response('Forbidden', { status: 403 });
    }
  }

  // Handle webhook events
  try {
    const signature = req.headers.get('x-hub-signature-256');
    const bodyText = await req.text();

    // Verify signature
    const metaAppSecret = Deno.env.get('META_APP_SECRET');
    if (metaAppSecret && signature) {
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(metaAppSecret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      
      const signatureBuffer = await crypto.subtle.sign(
        'HMAC',
        key,
        encoder.encode(bodyText)
      );
      
      const expectedSignature = 'sha256=' + Array.from(new Uint8Array(signatureBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      if (signature !== expectedSignature) {
        console.error('Invalid webhook signature');
        return new Response('Forbidden', { status: 403 });
      }
    }

    const body = JSON.parse(bodyText);
    console.log('Webhook received:', JSON.stringify(body, null, 2));

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Process webhook entries
    if (body.entry && Array.isArray(body.entry)) {
      for (const entry of body.entry) {
        if (entry.changes && Array.isArray(entry.changes)) {
          for (const change of entry.changes) {
            if (change.field === 'message_template_status_update') {
              const value = change.value;
              const templateId = value.message_template_id;
              const status = value.event; // APPROVED, REJECTED, DISABLED, etc.
              
              console.log('Template status update:', { templateId, status });

              // Update template in database
              const updateData: any = {
                status: status,
                synced_at: new Date().toISOString(),
              };

              if (value.reason) {
                updateData.rejected_reason = value.reason;
              }

              if (value.quality_score) {
                updateData.quality_score = value.quality_score.score;
              }

              const { error } = await supabase
                .from('whatsapp_templates')
                .update(updateData)
                .eq('template_id', templateId);

              if (error) {
                console.error('Failed to update template:', error);
              } else {
                console.log('Template updated successfully:', templateId);
              }
            }
          }
        }
      }
    }

    // Always return 200 OK to Meta
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    // Still return 200 to prevent Meta from retrying
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
