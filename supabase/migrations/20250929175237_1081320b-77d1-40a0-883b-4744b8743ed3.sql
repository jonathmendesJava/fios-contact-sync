-- Create meta_connections table
CREATE TABLE IF NOT EXISTS public.meta_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id TEXT NOT NULL,
  business_name TEXT,
  waba_id TEXT NOT NULL,
  waba_name TEXT,
  phone_number_id TEXT NOT NULL,
  phone_number TEXT,
  access_token TEXT NOT NULL,
  token_type TEXT DEFAULT 'long_lived',
  token_expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, waba_id, phone_number_id)
);

-- Create whatsapp_templates table
CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES public.meta_connections(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL,
  name TEXT NOT NULL,
  language TEXT NOT NULL,
  category TEXT,
  status TEXT,
  quality_score TEXT,
  rejected_reason TEXT,
  components JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  synced_at TIMESTAMPTZ,
  UNIQUE(user_id, template_id)
);

-- Create template_test_logs table
CREATE TABLE IF NOT EXISTS public.template_test_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.whatsapp_templates(id) ON DELETE SET NULL,
  phone_number TEXT NOT NULL,
  status TEXT NOT NULL,
  error_message TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.meta_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_test_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for meta_connections
CREATE POLICY "Users can view their own meta connections"
  ON public.meta_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own meta connections"
  ON public.meta_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own meta connections"
  ON public.meta_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own meta connections"
  ON public.meta_connections FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for whatsapp_templates
CREATE POLICY "Users can view their own templates"
  ON public.whatsapp_templates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own templates"
  ON public.whatsapp_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates"
  ON public.whatsapp_templates FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates"
  ON public.whatsapp_templates FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for template_test_logs
CREATE POLICY "Users can view their own test logs"
  ON public.template_test_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own test logs"
  ON public.template_test_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create trigger for updating updated_at on meta_connections
CREATE TRIGGER update_meta_connections_updated_at
  BEFORE UPDATE ON public.meta_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updating updated_at on whatsapp_templates
CREATE TRIGGER update_whatsapp_templates_updated_at
  BEFORE UPDATE ON public.whatsapp_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();