import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OAuthResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

interface LongLivedTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state'); // user_id
    const error = url.searchParams.get('error');

    console.log('OAuth callback received:', { code: !!code, state, error });

    if (error) {
      console.error('OAuth error:', error);
      return new Response(
        JSON.stringify({ error: 'OAuth authorization failed', details: error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!code || !state) {
      return new Response(
        JSON.stringify({ error: 'Missing code or state parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const metaAppId = Deno.env.get('META_APP_ID');
    const metaAppSecret = Deno.env.get('META_APP_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!metaAppId || !metaAppSecret) {
      throw new Error('META_APP_ID or META_APP_SECRET not configured');
    }

    const redirectUri = `${url.origin}/functions/v1/meta-oauth-callback`;

    console.log('DEBUG - URL Origin:', url.origin);
    console.log('DEBUG - Redirect URI construído:', redirectUri);
    console.log('DEBUG - Meta App ID:', metaAppId);

    // Step 1: Exchange code for short-lived token
    console.log('Exchanging code for access token...');
    const tokenUrl = `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${metaAppId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${metaAppSecret}&code=${code}`;
    
    console.log('DEBUG - Token URL completa:', tokenUrl);
    console.log('DEBUG - Redirect URI encoded:', encodeURIComponent(redirectUri));
    
    const tokenResponse = await fetch(tokenUrl);
    const tokenData: OAuthResponse = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error('Failed to get access token:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        data: tokenData,
        redirectUriUsed: redirectUri,
        encodedRedirectUri: encodeURIComponent(redirectUri)
      });
      throw new Error('Failed to exchange code for token');
    }

    console.log('Short-lived token obtained');

    // Step 2: Convert to long-lived token (60 days)
    console.log('Converting to long-lived token...');
    const longLivedUrl = `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${metaAppId}&client_secret=${metaAppSecret}&fb_exchange_token=${tokenData.access_token}`;
    
    const longLivedResponse = await fetch(longLivedUrl);
    const longLivedData: LongLivedTokenResponse = await longLivedResponse.json();

    if (!longLivedResponse.ok || !longLivedData.access_token) {
      console.error('Failed to get long-lived token:', longLivedData);
      throw new Error('Failed to convert to long-lived token');
    }

    console.log('Long-lived token obtained, expires in:', longLivedData.expires_in, 'seconds');

    const accessToken = longLivedData.access_token;
    const expiresAt = new Date(Date.now() + (longLivedData.expires_in * 1000));

    // Step 3: Save initial connection (without business details yet)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create a temporary connection record
    const { error: insertError } = await supabase
      .from('meta_connections')
      .upsert({
        user_id: state,
        business_id: 'pending',
        waba_id: 'pending',
        phone_number_id: 'pending',
        access_token: accessToken,
        token_type: 'long_lived',
        token_expires_at: expiresAt.toISOString(),
        is_active: false, // Will be activated when user selects resources
      }, {
        onConflict: 'user_id,waba_id,phone_number_id'
      });

    if (insertError) {
      console.error('Failed to save connection:', insertError);
      throw new Error('Failed to save connection to database');
    }

    console.log('Connection saved successfully');

    // Redirect back to dashboard with success
    const redirectUrl = new URL('/dashboard', url.origin);
    redirectUrl.searchParams.set('tab', 'templates');
    redirectUrl.searchParams.set('oauth', 'success');
    
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': redirectUrl.toString(),
      },
    });

  } catch (error) {
    console.error('Error in meta-oauth-callback:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
