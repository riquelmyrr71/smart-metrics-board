-- Adicionar campos de perfil na tabela agencies (se não existirem)
ALTER TABLE public.agencies 
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS website text,
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS state text,
ADD COLUMN IF NOT EXISTS country text DEFAULT 'Brasil',
ADD COLUMN IF NOT EXISTS founded_at date,
ADD COLUMN IF NOT EXISTS total_creators integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_lives integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_diamonds bigint DEFAULT 0;