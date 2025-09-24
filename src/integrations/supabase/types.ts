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
      account_credits: {
        Row: {
          amount_cents: number
          created_at: string
          created_by: string | null
          credit_type: string
          currency: string
          description: string | null
          expires_at: string | null
          id: string
          reference_id: string | null
          status: string
          updated_at: string
          used_amount_cents: number | null
          user_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          created_by?: string | null
          credit_type: string
          currency?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          reference_id?: string | null
          status?: string
          updated_at?: string
          used_amount_cents?: number | null
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          created_by?: string | null
          credit_type?: string
          currency?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          reference_id?: string | null
          status?: string
          updated_at?: string
          used_amount_cents?: number | null
          user_id?: string
        }
        Relationships: []
      }
      billing_info: {
        Row: {
          billing_address: Json | null
          billing_email: string | null
          card_brand: string | null
          card_exp_month: number | null
          card_exp_year: number | null
          card_last_four: string | null
          company_name: string | null
          created_at: string
          id: string
          payment_method_id: string | null
          payment_method_type: string | null
          stripe_customer_id: string | null
          tax_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_address?: Json | null
          billing_email?: string | null
          card_brand?: string | null
          card_exp_month?: number | null
          card_exp_year?: number | null
          card_last_four?: string | null
          company_name?: string | null
          created_at?: string
          id?: string
          payment_method_id?: string | null
          payment_method_type?: string | null
          stripe_customer_id?: string | null
          tax_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_address?: Json | null
          billing_email?: string | null
          card_brand?: string | null
          card_exp_month?: number | null
          card_exp_year?: number | null
          card_last_four?: string | null
          company_name?: string | null
          created_at?: string
          id?: string
          payment_method_id?: string | null
          payment_method_type?: string | null
          stripe_customer_id?: string | null
          tax_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      companions: {
        Row: {
          age: number
          bio: string
          created_at: string
          dislikes: string[] | null
          gender: string
          hobbies: string[] | null
          id: string
          image_url: string | null
          is_prebuilt: boolean | null
          likes: string[] | null
          location: string | null
          name: string
          personality: string[] | null
          race: string | null
          user_id: string | null
        }
        Insert: {
          age: number
          bio: string
          created_at?: string
          dislikes?: string[] | null
          gender: string
          hobbies?: string[] | null
          id?: string
          image_url?: string | null
          is_prebuilt?: boolean | null
          likes?: string[] | null
          location?: string | null
          name: string
          personality?: string[] | null
          race?: string | null
          user_id?: string | null
        }
        Update: {
          age?: number
          bio?: string
          created_at?: string
          dislikes?: string[] | null
          gender?: string
          hobbies?: string[] | null
          id?: string
          image_url?: string | null
          is_prebuilt?: boolean | null
          likes?: string[] | null
          location?: string | null
          name?: string
          personality?: string[] | null
          race?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      conversation_usage: {
        Row: {
          api_type: string | null
          companion_id: string
          cost_override: number | null
          created_at: string
          id: string
          minutes_used: number | null
          session_end: string | null
          session_start: string
          tokens_used: number | null
          user_id: string
        }
        Insert: {
          api_type?: string | null
          companion_id: string
          cost_override?: number | null
          created_at?: string
          id?: string
          minutes_used?: number | null
          session_end?: string | null
          session_start?: string
          tokens_used?: number | null
          user_id: string
        }
        Update: {
          api_type?: string | null
          companion_id?: string
          cost_override?: number | null
          created_at?: string
          id?: string
          minutes_used?: number | null
          session_end?: string | null
          session_start?: string
          tokens_used?: number | null
          user_id?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount_due_cents: number
          amount_paid_cents: number | null
          billing_period_end: string | null
          billing_period_start: string | null
          created_at: string
          currency: string
          discount_amount_cents: number | null
          due_date: string | null
          id: string
          invoice_number: string | null
          invoice_pdf_url: string | null
          line_items: Json | null
          metadata: Json | null
          paid_at: string | null
          status: string
          stripe_invoice_id: string | null
          tax_amount_cents: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_due_cents: number
          amount_paid_cents?: number | null
          billing_period_end?: string | null
          billing_period_start?: string | null
          created_at?: string
          currency?: string
          discount_amount_cents?: number | null
          due_date?: string | null
          id?: string
          invoice_number?: string | null
          invoice_pdf_url?: string | null
          line_items?: Json | null
          metadata?: Json | null
          paid_at?: string | null
          status: string
          stripe_invoice_id?: string | null
          tax_amount_cents?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_due_cents?: number
          amount_paid_cents?: number | null
          billing_period_end?: string | null
          billing_period_start?: string | null
          created_at?: string
          currency?: string
          discount_amount_cents?: number | null
          due_date?: string | null
          id?: string
          invoice_number?: string | null
          invoice_pdf_url?: string | null
          line_items?: Json | null
          metadata?: Json | null
          paid_at?: string | null
          status?: string
          stripe_invoice_id?: string | null
          tax_amount_cents?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string
          email_notifications: boolean | null
          id: string
          marketing_emails: boolean | null
          payment_notifications: boolean | null
          plan_change_notifications: boolean | null
          trial_expiry_alerts: boolean | null
          updated_at: string
          usage_alerts: boolean | null
          user_id: string
          weekly_reports: boolean | null
        }
        Insert: {
          created_at?: string
          email_notifications?: boolean | null
          id?: string
          marketing_emails?: boolean | null
          payment_notifications?: boolean | null
          plan_change_notifications?: boolean | null
          trial_expiry_alerts?: boolean | null
          updated_at?: string
          usage_alerts?: boolean | null
          user_id: string
          weekly_reports?: boolean | null
        }
        Update: {
          created_at?: string
          email_notifications?: boolean | null
          id?: string
          marketing_emails?: boolean | null
          payment_notifications?: boolean | null
          plan_change_notifications?: boolean | null
          trial_expiry_alerts?: boolean | null
          updated_at?: string
          usage_alerts?: boolean | null
          user_id?: string
          weekly_reports?: boolean | null
        }
        Relationships: []
      }
      payment_history: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          description: string | null
          id: string
          metadata: Json | null
          payment_date: string
          payment_method: string | null
          status: string
          stripe_invoice_id: string | null
          stripe_payment_intent_id: string | null
          subscription_id: string | null
          user_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          payment_date?: string
          payment_method?: string | null
          status: string
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          subscription_id?: string | null
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          payment_date?: string
          payment_method?: string | null
          status?: string
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          subscription_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      plan_changes: {
        Row: {
          created_at: string
          created_by: string | null
          effective_date: string
          id: string
          new_plan: string
          new_price_cents: number | null
          notes: string | null
          old_plan: string | null
          old_price_cents: number | null
          reason: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          effective_date?: string
          id?: string
          new_plan: string
          new_price_cents?: number | null
          notes?: string | null
          old_plan?: string | null
          old_price_cents?: number | null
          reason?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          effective_date?: string
          id?: string
          new_plan?: string
          new_price_cents?: number | null
          notes?: string | null
          old_plan?: string | null
          old_price_cents?: number | null
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          id?: string
          name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          conversion_date: string | null
          created_at: string
          id: string
          metadata: Json | null
          referral_code: string
          referred_email: string | null
          referred_user_id: string | null
          referrer_user_id: string
          reward_amount_cents: number | null
          reward_currency: string | null
          reward_given_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          conversion_date?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          referral_code: string
          referred_email?: string | null
          referred_user_id?: string | null
          referrer_user_id: string
          reward_amount_cents?: number | null
          reward_currency?: string | null
          reward_given_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          conversion_date?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          referral_code?: string
          referred_email?: string | null
          referred_user_id?: string | null
          referrer_user_id?: string
          reward_amount_cents?: number | null
          reward_currency?: string | null
          reward_given_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      relationship_prompts: {
        Row: {
          created_at: string
          id: string
          prompt_text: string
          relationship_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          prompt_text: string
          relationship_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          prompt_text?: string
          relationship_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          account_status: string | null
          created_at: string
          customer_since: string | null
          email: string
          id: string
          is_tester: boolean | null
          last_login: string | null
          referral_code: string | null
          referred_by_user_id: string | null
          stripe_customer_id: string | null
          subscribed: boolean
          subscription_end: string | null
          subscription_tier: string | null
          total_lifetime_value_cents: number | null
          trial_minutes_limit: number | null
          trial_minutes_used: number | null
          trial_start: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          account_status?: string | null
          created_at?: string
          customer_since?: string | null
          email: string
          id?: string
          is_tester?: boolean | null
          last_login?: string | null
          referral_code?: string | null
          referred_by_user_id?: string | null
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          total_lifetime_value_cents?: number | null
          trial_minutes_limit?: number | null
          trial_minutes_used?: number | null
          trial_start?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          account_status?: string | null
          created_at?: string
          customer_since?: string | null
          email?: string
          id?: string
          is_tester?: boolean | null
          last_login?: string | null
          referral_code?: string | null
          referred_by_user_id?: string | null
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          total_lifetime_value_cents?: number | null
          trial_minutes_limit?: number | null
          trial_minutes_used?: number | null
          trial_start?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_type: string
          spicy_unlocked: boolean | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_type?: string
          spicy_unlocked?: boolean | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_type?: string
          spicy_unlocked?: boolean | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string | null
          created_at: string
          customer_satisfaction_rating: number | null
          description: string
          id: string
          priority: string
          resolution: string | null
          resolved_at: string | null
          status: string
          subject: string
          ticket_number: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string
          customer_satisfaction_rating?: number | null
          description: string
          id?: string
          priority?: string
          resolution?: string | null
          resolved_at?: string | null
          status?: string
          subject: string
          ticket_number: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string
          customer_satisfaction_rating?: number | null
          description?: string
          id?: string
          priority?: string
          resolution?: string | null
          resolved_at?: string | null
          status?: string
          subject?: string
          ticket_number?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      usage_analytics: {
        Row: {
          api_calls_made: number | null
          created_at: string
          date: string
          device_types: Json | null
          features_used: Json | null
          id: string
          peak_usage_hour: number | null
          total_minutes_used: number | null
          total_sessions: number | null
          total_tokens_used: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          api_calls_made?: number | null
          created_at?: string
          date: string
          device_types?: Json | null
          features_used?: Json | null
          id?: string
          peak_usage_hour?: number | null
          total_minutes_used?: number | null
          total_sessions?: number | null
          total_tokens_used?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          api_calls_made?: number | null
          created_at?: string
          date?: string
          device_types?: Json | null
          features_used?: Json | null
          id?: string
          peak_usage_hour?: number | null
          total_minutes_used?: number | null
          total_sessions?: number | null
          total_tokens_used?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_companions: {
        Row: {
          companion_id: string
          conversation_history: Json | null
          created_at: string
          custom_memories: Json | null
          id: string
          is_active: boolean | null
          relationship_type: string | null
          updated_at: string
          user_id: string
          vapi_agent_id: string | null
          voice_id: string | null
        }
        Insert: {
          companion_id: string
          conversation_history?: Json | null
          created_at?: string
          custom_memories?: Json | null
          id?: string
          is_active?: boolean | null
          relationship_type?: string | null
          updated_at?: string
          user_id: string
          vapi_agent_id?: string | null
          voice_id?: string | null
        }
        Update: {
          companion_id?: string
          conversation_history?: Json | null
          created_at?: string
          custom_memories?: Json | null
          id?: string
          is_active?: boolean | null
          relationship_type?: string | null
          updated_at?: string
          user_id?: string
          vapi_agent_id?: string | null
          voice_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_companions_companion_id_fkey"
            columns: ["companion_id"]
            isOneToOne: false
            referencedRelation: "companions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_ticket_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      has_unlimited_access: {
        Args: { user_uuid: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
