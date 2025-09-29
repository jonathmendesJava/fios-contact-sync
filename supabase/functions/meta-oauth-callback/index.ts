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

interface MetaBusiness {
  id: string;
  name: string;
}

interface MetaWABA {
  id: string;
  name: string;
}

interface MetaPhoneNumber {
  id: string;
  display_phone_number: string;
  verified_name: string;
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

    const redirectUri = `https://kdwxmroxfbhmwxkyniph.supabase.co/functions/v1/meta-oauth-callback`;

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

    // Step 3: Fetch Meta resources automatically
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Step 3: Fetching user businesses from Meta...');
    const businessesResponse = await fetch(
      `https://graph.facebook.com/v21.0/me/businesses?access_token=${accessToken}`
    );
    const businessesData = await businessesResponse.json();

    if (!businessesResponse.ok || !businessesData.data || businessesData.data.length === 0) {
      console.error('No businesses found:', businessesData);
      throw new Error('No Meta businesses found for this account. Please ensure your Meta Business account is properly configured.');
    }

    const firstBusiness: MetaBusiness = businessesData.data[0];
    console.log('Found business:', firstBusiness.id, firstBusiness.name);

    // Step 3B: Fetch WABAs for the business
    console.log('Fetching WhatsApp Business Accounts...');
    const wabasResponse = await fetch(
      `https://graph.facebook.com/v21.0/${firstBusiness.id}/owned_whatsapp_business_accounts?access_token=${accessToken}`
    );
    const wabasData = await wabasResponse.json();

    if (!wabasResponse.ok || !wabasData.data || wabasData.data.length === 0) {
      console.error('No WABAs found:', wabasData);
      throw new Error('No WhatsApp Business Accounts found. Please connect a WhatsApp Business Account to your Meta Business.');
    }

    const firstWaba: MetaWABA = wabasData.data[0];
    console.log('Found WABA:', firstWaba.id, firstWaba.name);

    // Step 3C: Fetch phone numbers for the WABA
    console.log('Fetching phone numbers...');
    const phonesResponse = await fetch(
      `https://graph.facebook.com/v21.0/${firstWaba.id}/phone_numbers?access_token=${accessToken}`
    );
    const phonesData = await phonesResponse.json();

    if (!phonesResponse.ok || !phonesData.data || phonesData.data.length === 0) {
      console.error('No phone numbers found:', phonesData);
      throw new Error('No phone numbers found for this WhatsApp Business Account. Please add a phone number in Meta Business Manager.');
    }

    const firstPhone: MetaPhoneNumber = phonesData.data[0];
    console.log('Found phone number:', firstPhone.id, firstPhone.display_phone_number);

    // Step 3D: Save connection with real IDs and activate it
    console.log('Saving connection to database...');
    const { error: insertError } = await supabase
      .from('meta_connections')
      .upsert({
        user_id: state,
        business_id: firstBusiness.id,
        business_name: firstBusiness.name,
        waba_id: firstWaba.id,
        waba_name: firstWaba.name || 'WhatsApp Business Account',
        phone_number_id: firstPhone.id,
        phone_number: firstPhone.display_phone_number,
        access_token: accessToken,
        token_type: 'long_lived',
        token_expires_at: expiresAt.toISOString(),
        is_active: true,
      }, {
        onConflict: 'user_id,waba_id,phone_number_id'
      });

    if (insertError) {
      console.error('Failed to save connection:', insertError);
      throw new Error('Failed to save connection to database');
    }

    console.log('✅ Connection saved successfully and activated!');
    console.log('Connection details:', {
      business: firstBusiness.name,
      waba: firstWaba.name,
      phone: firstPhone.display_phone_number
    });

    // Redirect back to dashboard with success
    const redirectUrl = new URL('/dashboard', 'https://notify.fios.com.br');
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
