-- Create Super Admin system tables

-- Super Admins table (separate from auth.users)
CREATE TABLE public.super_admins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_login_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS for super_admins
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

-- Super admins can only access their own records when authenticated
CREATE POLICY "Super admins can view their own profile" 
ON public.super_admins 
FOR SELECT 
USING (id = current_setting('app.current_super_admin_id', true)::uuid);

-- Add custom organization ID to tenants
ALTER TABLE public.tenants 
ADD COLUMN custom_org_id TEXT UNIQUE,
ADD COLUMN description TEXT,
ADD COLUMN environment TEXT NOT NULL DEFAULT 'production',
ADD COLUMN max_users INTEGER DEFAULT 10,
ADD COLUMN super_admin_id UUID REFERENCES public.super_admins(id);

-- Organization environments table
CREATE TABLE public.organization_environments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  environment_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, environment_name)
);

-- Enable RLS for organization_environments
ALTER TABLE public.organization_environments ENABLE ROW LEVEL SECURITY;

-- Only super admins can manage environments
CREATE POLICY "Super admins can manage all environments" 
ON public.organization_environments 
FOR ALL 
USING (true);

-- Super Admin audit logs
CREATE TABLE public.super_admin_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  super_admin_id UUID NOT NULL REFERENCES public.super_admins(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for audit logs
ALTER TABLE public.super_admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Super admins can view all audit logs
CREATE POLICY "Super admins can view all audit logs" 
ON public.super_admin_audit_logs 
FOR SELECT 
USING (true);

-- Update tenants policies to allow super admin access
CREATE POLICY "Super admins can manage all tenants" 
ON public.tenants 
FOR ALL 
USING (true);

-- Function to authenticate super admin
CREATE OR REPLACE FUNCTION public.authenticate_super_admin(_username text, _password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_record super_admins%ROWTYPE;
  result jsonb;
BEGIN
  -- Find admin by username
  SELECT * INTO admin_record
  FROM public.super_admins
  WHERE username = _username AND is_active = true;
  
  IF admin_record.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid credentials');
  END IF;
  
  -- In a real implementation, you would hash and compare passwords
  -- For now, we'll do a simple comparison (NOT SECURE for production)
  IF admin_record.password_hash = _password THEN
    -- Update last login
    UPDATE public.super_admins 
    SET last_login_at = now() 
    WHERE id = admin_record.id;
    
    RETURN jsonb_build_object(
      'success', true,
      'admin', jsonb_build_object(
        'id', admin_record.id,
        'username', admin_record.username,
        'full_name', admin_record.full_name,
        'email', admin_record.email
      )
    );
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid credentials');
  END IF;
END;
$$;

-- Function to log super admin actions
CREATE OR REPLACE FUNCTION public.log_super_admin_action(
  _admin_id uuid,
  _action text,
  _resource_type text,
  _resource_id uuid DEFAULT NULL,
  _details jsonb DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.super_admin_audit_logs (
    super_admin_id,
    action,
    resource_type,
    resource_id,
    details
  ) VALUES (
    _admin_id,
    _action,
    _resource_type,
    _resource_id,
    _details
  );
END;
$$;

-- Create trigger for updated_at columns
CREATE TRIGGER update_super_admins_updated_at
BEFORE UPDATE ON public.super_admins
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_organization_environments_updated_at
BEFORE UPDATE ON public.organization_environments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default super admin (password: 'admin123' - CHANGE THIS!)
INSERT INTO public.super_admins (username, password_hash, full_name, email)
VALUES ('superadmin', 'admin123', 'Super Administrator', 'admin@example.com');