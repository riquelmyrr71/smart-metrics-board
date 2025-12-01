-- Create table to store dashboard data
CREATE TABLE public.dashboard_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dashboard_data ENABLE ROW LEVEL SECURITY;

-- Allow public read/write for now (no auth required)
CREATE POLICY "Allow public read" 
ON public.dashboard_data 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert" 
ON public.dashboard_data 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update" 
ON public.dashboard_data 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow public delete" 
ON public.dashboard_data 
FOR DELETE 
USING (true);