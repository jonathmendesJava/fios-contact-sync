-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============= contact_groups =============
CREATE TABLE public.contact_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

ALTER TABLE public.contact_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own groups" ON public.contact_groups
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own groups" ON public.contact_groups
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own groups" ON public.contact_groups
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own groups" ON public.contact_groups
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_contact_groups_updated
  BEFORE UPDATE ON public.contact_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============= contacts =============
CREATE TABLE public.contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  group_id UUID REFERENCES public.contact_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  signature INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_contacts_user_id ON public.contacts(user_id);
CREATE INDEX idx_contacts_group_id ON public.contacts(group_id);
CREATE INDEX idx_contacts_phone ON public.contacts(phone);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own contacts" ON public.contacts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own contacts" ON public.contacts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own contacts" ON public.contacts
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own contacts" ON public.contacts
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_contacts_updated
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============= meta_connections =============
CREATE TABLE public.meta_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  business_id TEXT NOT NULL,
  business_name TEXT,
  waba_id TEXT NOT NULL,
  waba_name TEXT,
  phone_number_id TEXT NOT NULL,
  phone_number TEXT,
  access_token TEXT NOT NULL,
  token_type TEXT,
  token_expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, waba_id, phone_number_id)
);

CREATE INDEX idx_meta_connections_user_id ON public.meta_connections(user_id);

ALTER TABLE public.meta_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own meta connections" ON public.meta_connections
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own meta connections" ON public.meta_connections
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own meta connections" ON public.meta_connections
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own meta connections" ON public.meta_connections
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_meta_connections_updated
  BEFORE UPDATE ON public.meta_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============= whatsapp_templates =============
CREATE TABLE public.whatsapp_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id UUID NOT NULL REFERENCES public.meta_connections(id) ON DELETE CASCADE,
  template_id TEXT,
  name TEXT NOT NULL,
  language TEXT NOT NULL,
  category TEXT,
  status TEXT,
  components JSONB,
  quality_score TEXT,
  rejected_reason TEXT,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_whatsapp_templates_connection_id ON public.whatsapp_templates(connection_id);
CREATE INDEX idx_whatsapp_templates_template_id ON public.whatsapp_templates(template_id);

ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own templates" ON public.whatsapp_templates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.meta_connections mc
      WHERE mc.id = whatsapp_templates.connection_id
        AND mc.user_id = auth.uid()
    )
  );
CREATE POLICY "Users insert own templates" ON public.whatsapp_templates
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meta_connections mc
      WHERE mc.id = whatsapp_templates.connection_id
        AND mc.user_id = auth.uid()
    )
  );
CREATE POLICY "Users update own templates" ON public.whatsapp_templates
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.meta_connections mc
      WHERE mc.id = whatsapp_templates.connection_id
        AND mc.user_id = auth.uid()
    )
  );
CREATE POLICY "Users delete own templates" ON public.whatsapp_templates
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.meta_connections mc
      WHERE mc.id = whatsapp_templates.connection_id
        AND mc.user_id = auth.uid()
    )
  );

CREATE TRIGGER trg_whatsapp_templates_updated
  BEFORE UPDATE ON public.whatsapp_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();