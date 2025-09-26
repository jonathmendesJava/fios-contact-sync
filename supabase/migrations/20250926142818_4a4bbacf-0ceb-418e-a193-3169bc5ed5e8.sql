-- Alterar campo signature de text para integer
-- Primeiro, criar uma nova coluna temporária
ALTER TABLE public.contacts ADD COLUMN signature_new integer DEFAULT 1;

-- Migrar dados existentes: se signature tinha texto, converte para 1, se null também 1
UPDATE public.contacts 
SET signature_new = CASE 
  WHEN signature IS NOT NULL AND signature != '' THEN 1
  ELSE 1
END;

-- Remover a coluna antiga
ALTER TABLE public.contacts DROP COLUMN signature;

-- Renomear a nova coluna
ALTER TABLE public.contacts RENAME COLUMN signature_new TO signature;

-- Adicionar constraint para aceitar apenas 0 ou 1
ALTER TABLE public.contacts ADD CONSTRAINT check_signature_valid CHECK (signature IN (0, 1));

-- Definir NOT NULL e default
ALTER TABLE public.contacts ALTER COLUMN signature SET NOT NULL;
ALTER TABLE public.contacts ALTER COLUMN signature SET DEFAULT 1;