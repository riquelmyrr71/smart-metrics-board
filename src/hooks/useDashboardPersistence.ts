import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Row, Column, ColumnGroup, DashboardSettings } from '@/types/dashboard';
import { PeriodSettings } from '@/lib/projectionCalculator';
import { toast } from 'sonner';

interface SerializedPeriodSettings {
  startDate: string;
  endDate: string;
  currentDate: string;
}

interface DashboardDataPayload {
  rows: Row[];
  columns: Column[];
  columnGroups: ColumnGroup[];
  settings: DashboardSettings;
  periodSettings: PeriodSettings;
}

interface SerializedDashboardData {
  rows: Row[];
  columns: Column[];
  columnGroups: ColumnGroup[];
  settings: DashboardSettings;
  periodSettings: SerializedPeriodSettings;
}

// Fixed UUID for the main dashboard
const DASHBOARD_ID = '00000000-0000-0000-0000-000000000001';

const serializePeriodSettings = (settings: PeriodSettings): SerializedPeriodSettings => ({
  startDate: settings.startDate.toISOString(),
  endDate: settings.endDate.toISOString(),
  currentDate: settings.currentDate.toISOString(),
});

const deserializePeriodSettings = (settings: SerializedPeriodSettings): PeriodSettings => ({
  startDate: new Date(settings.startDate),
  endDate: new Date(settings.endDate),
  currentDate: new Date(settings.currentDate),
});

export const useDashboardPersistence = () => {
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const saveDashboard = useCallback(async (data: DashboardDataPayload) => {
    setIsSaving(true);
    try {
      const serializedData: SerializedDashboardData = {
        ...data,
        periodSettings: serializePeriodSettings(data.periodSettings),
      };

      // Check if record exists
      const { data: existingData } = await supabase
        .from('dashboard_data')
        .select('id')
        .eq('id', DASHBOARD_ID)
        .maybeSingle();

      const payload = {
        data: JSON.parse(JSON.stringify(serializedData)),
        updated_at: new Date().toISOString(),
      };

      if (existingData) {
        // Update existing record
        const { error } = await supabase
          .from('dashboard_data')
          .update(payload)
          .eq('id', DASHBOARD_ID);

        if (error) throw error;
      } else {
        // Insert new record
        const { error } = await supabase
          .from('dashboard_data')
          .insert({
            id: DASHBOARD_ID,
            ...payload,
          });

        if (error) throw error;
      }

      setLastSaved(new Date());
      toast.success('Dados salvos com sucesso!');
      return true;
    } catch (error) {
      console.error('Error saving dashboard:', error);
      toast.error('Erro ao salvar dados');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const loadDashboard = useCallback(async (): Promise<DashboardDataPayload | null> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('dashboard_data')
        .select('data, updated_at')
        .eq('id', DASHBOARD_ID)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setLastSaved(new Date(data.updated_at));
        const serialized = data.data as unknown as SerializedDashboardData;
        
        return {
          ...serialized,
          periodSettings: deserializePeriodSettings(serialized.periodSettings),
        };
      }

      return null;
    } catch (error) {
      console.error('Error loading dashboard:', error);
      toast.error('Erro ao carregar dados salvos');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resetDashboard = useCallback(async (): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('dashboard_data')
        .delete()
        .eq('id', DASHBOARD_ID);

      if (error) throw error;

      setLastSaved(null);
      toast.success('Dashboard resetado com sucesso!');
      return true;
    } catch (error) {
      console.error('Error resetting dashboard:', error);
      toast.error('Erro ao resetar dashboard');
      return false;
    }
  }, []);

  return {
    saveDashboard,
    loadDashboard,
    resetDashboard,
    isSaving,
    isLoading,
    lastSaved,
  };
};
