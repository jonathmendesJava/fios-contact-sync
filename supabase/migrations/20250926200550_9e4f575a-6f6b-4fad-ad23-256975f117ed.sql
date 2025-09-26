-- Drop existing problematic policies
DROP POLICY IF EXISTS "Owners and admins can manage tenant members" ON public.user_tenants;
DROP POLICY IF EXISTS "Owners and admins can view all members of their tenants" ON public.user_tenants;
DROP POLICY IF EXISTS "Users can view their tenant memberships" ON public.user_tenants;

-- Create security definer function to get user's role in a tenant
CREATE OR REPLACE FUNCTION public.get_user_tenant_role(_user_id uuid, _tenant_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_tenants
  WHERE user_id = _user_id AND tenant_id = _tenant_id
  LIMIT 1;
$$;

-- Create security definer function to check if user has specific role in tenant
CREATE OR REPLACE FUNCTION public.has_tenant_role(_user_id uuid, _tenant_id uuid, _required_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_tenants
    WHERE user_id = _user_id 
      AND tenant_id = _tenant_id 
      AND role = _required_role
  );
$$;

-- Create security definer function to check if user is owner or admin of tenant
CREATE OR REPLACE FUNCTION public.is_tenant_owner_or_admin(_user_id uuid, _tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_tenants
    WHERE user_id = _user_id 
      AND tenant_id = _tenant_id 
      AND role IN ('owner', 'admin')
  );
$$;

-- Create new RLS policies using security definer functions
CREATE POLICY "Users can view their own tenant memberships"
ON public.user_tenants
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Owners and admins can view tenant members"
ON public.user_tenants
FOR SELECT
USING (public.is_tenant_owner_or_admin(auth.uid(), tenant_id));

CREATE POLICY "Owners and admins can insert tenant members"
ON public.user_tenants
FOR INSERT
WITH CHECK (public.is_tenant_owner_or_admin(auth.uid(), tenant_id));

CREATE POLICY "Owners and admins can update tenant members"
ON public.user_tenants
FOR UPDATE
USING (public.is_tenant_owner_or_admin(auth.uid(), tenant_id));

CREATE POLICY "Owners and admins can delete tenant members"
ON public.user_tenants
FOR DELETE
USING (public.is_tenant_owner_or_admin(auth.uid(), tenant_id));

-- Create policy for super admins to bypass all restrictions
CREATE POLICY "Super admins can manage all user tenants"
ON public.user_tenants
FOR ALL
USING (
  EXISTS (
    SELECT 1 
    FROM public.super_admins 
    WHERE id = (current_setting('app.current_super_admin_id', true))::uuid
      AND is_active = true
  )
);

-- Update the tenants table policies to fix similar issues
DROP POLICY IF EXISTS "Users can view their tenants" ON public.tenants;
DROP POLICY IF EXISTS "Owners can update their tenants" ON public.tenants;

CREATE POLICY "Users can view their tenants"
ON public.tenants
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.user_tenants
    WHERE user_id = auth.uid() AND tenant_id = tenants.id
  )
);

CREATE POLICY "Owners can update their tenants"
ON public.tenants
FOR UPDATE
USING (public.has_tenant_role(auth.uid(), id, 'owner'));