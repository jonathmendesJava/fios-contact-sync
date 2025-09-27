-- Drop existing RLS policies for contact_groups that reference tenant functions
DROP POLICY IF EXISTS "Users can view groups in their tenants" ON public.contact_groups;
DROP POLICY IF EXISTS "Users can create groups in their tenants" ON public.contact_groups;
DROP POLICY IF EXISTS "Users can update groups in their tenants" ON public.contact_groups;
DROP POLICY IF EXISTS "Users can delete groups in their tenants" ON public.contact_groups;

-- Create new RLS policies for contact_groups based only on user_id
CREATE POLICY "Users can view their own groups" 
ON public.contact_groups 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own groups" 
ON public.contact_groups 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own groups" 
ON public.contact_groups 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own groups" 
ON public.contact_groups 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for contacts table based only on user_id
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own contacts" 
ON public.contacts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own contacts" 
ON public.contacts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contacts" 
ON public.contacts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contacts" 
ON public.contacts 
FOR DELETE 
USING (auth.uid() = user_id);