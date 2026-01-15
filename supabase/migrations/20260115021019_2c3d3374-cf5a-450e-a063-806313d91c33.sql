-- =====================================================
-- FASE 1: SEGURANÇA E PERFORMANCE
-- =====================================================

-- 1. Criar tabela de audit logs para rastreabilidade completa
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES public.agencies(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  user_email text,
  action text NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
  table_name text NOT NULL,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only super admins can view all audit logs
CREATE POLICY "Super admins can view all audit logs"
  ON public.audit_logs FOR SELECT
  USING (is_super_admin(auth.uid()));

-- Agency admins can view their agency's audit logs
CREATE POLICY "Agency admins can view agency audit logs"
  ON public.audit_logs FOR SELECT
  USING (
    agency_id = get_user_agency_id(auth.uid()) 
    AND has_agency_role(auth.uid(), agency_id, 'admin')
  );

-- System can insert audit logs (via trigger)
CREATE POLICY "System can insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (true);

-- 2. Adicionar coluna created_by em tabelas que precisam de rastreamento
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);
ALTER TABLE public.live_schedules ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- 3. Criar índices de performance
CREATE INDEX IF NOT EXISTS idx_live_schedules_agency_date 
  ON public.live_schedules(agency_id, schedule_date);
  
CREATE INDEX IF NOT EXISTS idx_monthly_projections_agency_month 
  ON public.monthly_projections(agency_id, month_key);
  
CREATE INDEX IF NOT EXISTS idx_notes_agency_date 
  ON public.notes(agency_id, note_date);
  
CREATE INDEX IF NOT EXISTS idx_audit_logs_agency_created 
  ON public.audit_logs(agency_id, created_at DESC);
  
CREATE INDEX IF NOT EXISTS idx_profiles_agency_id 
  ON public.profiles(agency_id);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id 
  ON public.user_roles(user_id);

-- =====================================================
-- FASE 2: MULTI-TENANCY ESCALÁVEL
-- =====================================================

-- 1. Criar tabela agency_settings para branding e configurações
CREATE TABLE public.agency_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE UNIQUE NOT NULL,
  
  -- Branding
  branding jsonb DEFAULT '{
    "primaryColor": "0 84% 60%",
    "primaryForeground": "0 0% 100%",
    "accentColor": "0 100% 97%",
    "accentForeground": "0 84% 50%",
    "logoUrl": null,
    "faviconUrl": null,
    "companyName": null,
    "companyTagline": null
  }'::jsonb,
  
  -- Features habilitadas
  features jsonb DEFAULT '{
    "battles": true,
    "creatorsAnalysis": true,
    "scheduling": true,
    "charts": true,
    "notes": true,
    "reports": true
  }'::jsonb,
  
  -- Limites do plano
  limits jsonb DEFAULT '{
    "maxUsers": 10,
    "maxCreators": 100,
    "maxLivesPerMonth": 500,
    "storageGb": 5
  }'::jsonb,
  
  -- Custom domain
  custom_domain text,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on agency_settings
ALTER TABLE public.agency_settings ENABLE ROW LEVEL SECURITY;

-- Users can view their own agency settings
CREATE POLICY "Users can view their agency settings"
  ON public.agency_settings FOR SELECT
  USING (
    agency_id = get_user_agency_id(auth.uid()) 
    OR is_super_admin(auth.uid())
  );

-- Only agency admins can update settings
CREATE POLICY "Agency admins can update settings"
  ON public.agency_settings FOR UPDATE
  USING (
    (agency_id = get_user_agency_id(auth.uid()) 
      AND has_agency_role(auth.uid(), agency_id, 'admin'))
    OR is_super_admin(auth.uid())
  );

-- Super admins can insert settings
CREATE POLICY "Super admins can insert settings"
  ON public.agency_settings FOR INSERT
  WITH CHECK (is_super_admin(auth.uid()));

-- Super admins can delete settings
CREATE POLICY "Super admins can delete settings"
  ON public.agency_settings FOR DELETE
  USING (is_super_admin(auth.uid()));

-- 2. Criar trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_agency_settings_updated_at
  BEFORE UPDATE ON public.agency_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Criar trigger para criar agency_settings automaticamente ao criar agência
CREATE OR REPLACE FUNCTION public.create_agency_settings_on_agency_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.agency_settings (agency_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public SECURITY DEFINER;

CREATE TRIGGER create_agency_settings_trigger
  AFTER INSERT ON public.agencies
  FOR EACH ROW
  EXECUTE FUNCTION public.create_agency_settings_on_agency_insert();

-- 4. Criar settings para agências existentes
INSERT INTO public.agency_settings (agency_id)
SELECT id FROM public.agencies
WHERE NOT EXISTS (
  SELECT 1 FROM public.agency_settings WHERE agency_settings.agency_id = agencies.id
);

-- 5. Função para registrar audit log
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_action text,
  p_table_name text,
  p_record_id uuid,
  p_old_data jsonb DEFAULT NULL,
  p_new_data jsonb DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_user_id uuid;
  v_user_email text;
  v_agency_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  -- Get user email
  SELECT email INTO v_user_email 
  FROM public.profiles 
  WHERE user_id = v_user_id;
  
  -- Get agency id
  v_agency_id := get_user_agency_id(v_user_id);
  
  INSERT INTO public.audit_logs (
    user_id, user_email, agency_id, 
    action, table_name, record_id, 
    old_data, new_data
  ) VALUES (
    v_user_id, v_user_email, v_agency_id,
    p_action, p_table_name, p_record_id,
    p_old_data, p_new_data
  );
END;
$$ LANGUAGE plpgsql SET search_path = public SECURITY DEFINER;

-- 6. Habilitar realtime para agency_settings
ALTER PUBLICATION supabase_realtime ADD TABLE public.agency_settings;