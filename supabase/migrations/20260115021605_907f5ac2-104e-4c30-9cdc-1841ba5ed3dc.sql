-- Criar bucket para logos de agências
INSERT INTO storage.buckets (id, name, public) 
VALUES ('agency-logos', 'agency-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas para o bucket agency-logos
CREATE POLICY "Agency logos are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'agency-logos');

CREATE POLICY "Agency admins can upload logos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'agency-logos' 
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Agency admins can update logos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'agency-logos' 
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Agency admins can delete logos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'agency-logos' 
    AND auth.uid() IS NOT NULL
  );