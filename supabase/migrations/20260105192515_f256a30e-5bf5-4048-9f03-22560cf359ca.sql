-- Create function to update timestamps (if not exists)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create table to store monthly projections
CREATE TABLE public.monthly_projections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  month_key TEXT NOT NULL UNIQUE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  diamonds_projection INTEGER NOT NULL DEFAULT 0,
  creators_projection INTEGER NOT NULL DEFAULT 0,
  diamonds_actual INTEGER NOT NULL DEFAULT 0,
  creators_actual INTEGER NOT NULL DEFAULT 0,
  projection_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.monthly_projections ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Allow public read projections" 
ON public.monthly_projections 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert projections" 
ON public.monthly_projections 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update projections" 
ON public.monthly_projections 
FOR UPDATE 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_monthly_projections_updated_at
BEFORE UPDATE ON public.monthly_projections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups by month
CREATE INDEX idx_monthly_projections_month_key ON public.monthly_projections(month_key);