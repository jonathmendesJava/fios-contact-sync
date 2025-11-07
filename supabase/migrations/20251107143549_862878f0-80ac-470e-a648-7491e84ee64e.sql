
-- Remove tenant_id columns from tables (not being used, no foreign key)
ALTER TABLE public.contacts DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE public.contact_groups DROP COLUMN IF EXISTS tenant_id;
