import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAgency } from '@/contexts/AgencyContext';

export interface AgencyBranding {
  primaryColor: string;
  primaryForeground: string;
  accentColor: string;
  accentForeground: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  companyName: string | null;
  companyTagline: string | null;
}

export interface AgencyFeatures {
  battles: boolean;
  creatorsAnalysis: boolean;
  scheduling: boolean;
  charts: boolean;
  notes: boolean;
  reports: boolean;
}

export interface AgencyLimits {
  maxUsers: number;
  maxCreators: number;
  maxLivesPerMonth: number;
  storageGb: number;
}

export interface AgencySettings {
  id: string;
  agency_id: string;
  branding: AgencyBranding;
  features: AgencyFeatures;
  limits: AgencyLimits;
  custom_domain: string | null;
  created_at: string;
  updated_at: string;
}

const defaultBranding: AgencyBranding = {
  primaryColor: '0 84% 60%',
  primaryForeground: '0 0% 100%',
  accentColor: '0 100% 97%',
  accentForeground: '0 84% 50%',
  logoUrl: null,
  faviconUrl: null,
  companyName: null,
  companyTagline: null,
};

const defaultFeatures: AgencyFeatures = {
  battles: true,
  creatorsAnalysis: true,
  scheduling: true,
  charts: true,
  notes: true,
  reports: true,
};

const defaultLimits: AgencyLimits = {
  maxUsers: 10,
  maxCreators: 100,
  maxLivesPerMonth: 500,
  storageGb: 5,
};

export const useAgencySettings = () => {
  const { agency } = useAgency();
  const [settings, setSettings] = useState<AgencySettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!agency?.id) {
      setIsLoading(false);
      return;
    }

    const loadSettings = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('agency_settings')
          .select('*')
          .eq('agency_id', agency.id)
          .single();

        if (fetchError) {
          console.error('Error loading agency settings:', fetchError);
          setError(fetchError.message);
        } else if (data) {
          const brandingData = (data.branding && typeof data.branding === 'object' && !Array.isArray(data.branding)) 
            ? data.branding as Record<string, unknown>
            : {};
          const featuresData = (data.features && typeof data.features === 'object' && !Array.isArray(data.features))
            ? data.features as Record<string, unknown>
            : {};
          const limitsData = (data.limits && typeof data.limits === 'object' && !Array.isArray(data.limits))
            ? data.limits as Record<string, unknown>
            : {};
          
          setSettings({
            id: data.id,
            agency_id: data.agency_id,
            custom_domain: data.custom_domain,
            created_at: data.created_at,
            updated_at: data.updated_at,
            branding: { ...defaultBranding, ...brandingData } as AgencyBranding,
            features: { ...defaultFeatures, ...featuresData } as AgencyFeatures,
            limits: { ...defaultLimits, ...limitsData } as AgencyLimits,
          });
        }
      } catch (err) {
        console.error('Error:', err);
        setError('Failed to load settings');
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`agency_settings_${agency.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agency_settings',
          filter: `agency_id=eq.${agency.id}`,
        },
        (payload) => {
          if (payload.new) {
            const newData = payload.new as Record<string, unknown>;
            const brandingData = (newData.branding && typeof newData.branding === 'object' && !Array.isArray(newData.branding)) 
              ? newData.branding as Record<string, unknown>
              : {};
            const featuresData = (newData.features && typeof newData.features === 'object' && !Array.isArray(newData.features))
              ? newData.features as Record<string, unknown>
              : {};
            const limitsData = (newData.limits && typeof newData.limits === 'object' && !Array.isArray(newData.limits))
              ? newData.limits as Record<string, unknown>
              : {};
            
            setSettings({
              id: newData.id as string,
              agency_id: newData.agency_id as string,
              custom_domain: newData.custom_domain as string | null,
              created_at: newData.created_at as string,
              updated_at: newData.updated_at as string,
              branding: { ...defaultBranding, ...brandingData } as AgencyBranding,
              features: { ...defaultFeatures, ...featuresData } as AgencyFeatures,
              limits: { ...defaultLimits, ...limitsData } as AgencyLimits,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [agency?.id]);

  const updateBranding = async (branding: Partial<AgencyBranding>) => {
    if (!settings) return { error: 'No settings loaded' };

    const newBranding = { ...settings.branding, ...branding };
    
    const { error: updateError } = await supabase
      .from('agency_settings')
      .update({ branding: newBranding })
      .eq('agency_id', agency?.id);

    if (updateError) {
      return { error: updateError.message };
    }

    setSettings({ ...settings, branding: newBranding });
    return { error: null };
  };

  const updateFeatures = async (features: Partial<AgencyFeatures>) => {
    if (!settings) return { error: 'No settings loaded' };

    const newFeatures = { ...settings.features, ...features };
    
    const { error: updateError } = await supabase
      .from('agency_settings')
      .update({ features: newFeatures })
      .eq('agency_id', agency?.id);

    if (updateError) {
      return { error: updateError.message };
    }

    setSettings({ ...settings, features: newFeatures });
    return { error: null };
  };

  return {
    settings,
    branding: settings?.branding ?? defaultBranding,
    features: settings?.features ?? defaultFeatures,
    limits: settings?.limits ?? defaultLimits,
    isLoading,
    error,
    updateBranding,
    updateFeatures,
  };
};

// Apply branding colors to CSS variables
export const applyBrandingToDocument = (branding: AgencyBranding) => {
  const root = document.documentElement;
  
  if (branding.primaryColor) {
    root.style.setProperty('--primary', branding.primaryColor);
  }
  if (branding.primaryForeground) {
    root.style.setProperty('--primary-foreground', branding.primaryForeground);
  }
  if (branding.accentColor) {
    root.style.setProperty('--accent', branding.accentColor);
  }
  if (branding.accentForeground) {
    root.style.setProperty('--accent-foreground', branding.accentForeground);
  }
  
  // Update favicon if provided
  if (branding.faviconUrl) {
    const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (favicon) {
      favicon.href = branding.faviconUrl;
    }
  }
};
