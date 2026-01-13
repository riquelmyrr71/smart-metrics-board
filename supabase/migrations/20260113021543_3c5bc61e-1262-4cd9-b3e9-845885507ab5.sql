-- Inserir a agência Curli
INSERT INTO public.agencies (id, name, slug, is_active) 
VALUES ('00000000-0000-0000-0000-000000000001', 'Curli Agência', 'curli', true);

-- Criar função para criar perfil automaticamente no signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, agency_id)
  VALUES (
    NEW.id, 
    NEW.email,
    (SELECT id FROM public.agencies WHERE slug = 'curli' LIMIT 1)
  );
  
  -- Criar role padrão para o usuário
  INSERT INTO public.user_roles (user_id, agency_id, role)
  VALUES (
    NEW.id,
    (SELECT id FROM public.agencies WHERE slug = 'curli' LIMIT 1),
    'admin'::app_role
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar trigger para chamar a função no signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();