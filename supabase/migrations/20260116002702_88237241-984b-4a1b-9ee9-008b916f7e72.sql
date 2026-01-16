-- Criar tabela de membros da equipe (executivos e associados) por agência
CREATE TABLE IF NOT EXISTS public.agency_team_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'associate',
  executive_id uuid REFERENCES public.agency_team_members(id) ON DELETE SET NULL,
  email text,
  phone text,
  avatar_url text,
  tiktok_username text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.agency_team_members ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para membros da equipe
CREATE POLICY "Users can view team members of their agency"
ON public.agency_team_members FOR SELECT
USING (agency_id = get_user_agency_id(auth.uid()) OR is_super_admin(auth.uid()));

CREATE POLICY "Agency admins can insert team members"
ON public.agency_team_members FOR INSERT
WITH CHECK (
  (agency_id = get_user_agency_id(auth.uid()) AND has_agency_role(auth.uid(), agency_id, 'admin'::app_role))
  OR is_super_admin(auth.uid())
);

CREATE POLICY "Agency admins can update team members"
ON public.agency_team_members FOR UPDATE
USING (
  (agency_id = get_user_agency_id(auth.uid()) AND has_agency_role(auth.uid(), agency_id, 'admin'::app_role))
  OR is_super_admin(auth.uid())
);

CREATE POLICY "Agency admins can delete team members"
ON public.agency_team_members FOR DELETE
USING (
  (agency_id = get_user_agency_id(auth.uid()) AND has_agency_role(auth.uid(), agency_id, 'admin'::app_role))
  OR is_super_admin(auth.uid())
);

-- Trigger para updated_at
CREATE TRIGGER update_agency_team_members_updated_at
BEFORE UPDATE ON public.agency_team_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();