-- Create roles enum for the platform
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'manager', 'user');

-- Create agencies table (multi-tenant)
CREATE TABLE public.agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  agency_id UUID REFERENCES public.agencies(id) ON DELETE SET NULL,
  full_name TEXT,
  avatar_url TEXT,
  email TEXT NOT NULL,
  is_super_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, agency_id)
);

-- Enable RLS on all tables
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id
      AND is_super_admin = true
  )
$$;

-- Security definer function to check if user has role in agency
CREATE OR REPLACE FUNCTION public.has_agency_role(_user_id UUID, _agency_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND agency_id = _agency_id
      AND role = _role
  )
$$;

-- Security definer function to get user's agency_id
CREATE OR REPLACE FUNCTION public.get_user_agency_id(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT agency_id
  FROM public.profiles
  WHERE user_id = _user_id
$$;

-- Agencies policies
CREATE POLICY "Super admins can view all agencies"
  ON public.agencies FOR SELECT
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Users can view their own agency"
  ON public.agencies FOR SELECT
  USING (id = public.get_user_agency_id(auth.uid()));

CREATE POLICY "Super admins can create agencies"
  ON public.agencies FOR INSERT
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update agencies"
  ON public.agencies FOR UPDATE
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete agencies"
  ON public.agencies FOR DELETE
  USING (public.is_super_admin(auth.uid()));

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Agency admins can view profiles in their agency"
  ON public.profiles FOR SELECT
  USING (
    agency_id = public.get_user_agency_id(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND agency_id = public.profiles.agency_id
        AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND is_super_admin = false);

CREATE POLICY "Super admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Allow insert during signup"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- User roles policies
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Agency admins can view roles in their agency"
  ON public.user_roles FOR SELECT
  USING (
    agency_id = public.get_user_agency_id(auth.uid())
    AND public.has_agency_role(auth.uid(), agency_id, 'admin')
  );

CREATE POLICY "Super admins can manage all roles"
  ON public.user_roles FOR ALL
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Agency admins can manage roles in their agency"
  ON public.user_roles FOR ALL
  USING (
    agency_id = public.get_user_agency_id(auth.uid())
    AND public.has_agency_role(auth.uid(), agency_id, 'admin')
    AND role != 'super_admin'
  );

-- Update dashboard_data table to include agency_id
ALTER TABLE public.dashboard_data ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE;

-- Update live_schedules table to include agency_id
ALTER TABLE public.live_schedules ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE;

-- Update notes table to include agency_id
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE;

-- Update scheduling_goals table to include agency_id
ALTER TABLE public.scheduling_goals ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE;

-- Update monthly_projections table to include agency_id
ALTER TABLE public.monthly_projections ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE;

-- Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create triggers for updated_at
CREATE TRIGGER update_agencies_updated_at
  BEFORE UPDATE ON public.agencies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();