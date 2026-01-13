-- Remove old permissive policies that still exist

-- Dashboard data
DROP POLICY IF EXISTS "Allow public delete" ON public.dashboard_data;
DROP POLICY IF EXISTS "Allow public insert" ON public.dashboard_data;
DROP POLICY IF EXISTS "Allow public read" ON public.dashboard_data;
DROP POLICY IF EXISTS "Allow public update" ON public.dashboard_data;

-- Live schedules
DROP POLICY IF EXISTS "Allow public delete schedules" ON public.live_schedules;
DROP POLICY IF EXISTS "Allow public insert schedules" ON public.live_schedules;
DROP POLICY IF EXISTS "Allow public read schedules" ON public.live_schedules;
DROP POLICY IF EXISTS "Allow public update schedules" ON public.live_schedules;

-- Notes
DROP POLICY IF EXISTS "Allow public delete notes" ON public.notes;
DROP POLICY IF EXISTS "Allow public insert notes" ON public.notes;
DROP POLICY IF EXISTS "Allow public read notes" ON public.notes;
DROP POLICY IF EXISTS "Allow public update notes" ON public.notes;

-- Monthly projections
DROP POLICY IF EXISTS "Allow public insert projections" ON public.monthly_projections;
DROP POLICY IF EXISTS "Allow public read projections" ON public.monthly_projections;
DROP POLICY IF EXISTS "Allow public update projections" ON public.monthly_projections;
DROP POLICY IF EXISTS "Allow public delete projections" ON public.monthly_projections;

-- Scheduling goals
DROP POLICY IF EXISTS "Allow public insert goals" ON public.scheduling_goals;
DROP POLICY IF EXISTS "Allow public read goals" ON public.scheduling_goals;
DROP POLICY IF EXISTS "Allow public update goals" ON public.scheduling_goals;
DROP POLICY IF EXISTS "Allow public delete goals" ON public.scheduling_goals;