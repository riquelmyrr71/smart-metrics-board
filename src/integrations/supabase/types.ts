export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      agencies: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      agency_settings: {
        Row: {
          agency_id: string
          branding: Json | null
          created_at: string | null
          custom_domain: string | null
          features: Json | null
          id: string
          limits: Json | null
          updated_at: string | null
        }
        Insert: {
          agency_id: string
          branding?: Json | null
          created_at?: string | null
          custom_domain?: string | null
          features?: Json | null
          id?: string
          limits?: Json | null
          updated_at?: string | null
        }
        Update: {
          agency_id?: string
          branding?: Json | null
          created_at?: string | null
          custom_domain?: string | null
          features?: Json | null
          id?: string
          limits?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agency_settings_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: true
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          agency_id: string | null
          created_at: string | null
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_email: string | null
          user_id: string
        }
        Insert: {
          action: string
          agency_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_email?: string | null
          user_id: string
        }
        Update: {
          action?: string
          agency_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_data: {
        Row: {
          agency_id: string | null
          created_at: string
          data: Json
          id: string
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          created_at?: string
          data: Json
          id?: string
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          created_at?: string
          data?: Json
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_data_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      live_schedules: {
        Row: {
          agency_id: string | null
          created_at: string
          created_by: string | null
          executive_name: string
          id: string
          is_scheduled: boolean
          member_name: string
          schedule_date: string
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          created_at?: string
          created_by?: string | null
          executive_name: string
          id?: string
          is_scheduled?: boolean
          member_name: string
          schedule_date: string
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          created_at?: string
          created_by?: string | null
          executive_name?: string
          id?: string
          is_scheduled?: boolean
          member_name?: string
          schedule_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_schedules_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_projections: {
        Row: {
          agency_id: string | null
          created_at: string
          creators_actual: number
          creators_projection: number
          diamonds_actual: number
          diamonds_projection: number
          id: string
          month: number
          month_key: string
          projection_date: string
          updated_at: string
          year: number
        }
        Insert: {
          agency_id?: string | null
          created_at?: string
          creators_actual?: number
          creators_projection?: number
          diamonds_actual?: number
          diamonds_projection?: number
          id?: string
          month: number
          month_key: string
          projection_date: string
          updated_at?: string
          year: number
        }
        Update: {
          agency_id?: string | null
          created_at?: string
          creators_actual?: number
          creators_projection?: number
          diamonds_actual?: number
          diamonds_projection?: number
          id?: string
          month?: number
          month_key?: string
          projection_date?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "monthly_projections_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          agency_id: string | null
          content: string | null
          created_at: string
          created_by: string | null
          id: string
          image_url: string | null
          note_date: string
          title: string
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          note_date?: string
          title: string
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          note_date?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          agency_id: string | null
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_super_admin: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          agency_id?: string | null
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          is_super_admin?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          agency_id?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_super_admin?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduling_goals: {
        Row: {
          active_creators: number | null
          agency_id: string | null
          created_at: string
          days_goal: number
          id: string
          month: number
          updated_at: string
          year: number
        }
        Insert: {
          active_creators?: number | null
          agency_id?: string | null
          created_at?: string
          days_goal?: number
          id?: string
          month: number
          updated_at?: string
          year: number
        }
        Update: {
          active_creators?: number | null
          agency_id?: string | null
          created_at?: string
          days_goal?: number
          id?: string
          month?: number
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "scheduling_goals_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          agency_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_agency_id: { Args: { _user_id: string }; Returns: string }
      has_agency_role: {
        Args: {
          _agency_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      log_audit_event: {
        Args: {
          p_action: string
          p_new_data?: Json
          p_old_data?: Json
          p_record_id: string
          p_table_name: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "manager" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["super_admin", "admin", "manager", "user"],
    },
  },
} as const
