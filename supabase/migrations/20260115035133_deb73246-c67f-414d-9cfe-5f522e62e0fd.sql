-- Create table to store agency login codes
CREATE TABLE public.agency_login_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL,
  agency_id UUID REFERENCES public.agencies(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agency_login_codes ENABLE ROW LEVEL SECURITY;

-- Create policy for checking codes (anyone can verify a code to login)
CREATE POLICY "Anyone can verify login codes" 
ON public.agency_login_codes 
FOR SELECT 
USING (is_active = true);

-- Create policy for admins to manage codes
CREATE POLICY "Super admins can manage login codes" 
ON public.agency_login_codes 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.is_super_admin = true
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_agency_login_codes_updated_at
BEFORE UPDATE ON public.agency_login_codes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert the first agency code for Curli
INSERT INTO public.agency_login_codes (email, code, agency_id)
SELECT 
  'curliagencia@businesscenter.com',
  '016486',
  (SELECT id FROM public.agencies WHERE slug = 'curli' LIMIT 1)
WHERE EXISTS (SELECT 1 FROM public.agencies WHERE slug = 'curli');

-- If agency doesn't exist yet, insert without agency_id
INSERT INTO public.agency_login_codes (email, code)
SELECT 'curliagencia@businesscenter.com', '016486'
WHERE NOT EXISTS (
  SELECT 1 FROM public.agency_login_codes 
  WHERE email = 'curliagencia@businesscenter.com'
);