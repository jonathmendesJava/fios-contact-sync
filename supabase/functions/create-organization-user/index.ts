import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateUserRequest {
  email: string;
  password: string;
  organizationIds: string[];
  role: 'owner' | 'admin' | 'member';
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { email, password, organizationIds, role }: CreateUserRequest = await req.json();

    console.log('Creating user for email:', email);
    console.log('Organizations:', organizationIds);
    console.log('Role:', role);

    // Validate input
    if (!email || !password || !organizationIds || organizationIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Email, password, and at least one organization are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 8 characters long' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate organizations exist
    const { data: orgValidation, error: orgError } = await supabaseClient
      .from('tenants')
      .select('id, name')
      .in('id', organizationIds)
      .eq('is_active', true);

    if (orgError) {
      console.error('Error validating organizations:', orgError);
      throw orgError;
    }

    if (!orgValidation || orgValidation.length !== organizationIds.length) {
      return new Response(
        JSON.stringify({ error: 'One or more organizations not found or inactive' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if user already exists
    const { data: existingUser } = await supabaseClient.auth.admin.listUsers();
    const userExists = existingUser.users.find(user => user.email === email);

    let userId: string;

    if (userExists) {
      userId = userExists.id;
      console.log('User already exists, using existing user:', userId);
    } else {
      // Create user via Supabase Auth Admin API
      const { data: newUser, error: createUserError } = await supabaseClient.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          created_by: 'super_admin',
          created_at: new Date().toISOString()
        }
      });

      if (createUserError) {
        console.error('Error creating user:', createUserError);
        throw createUserError;
      }

      if (!newUser.user) {
        throw new Error('User creation failed - no user returned');
      }

      userId = newUser.user.id;
      console.log('Created new user with ID:', userId);
    }

    // Add user to organizations
    const userTenantInserts = organizationIds.map(orgId => ({
      user_id: userId,
      tenant_id: orgId,
      role: role
    }));

    const { error: insertError } = await supabaseClient
      .from('user_tenants')
      .insert(userTenantInserts);

    if (insertError) {
      console.error('Error adding user to organizations:', insertError);
      
      // If user creation succeeded but organization assignment failed,
      // we should log this but not necessarily fail the whole operation
      if (userExists) {
        throw insertError;
      } else {
        // For new users, we might want to delete the created user
        // but for now, we'll just log the error
        console.error('User created but organization assignment failed');
        throw insertError;
      }
    }

    console.log(`Successfully ${userExists ? 'updated' : 'created'} user and added to ${organizationIds.length} organizations`);

    return new Response(
      JSON.stringify({ 
        success: true,
        userId: userId,
        userExists: !!userExists,
        organizationsAdded: organizationIds.length
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Error in create-organization-user function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);