import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TokenRefreshResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting token refresh process...');

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Authentication failed:', userError);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated user:', user.id);

    const metaAppId = Deno.env.get('META_APP_ID');
    const metaAppSecret = Deno.env.get('META_APP_SECRET');

    if (!metaAppId || !metaAppSecret) {
      throw new Error('META_APP_ID or META_APP_SECRET not configured');
    }

    // Find user's tokens expiring in the next 7 days
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const { data: connections, error: fetchError } = await supabase
      .from('meta_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .lt('token_expires_at', sevenDaysFromNow.toISOString());

    if (fetchError) {
      throw fetchError;
    }

    console.log(`Found ${connections?.length || 0} connections to refresh`);

    const results = {
      total: connections?.length || 0,
      refreshed: 0,
      failed: 0,
      errors: [] as string[],
    };

    if (!connections || connections.length === 0) {
      return new Response(JSON.stringify(results), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Refresh each token
    for (const connection of connections) {
      try {
        console.log(`Refreshing token for connection ${connection.id}...`);

        // Exchange current token for new long-lived token
        const refreshUrl = `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${metaAppId}&client_secret=${metaAppSecret}&fb_exchange_token=${connection.access_token}`;
        
        const response = await fetch(refreshUrl);
        const data: TokenRefreshResponse = await response.json();

        if (!response.ok || !data.access_token) {
          throw new Error(`Failed to refresh token: ${JSON.stringify(data)}`);
        }

        const newExpiresAt = new Date(Date.now() + (data.expires_in * 1000));

        // Update connection with new token
        const { error: updateError } = await supabase
          .from('meta_connections')
          .update({
            access_token: data.access_token,
            token_expires_at: newExpiresAt.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', connection.id);

        if (updateError) {
          throw updateError;
        }

        console.log(`Successfully refreshed token for connection ${connection.id}`);
        results.refreshed++;

      } catch (error) {
        console.error(`Failed to refresh token for connection ${connection.id}:`, error);
        results.failed++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`Connection ${connection.id}: ${errorMessage}`);

        // If token is completely invalid, deactivate the connection
        if (errorMessage.includes('Invalid OAuth') || errorMessage.includes('expired')) {
          await supabase
            .from('meta_connections')
            .update({ is_active: false })
            .eq('id', connection.id);
          
          console.log(`Deactivated connection ${connection.id} due to invalid token`);
        }
      }
    }

    console.log('Token refresh completed:', results);

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in meta-token-refresh:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
