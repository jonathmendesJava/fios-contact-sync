import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Get user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const url = new URL(req.url);
    const path = url.pathname.replace('/meta-api/', '');
    const segments = path.split('/');
    const action = segments[0];

    console.log('Meta API request:', { action, segments, userId: user.id });

    // Get user's active connection
    const { data: connections } = await supabase
      .from('meta_connections')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);

    const connection = connections?.[0];
    if (!connection?.access_token) {
      return new Response(
        JSON.stringify({ error: 'No active Meta connection found. Please connect your account.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accessToken = connection.access_token;

    // Handle different API actions
    switch (action) {
      case 'businesses': {
        // GET /me/businesses
        const response = await fetch(
          `https://graph.facebook.com/v18.0/me/businesses?access_token=${accessToken}`
        );
        const data = await response.json();
        
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'wabas': {
        // GET /{business_id}/owned_whatsapp_business_accounts
        const businessId = segments[1];
        if (!businessId) {
          throw new Error('Business ID required');
        }

        const response = await fetch(
          `https://graph.facebook.com/v18.0/${businessId}/owned_whatsapp_business_accounts?access_token=${accessToken}`
        );
        const data = await response.json();
        
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'phone-numbers': {
        // GET /{waba_id}/phone_numbers
        const wabaId = segments[1];
        if (!wabaId) {
          throw new Error('WABA ID required');
        }

        const response = await fetch(
          `https://graph.facebook.com/v18.0/${wabaId}/phone_numbers?access_token=${accessToken}`
        );
        const data = await response.json();
        
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'templates': {
        const wabaId = segments[1];
        
        if (req.method === 'GET') {
          // GET /{waba_id}/message_templates
          if (!wabaId) {
            throw new Error('WABA ID required');
          }

          const response = await fetch(
            `https://graph.facebook.com/v18.0/${wabaId}/message_templates?limit=100&access_token=${accessToken}`
          );
          const data = await response.json();
          
          return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } else if (req.method === 'POST') {
          // POST /{waba_id}/message_templates
          if (!wabaId) {
            throw new Error('WABA ID required');
          }

          const body = await req.json();
          const response = await fetch(
            `https://graph.facebook.com/v18.0/${wabaId}/message_templates`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                ...body,
                access_token: accessToken,
              }),
            }
          );
          const data = await response.json();
          
          return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } else if (req.method === 'DELETE') {
          // DELETE /{waba_id}/{template_name}
          const templateName = segments[2];
          if (!wabaId || !templateName) {
            throw new Error('WABA ID and template name required');
          }

          const response = await fetch(
            `https://graph.facebook.com/v18.0/${wabaId}/message_templates?name=${templateName}&access_token=${accessToken}`,
            { method: 'DELETE' }
          );
          const data = await response.json();
          
          return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        // If we reach here, method not supported
        return new Response(
          JSON.stringify({ error: 'Method not supported for templates' }),
          { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'send-test': {
        // POST /{phone_number_id}/messages
        if (req.method !== 'POST') {
          throw new Error('Method not allowed');
        }

        const phoneNumberId = segments[1];
        if (!phoneNumberId) {
          throw new Error('Phone number ID required');
        }

        const body = await req.json();
        const { to, template_name, language, components } = body;

        if (!to || !template_name || !language) {
          throw new Error('Missing required fields: to, template_name, language');
        }

        const response = await fetch(
          `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: to,
              type: 'template',
              template: {
                name: template_name,
                language: {
                  code: language,
                },
                components: components || [],
              },
            }),
          }
        );

        const data = await response.json();
        
        // Log the test
        await supabase.from('template_test_logs').insert({
          user_id: user.id,
          phone_number: to,
          status: response.ok ? 'sent' : 'failed',
          error_message: response.ok ? null : JSON.stringify(data),
        });

        return new Response(JSON.stringify(data), {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'update-connection': {
        // POST to update connection with selected resources
        if (req.method !== 'POST') {
          throw new Error('Method not allowed');
        }

        const body = await req.json();
        const { business_id, business_name, waba_id, waba_name, phone_number_id, phone_number } = body;

        if (!business_id || !waba_id || !phone_number_id) {
          throw new Error('Missing required fields');
        }

        // Delete old pending connection
        await supabase
          .from('meta_connections')
          .delete()
          .eq('user_id', user.id)
          .eq('business_id', 'pending');

        // Create or update connection with actual details
        const { data: updatedConnection, error: updateError } = await supabase
          .from('meta_connections')
          .upsert({
            user_id: user.id,
            business_id,
            business_name,
            waba_id,
            waba_name,
            phone_number_id,
            phone_number,
            access_token: connection.access_token,
            token_type: connection.token_type,
            token_expires_at: connection.token_expires_at,
            is_active: true,
          }, {
            onConflict: 'user_id,waba_id,phone_number_id',
          })
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }

        return new Response(JSON.stringify(updatedConnection), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error) {
    console.error('Error in meta-api:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
