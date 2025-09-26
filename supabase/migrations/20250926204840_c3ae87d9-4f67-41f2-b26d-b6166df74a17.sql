-- Step 1: Modify the trigger function to NOT create automatic tenant when user is created by super admin
CREATE OR REPLACE FUNCTION public.handle_new_user_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_tenant_id UUID;
BEGIN
  -- Skip automatic tenant creation if user was created by super admin
  IF NEW.raw_user_meta_data->>'created_by' = 'super_admin' THEN
    RETURN NEW;
  END IF;
  
  -- Create a default tenant for regular users only
  INSERT INTO public.tenants (name, slug) 
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Minha Empresa'),
    'tenant-' || substring(NEW.id::text from 1 for 8)
  )
  RETURNING id INTO new_tenant_id;
  
  -- Add user as owner of the tenant
  INSERT INTO public.user_tenants (user_id, tenant_id, role)
  VALUES (NEW.id, new_tenant_id, 'owner');
  
  RETURN NEW;
END;
$function$;

-- Step 2: Clean up incorrectly created "Minha Empresa" organizations and their associations
-- First, find users that were created by super admin but got automatic organizations
WITH super_admin_users AS (
  SELECT ut.user_id, ut.tenant_id, t.name, t.slug
  FROM user_tenants ut
  JOIN tenants t ON ut.tenant_id = t.id
  WHERE t.name = 'Minha Empresa' 
  AND t.slug LIKE 'tenant-%'
  AND ut.role = 'owner'
),
-- Check if these users have proper tenant assignments
users_with_proper_tenants AS (
  SELECT DISTINCT sau.user_id
  FROM super_admin_users sau
  JOIN user_tenants ut2 ON sau.user_id = ut2.user_id
  JOIN tenants t2 ON ut2.tenant_id = t2.id
  WHERE t2.name != 'Minha Empresa'
)
-- Delete incorrect tenant associations for users that have proper assignments
DELETE FROM user_tenants 
WHERE (user_id, tenant_id) IN (
  SELECT sau.user_id, sau.tenant_id
  FROM super_admin_users sau
  JOIN users_with_proper_tenants uwpt ON sau.user_id = uwpt.user_id
);

-- Step 3: Delete empty "Minha Empresa" tenants that have no users
DELETE FROM tenants 
WHERE name = 'Minha Empresa' 
AND slug LIKE 'tenant-%'
AND id NOT IN (
  SELECT DISTINCT tenant_id 
  FROM user_tenants 
  WHERE tenant_id IS NOT NULL
);