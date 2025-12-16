-- Create table for live scheduling data
CREATE TABLE public.live_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_name TEXT NOT NULL,
  executive_name TEXT NOT NULL,
  schedule_date DATE NOT NULL,
  is_scheduled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(member_name, schedule_date)
);

-- Enable Row Level Security
ALTER TABLE public.live_schedules ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (no auth required)
CREATE POLICY "Allow public read schedules" 
ON public.live_schedules 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert schedules" 
ON public.live_schedules 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update schedules" 
ON public.live_schedules 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow public delete schedules" 
ON public.live_schedules 
FOR DELETE 
USING (true);

-- Create table for scheduling goals
CREATE TABLE public.scheduling_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  days_goal INTEGER NOT NULL DEFAULT 20,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(month, year)
);

-- Enable Row Level Security
ALTER TABLE public.scheduling_goals ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Allow public read goals" 
ON public.scheduling_goals 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert goals" 
ON public.scheduling_goals 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update goals" 
ON public.scheduling_goals 
FOR UPDATE 
USING (true);