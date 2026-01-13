import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'super_admin' | 'admin' | 'manager' | 'user';

interface Profile {
  id: string;
  user_id: string;
  agency_id: string | null;
  full_name: string | null;
  avatar_url: string | null;
  email: string;
  is_super_admin: boolean;
}

interface Agency {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  is_active: boolean;
}

interface UserRole {
  id: string;
  user_id: string;
  agency_id: string;
  role: AppRole;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  agency: Agency | null;
  userRoles: UserRole[];
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isSuperAdmin: boolean;
  hasRole: (role: AppRole) => boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [agency, setAgency] = useState<Agency | null>(null);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return;
      }

      setProfile(profileData as Profile);

      // Fetch agency if user has one
      if (profileData?.agency_id) {
        const { data: agencyData } = await supabase
          .from('agencies')
          .select('*')
          .eq('id', profileData.agency_id)
          .single();

        if (agencyData) {
          setAgency(agencyData as Agency);
        }
      }

      // Fetch user roles
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId);

      if (rolesData) {
        setUserRoles(rolesData as UserRole[]);
      }
    } catch (error) {
      console.error('Error in fetchProfile:', error);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    // Set up auth state listener BEFORE checking initial session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Use setTimeout to avoid potential deadlock with Supabase
          setTimeout(() => fetchProfile(session.user.id), 0);
        } else {
          setProfile(null);
          setAgency(null);
          setUserRoles([]);
        }

        setLoading(false);
      }
    );

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: fullName,
        },
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setAgency(null);
    setUserRoles([]);
  };

  const isSuperAdmin = profile?.is_super_admin ?? false;

  const hasRole = (role: AppRole): boolean => {
    if (isSuperAdmin) return true;
    return userRoles.some((r) => r.role === role);
  };

  const value = {
    user,
    session,
    profile,
    agency,
    userRoles,
    loading,
    signIn,
    signUp,
    signOut,
    isSuperAdmin,
    hasRole,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
