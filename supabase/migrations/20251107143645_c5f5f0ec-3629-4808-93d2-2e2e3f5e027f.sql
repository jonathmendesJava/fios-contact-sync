
-- Remove multi-tenancy system that's not being used

-- Drop trigger
DROP TRIGGER IF EXISTS on_auth_user_created_tenant ON auth.users;

-- Drop functions
DROP FUNCTION IF EXISTS public.handle_new_user_tenant();
DROP FUNCTION IF EXISTS public.has_tenant_access(uuid, uuid);
DROP FUNCTION IF EXISTS public.get_user_tenant(uuid);
DROP FUNCTION IF EXISTS public.get_user_tenant_role(uuid, uuid);
DROP FUNCTION IF EXISTS public.has_tenant_role(uuid, uuid, text);
DROP FUNCTION IF EXISTS public.is_tenant_owner_or_admin(uuid, uuid);
DROP FUNCTION IF EXISTS public.set_config(text, text, boolean);
DROP FUNCTION IF EXISTS public.authenticate_super_admin(text, text);
DROP FUNCTION IF EXISTS public.log_super_admin_action(uuid, text, text, uuid, jsonb);

-- Drop tables if they exist
DROP TABLE IF EXISTS public.user_tenants CASCADE;
DROP TABLE IF EXISTS public.tenants CASCADE;
DROP TABLE IF EXISTS public.super_admins CASCADE;
DROP TABLE IF EXISTS public.super_admin_audit_logs CASCADE;
