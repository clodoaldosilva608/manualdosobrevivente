export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

/**
 * Tipos do banco compartilhado "sobrevivência-core" (Supabase mbterwktxczsyevcudoz).
 *
 * REGRA DE OURO DO ECOSSISTEMA: o Manual só enxerga e só declara as tabelas
 * com prefixo manual_* — as tabelas do portal (products, ebooks, courses,
 * waypoints, profiles, routes, ...) pertencem ao Centro de Sobrevivência e
 * NUNCA são acessadas por este aplicativo. O isolamento é garantido por RLS.
 */
export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      manual_app_preferences: {
        Row: {
          coord_format: string;
          north_ref: string;
          units: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          coord_format?: string;
          north_ref?: string;
          units?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          coord_format?: string;
          north_ref?: string;
          units?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      manual_checklist_state: {
        Row: {
          done: boolean;
          id: string;
          key: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          done?: boolean;
          id?: string;
          key: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          done?: boolean;
          id?: string;
          key?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      manual_configuracoes: {
        Row: {
          chave: string;
          updated_at: string;
          valor: Json;
        };
        Insert: {
          chave: string;
          updated_at?: string;
          valor?: Json;
        };
        Update: {
          chave?: string;
          updated_at?: string;
          valor?: Json;
        };
        Relationships: [];
      };
      manual_contribuicoes: {
        Row: {
          approved_at: string | null;
          approved_by: string | null;
          created_at: string;
          email: string | null;
          id: string;
          mensagem: string | null;
          nome_exibicao: string;
          origem: string;
          status: string;
          updated_at: string;
          user_id: string;
          valor: number;
        };
        Insert: {
          approved_at?: string | null;
          approved_by?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          mensagem?: string | null;
          nome_exibicao: string;
          origem?: string;
          status?: string;
          updated_at?: string;
          user_id: string;
          valor: number;
        };
        Update: {
          approved_at?: string | null;
          approved_by?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          mensagem?: string | null;
          nome_exibicao?: string;
          origem?: string;
          status?: string;
          updated_at?: string;
          user_id?: string;
          valor?: number;
        };
        Relationships: [];
      };
      manual_gear_items: {
        Row: {
          category: string;
          created_at: string;
          expires_at: string | null;
          id: string;
          name: string;
          notes: string | null;
          packed: boolean;
          quantity: number;
          updated_at: string;
          user_id: string;
          weight_g: number;
        };
        Insert: {
          category?: string;
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          name: string;
          notes?: string | null;
          packed?: boolean;
          quantity?: number;
          updated_at?: string;
          user_id: string;
          weight_g?: number;
        };
        Update: {
          category?: string;
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          name?: string;
          notes?: string | null;
          packed?: boolean;
          quantity?: number;
          updated_at?: string;
          user_id?: string;
          weight_g?: number;
        };
        Relationships: [];
      };
      manual_parceiros: {
        Row: {
          ativo: boolean;
          created_at: string;
          descricao: string | null;
          id: string;
          link: string | null;
          logo_url: string | null;
          nivel: string;
          nome: string;
          ordem: number;
          updated_at: string;
        };
        Insert: {
          ativo?: boolean;
          created_at?: string;
          descricao?: string | null;
          id?: string;
          link?: string | null;
          logo_url?: string | null;
          nivel?: string;
          nome: string;
          ordem?: number;
          updated_at?: string;
        };
        Update: {
          ativo?: boolean;
          created_at?: string;
          descricao?: string | null;
          id?: string;
          link?: string | null;
          logo_url?: string | null;
          nivel?: string;
          nome?: string;
          ordem?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      manual_perfil_usuarios: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string;
          id: string;
          nome_exibicao: string | null;
          papel: string;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email: string;
          id: string;
          nome_exibicao?: string | null;
          papel?: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string;
          id?: string;
          nome_exibicao?: string | null;
          papel?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      manual_report_delivery_history: {
        Row: {
          checklist_count: number;
          error_message: string | null;
          gear_count: number;
          id: string;
          recipient_email: string;
          sent_at: string;
          status: string;
          user_id: string;
          waypoint_count: number;
        };
        Insert: {
          checklist_count?: number;
          error_message?: string | null;
          gear_count?: number;
          id?: string;
          recipient_email: string;
          sent_at?: string;
          status: string;
          user_id: string;
          waypoint_count?: number;
        };
        Update: {
          checklist_count?: number;
          error_message?: string | null;
          gear_count?: number;
          id?: string;
          recipient_email?: string;
          sent_at?: string;
          status?: string;
          user_id?: string;
          waypoint_count?: number;
        };
        Relationships: [];
      };
      manual_waypoints: {
        Row: {
          category: string;
          color: string;
          created_at: string;
          description: string | null;
          elevation: number | null;
          icon: string | null;
          id: string;
          latitude: number;
          longitude: number;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          category?: string;
          color?: string;
          created_at?: string;
          description?: string | null;
          elevation?: number | null;
          icon?: string | null;
          id?: string;
          latitude: number;
          longitude: number;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          category?: string;
          color?: string;
          created_at?: string;
          description?: string | null;
          elevation?: number | null;
          icon?: string | null;
          id?: string;
          latitude?: number;
          longitude?: number;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      manual_weekly_report_settings: {
        Row: {
          created_at: string;
          enabled: boolean;
          last_sent_at: string | null;
          local_time: string;
          recipient_email: string;
          timezone: string;
          updated_at: string;
          user_id: string;
          weekday: number;
        };
        Insert: {
          created_at?: string;
          enabled?: boolean;
          last_sent_at?: string | null;
          local_time?: string;
          recipient_email: string;
          timezone?: string;
          updated_at?: string;
          user_id: string;
          weekday?: number;
        };
        Update: {
          created_at?: string;
          enabled?: boolean;
          last_sent_at?: string | null;
          local_time?: string;
          recipient_email?: string;
          timezone?: string;
          updated_at?: string;
          user_id?: string;
          weekday?: number;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
