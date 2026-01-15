import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

interface Agency {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  is_active: boolean;
}

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  agency_id: string | null;
  is_super_admin: boolean;
  created_at: string;
  updated_at: string;
  phone: string | null;
  company_name: string | null;
  job_title: string | null;
  bio: string | null;
  tiktok_username: string | null;
  profile_completed: boolean;
}

interface AgencyContextType {
  user: User | null;
  profile: UserProfile | null;
  agency: Agency | null;
  isLoading: boolean;
  isSuperAdmin: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AgencyContext = createContext<AgencyContextType | undefined>(undefined);

export const AgencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [agency, setAgency] = useState<Agency | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUserData = async (userId: string) => {
    try {
      // Load profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        console.error('Error loading profile:', profileError);
        return;
      }

      setProfile(profileData);

      // Load agency if user has one
      if (profileData?.agency_id) {
        const { data: agencyData, error: agencyError } = await supabase
          .from('agencies')
          .select('*')
          .eq('id', profileData.agency_id)
          .single();

        if (!agencyError && agencyData) {
          setAgency(agencyData);
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await loadUserData(user.id);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Use setTimeout to avoid race conditions with Supabase
          setTimeout(() => loadUserData(session.user.id), 0);
        } else {
          setProfile(null);
          setAgency(null);
        }
        
        setIsLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserData(session.user.id);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setAgency(null);
  };

  return (
    <AgencyContext.Provider
      value={{
        user,
        profile,
        agency,
        isLoading,
        isSuperAdmin: profile?.is_super_admin ?? false,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AgencyContext.Provider>
  );
};

export const useAgency = () => {
  const context = useContext(AgencyContext);
  if (context === undefined) {
    throw new Error('useAgency must be used within an AgencyProvider');
  }
  return context;
};

export default AgencyContext;
