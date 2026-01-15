-- Corrigir a política de INSERT para audit_logs
-- Remover a política atual que usa WITH CHECK (true)
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;

-- Criar nova política mais restritiva para INSERT
-- Apenas usuários autenticados podem inserir logs para si mesmos
CREATE POLICY "Authenticated users can insert their own audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND user_id = auth.uid()
  );