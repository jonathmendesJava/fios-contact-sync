import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get all users from auth.users table using service role
    const { data: authUsers, error: authError } = await supabaseClient.auth.admin.listUsers()

    if (authError) {
      console.error('Error fetching auth users:', authError)
      throw authError
    }

    // Get tenant relationships for users
    const userIds = authUsers.users.map(user => user.id)
    
    let userTenants: any[] = []
    if (userIds.length > 0) {
      const { data: tenantData, error: tenantError } = await supabaseClient
        .from('user_tenants')
        .select(`
          user_id,
          role,
          created_at,
          tenants (
            id,
            name,
            is_active
          )
        `)
        .in('user_id', userIds)

      if (tenantError) {
        console.error('Error fetching user tenants:', tenantError)
        throw tenantError
      }
      
      userTenants = tenantData || []
    }

    // Combine auth users with tenant data
    const enrichedUsers = authUsers.users.map(user => {
      const tenantData = userTenants.find(ut => ut.user_id === user.id)
      const tenant = Array.isArray(tenantData?.tenants) ? tenantData.tenants[0] : tenantData?.tenants
      
      return {
        id: user.id,
        email: user.email || 'No email',
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        email_confirmed_at: user.email_confirmed_at,
        tenant_name: tenant?.name || 'Sem organização',
        tenant_id: tenant?.id || null,
        tenant_active: tenant?.is_active || false,
        role: tenantData?.role || 'member',
        user_metadata: user.user_metadata,
        app_metadata: user.app_metadata
      }
    })

    console.log(`Successfully fetched ${enrichedUsers.length} users`)

    return new Response(
      JSON.stringify({ 
        users: enrichedUsers,
        total: enrichedUsers.length 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error: any) {
    console.error('Error in get-auth-users function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error?.message || 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})