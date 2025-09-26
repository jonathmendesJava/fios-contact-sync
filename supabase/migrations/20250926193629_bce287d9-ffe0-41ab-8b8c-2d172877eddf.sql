-- Create tenants table
CREATE TABLE public.tenants (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS on tenants
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Create user_tenants junction table for many-to-many relationship
CREATE TABLE public.user_tenants (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, tenant_id)
);

-- Enable RLS on user_tenants
ALTER TABLE public.user_tenants ENABLE ROW LEVEL SECURITY;

-- Add tenant_id to existing tables
ALTER TABLE public.contact_groups ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.contacts ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Create security definer function to check tenant access
CREATE OR REPLACE FUNCTION public.has_tenant_access(_user_id UUID, _tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_tenants
    WHERE user_id = _user_id
      AND tenant_id = _tenant_id
  );
$$;

-- Create function to get user's current tenant
CREATE OR REPLACE FUNCTION public.get_user_tenant(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id
  FROM public.user_tenants
  WHERE user_id = _user_id
  ORDER BY created_at ASC
  LIMIT 1;
$$;

-- RLS Policies for tenants table
CREATE POLICY "Users can view their tenants" 
ON public.tenants 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_tenants 
    WHERE user_id = auth.uid() AND tenant_id = id
  )
);

CREATE POLICY "Owners can update their tenants" 
ON public.tenants 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_tenants 
    WHERE user_id = auth.uid() AND tenant_id = id AND role = 'owner'
  )
);

-- RLS Policies for user_tenants table
CREATE POLICY "Users can view their tenant memberships" 
ON public.user_tenants 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Owners and admins can view all members of their tenants" 
ON public.user_tenants 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_tenants ut 
    WHERE ut.user_id = auth.uid() 
      AND ut.tenant_id = user_tenants.tenant_id 
      AND ut.role IN ('owner', 'admin')
  )
);

CREATE POLICY "Owners and admins can manage tenant members" 
ON public.user_tenants 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_tenants ut 
    WHERE ut.user_id = auth.uid() 
      AND ut.tenant_id = user_tenants.tenant_id 
      AND ut.role IN ('owner', 'admin')
  )
);

-- Update RLS policies for contact_groups table
DROP POLICY IF EXISTS "Users can view their own groups" ON public.contact_groups;
DROP POLICY IF EXISTS "Users can create their own groups" ON public.contact_groups;
DROP POLICY IF EXISTS "Users can update their own groups" ON public.contact_groups;
DROP POLICY IF EXISTS "Users can delete their own groups" ON public.contact_groups;

CREATE POLICY "Users can view groups in their tenants" 
ON public.contact_groups 
FOR SELECT 
USING (public.has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "Users can create groups in their tenants" 
ON public.contact_groups 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND 
  public.has_tenant_access(auth.uid(), tenant_id)
);

CREATE POLICY "Users can update groups in their tenants" 
ON public.contact_groups 
FOR UPDATE 
USING (
  auth.uid() = user_id AND 
  public.has_tenant_access(auth.uid(), tenant_id)
);

CREATE POLICY "Users can delete groups in their tenants" 
ON public.contact_groups 
FOR DELETE 
USING (
  auth.uid() = user_id AND 
  public.has_tenant_access(auth.uid(), tenant_id)
);

-- Update RLS policies for contacts table
DROP POLICY IF EXISTS "Users can view their own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can create their own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can update their own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can delete their own contacts" ON public.contacts;

CREATE POLICY "Users can view contacts in their tenants" 
ON public.contacts 
FOR SELECT 
USING (public.has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "Users can create contacts in their tenants" 
ON public.contacts 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND 
  public.has_tenant_access(auth.uid(), tenant_id)
);

CREATE POLICY "Users can update contacts in their tenants" 
ON public.contacts 
FOR UPDATE 
USING (
  auth.uid() = user_id AND 
  public.has_tenant_access(auth.uid(), tenant_id)
);

CREATE POLICY "Users can delete contacts in their tenants" 
ON public.contacts 
FOR DELETE 
USING (
  auth.uid() = user_id AND 
  public.has_tenant_access(auth.uid(), tenant_id)
);

-- Add trigger for updated_at on tenants
CREATE TRIGGER update_tenants_updated_at
BEFORE UPDATE ON public.tenants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to automatically create a default tenant for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_tenant_id UUID;
BEGIN
  -- Create a default tenant for the new user
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
$$;

-- Create trigger to handle new user registration
CREATE TRIGGER on_auth_user_created_tenant
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_tenant();

-- Migrate existing data to default tenant
DO $$
DECLARE
  default_tenant_id UUID;
  user_record RECORD;
BEGIN
  -- Create a migration tenant if it doesn't exist
  INSERT INTO public.tenants (name, slug) 
  VALUES ('Tenant Migração', 'migration-tenant')
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO default_tenant_id;
  
  -- Get the tenant id if it already existed
  IF default_tenant_id IS NULL THEN
    SELECT id INTO default_tenant_id FROM public.tenants WHERE slug = 'migration-tenant';
  END IF;
  
  -- Update existing contact_groups and contacts with the default tenant
  UPDATE public.contact_groups SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.contacts SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
  
  -- Add all existing users to the migration tenant
  FOR user_record IN 
    SELECT DISTINCT user_id FROM public.contact_groups 
    UNION 
    SELECT DISTINCT user_id FROM public.contacts
  LOOP
    INSERT INTO public.user_tenants (user_id, tenant_id, role)
    VALUES (user_record.user_id, default_tenant_id, 'owner')
    ON CONFLICT (user_id, tenant_id) DO NOTHING;
  END LOOP;
END $$;

-- Make tenant_id required after migration
ALTER TABLE public.contact_groups ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.contacts ALTER COLUMN tenant_id SET NOT NULL;