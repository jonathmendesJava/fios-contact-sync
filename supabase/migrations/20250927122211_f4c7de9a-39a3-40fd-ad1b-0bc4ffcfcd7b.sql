-- Tornar tenant_id opcional nas tabelas existentes
ALTER TABLE public.contact_groups 
ALTER COLUMN tenant_id SET DEFAULT gen_random_uuid();

ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT gen_random_uuid();

-- Remover constraint NOT NULL se existir
ALTER TABLE public.contact_groups 
ALTER COLUMN tenant_id DROP NOT NULL;

-- Atualizar registros existentes sem tenant_id
UPDATE public.contact_groups 
SET tenant_id = gen_random_uuid() 
WHERE tenant_id IS NULL;

UPDATE public.contacts 
SET tenant_id = gen_random_uuid() 
WHERE tenant_id IS NULL;