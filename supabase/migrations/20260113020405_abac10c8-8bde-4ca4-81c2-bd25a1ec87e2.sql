-- Fix RLS policies on existing tables to use agency-based access

-- Dashboard data policies
DROP POLICY IF EXISTS "Allow all operations on dashboard_data" ON public.dashboard_data;
DROP POLICY IF EXISTS "Allow read access" ON public.dashboard_data;
DROP POLICY IF EXISTS "Allow insert" ON public.dashboard_data;
DROP POLICY IF EXISTS "Allow update" ON public.dashboard_data;
DROP POLICY IF EXISTS "Allow delete" ON public.dashboard_data;

CREATE POLICY "Users can view dashboard data for their agency"
  ON public.dashboard_data FOR SELECT
  USING (
    agency_id IS NULL 
    OR agency_id = public.get_user_agency_id(auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Users can insert dashboard data for their agency"
  ON public.dashboard_data FOR INSERT
  WITH CHECK (
    agency_id IS NULL 
    OR agency_id = public.get_user_agency_id(auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Users can update dashboard data for their agency"
  ON public.dashboard_data FOR UPDATE
  USING (
    agency_id IS NULL 
    OR agency_id = public.get_user_agency_id(auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Users can delete dashboard data for their agency"
  ON public.dashboard_data FOR DELETE
  USING (
    agency_id IS NULL 
    OR agency_id = public.get_user_agency_id(auth.uid())
    OR public.is_super_admin(auth.uid())
  );

-- Live schedules policies
DROP POLICY IF EXISTS "Allow all read" ON public.live_schedules;
DROP POLICY IF EXISTS "Allow all insert" ON public.live_schedules;
DROP POLICY IF EXISTS "Allow all update" ON public.live_schedules;
DROP POLICY IF EXISTS "Allow all delete" ON public.live_schedules;

CREATE POLICY "Users can view live schedules for their agency"
  ON public.live_schedules FOR SELECT
  USING (
    agency_id IS NULL 
    OR agency_id = public.get_user_agency_id(auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Users can insert live schedules for their agency"
  ON public.live_schedules FOR INSERT
  WITH CHECK (
    agency_id IS NULL 
    OR agency_id = public.get_user_agency_id(auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Users can update live schedules for their agency"
  ON public.live_schedules FOR UPDATE
  USING (
    agency_id IS NULL 
    OR agency_id = public.get_user_agency_id(auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Users can delete live schedules for their agency"
  ON public.live_schedules FOR DELETE
  USING (
    agency_id IS NULL 
    OR agency_id = public.get_user_agency_id(auth.uid())
    OR public.is_super_admin(auth.uid())
  );

-- Notes policies
DROP POLICY IF EXISTS "Allow all operations on notes" ON public.notes;
DROP POLICY IF EXISTS "Allow read access to notes" ON public.notes;
DROP POLICY IF EXISTS "Allow insert notes" ON public.notes;
DROP POLICY IF EXISTS "Allow update notes" ON public.notes;
DROP POLICY IF EXISTS "Allow delete notes" ON public.notes;

CREATE POLICY "Users can view notes for their agency"
  ON public.notes FOR SELECT
  USING (
    agency_id IS NULL 
    OR agency_id = public.get_user_agency_id(auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Users can insert notes for their agency"
  ON public.notes FOR INSERT
  WITH CHECK (
    agency_id IS NULL 
    OR agency_id = public.get_user_agency_id(auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Users can update notes for their agency"
  ON public.notes FOR UPDATE
  USING (
    agency_id IS NULL 
    OR agency_id = public.get_user_agency_id(auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Users can delete notes for their agency"
  ON public.notes FOR DELETE
  USING (
    agency_id IS NULL 
    OR agency_id = public.get_user_agency_id(auth.uid())
    OR public.is_super_admin(auth.uid())
  );

-- Scheduling goals policies
DROP POLICY IF EXISTS "Allow all read scheduling_goals" ON public.scheduling_goals;
DROP POLICY IF EXISTS "Allow all insert scheduling_goals" ON public.scheduling_goals;
DROP POLICY IF EXISTS "Allow all update scheduling_goals" ON public.scheduling_goals;
DROP POLICY IF EXISTS "Allow all delete scheduling_goals" ON public.scheduling_goals;

CREATE POLICY "Users can view scheduling goals for their agency"
  ON public.scheduling_goals FOR SELECT
  USING (
    agency_id IS NULL 
    OR agency_id = public.get_user_agency_id(auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Users can insert scheduling goals for their agency"
  ON public.scheduling_goals FOR INSERT
  WITH CHECK (
    agency_id IS NULL 
    OR agency_id = public.get_user_agency_id(auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Users can update scheduling goals for their agency"
  ON public.scheduling_goals FOR UPDATE
  USING (
    agency_id IS NULL 
    OR agency_id = public.get_user_agency_id(auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Users can delete scheduling goals for their agency"
  ON public.scheduling_goals FOR DELETE
  USING (
    agency_id IS NULL 
    OR agency_id = public.get_user_agency_id(auth.uid())
    OR public.is_super_admin(auth.uid())
  );

-- Monthly projections policies
DROP POLICY IF EXISTS "Allow all read monthly_projections" ON public.monthly_projections;
DROP POLICY IF EXISTS "Allow all insert monthly_projections" ON public.monthly_projections;
DROP POLICY IF EXISTS "Allow all update monthly_projections" ON public.monthly_projections;
DROP POLICY IF EXISTS "Allow all delete monthly_projections" ON public.monthly_projections;

CREATE POLICY "Users can view monthly projections for their agency"
  ON public.monthly_projections FOR SELECT
  USING (
    agency_id IS NULL 
    OR agency_id = public.get_user_agency_id(auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Users can insert monthly projections for their agency"
  ON public.monthly_projections FOR INSERT
  WITH CHECK (
    agency_id IS NULL 
    OR agency_id = public.get_user_agency_id(auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Users can update monthly projections for their agency"
  ON public.monthly_projections FOR UPDATE
  USING (
    agency_id IS NULL 
    OR agency_id = public.get_user_agency_id(auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Users can delete monthly projections for their agency"
  ON public.monthly_projections FOR DELETE
  USING (
    agency_id IS NULL 
    OR agency_id = public.get_user_agency_id(auth.uid())
    OR public.is_super_admin(auth.uid())
  );