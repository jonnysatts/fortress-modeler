export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      actual_performance: {
        Row: {
          created_at: string | null
          date: string
          id: string
          metrics: Json | null
          notes: string | null
          project_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          metrics?: Json | null
          notes?: string | null
          project_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          metrics?: Json | null
          notes?: string | null
          project_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "actual_performance_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actual_performance_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actual_performance_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actual_performance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      actuals_period_entries: {
        Row: {
          created_at: string | null
          data: Json | null
          id: string
          period: number
          project_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: string
          period: number
          project_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: string
          period?: number
          project_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "actuals_period_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actuals_period_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actuals_period_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actuals_period_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_models: {
        Row: {
          assumptions: Json | null
          created_at: string | null
          deleted_at: string | null
          id: string
          is_primary: boolean | null
          name: string
          project_id: string
          results_cache: Json | null
          updated_at: string | null
          user_id: string
          version: number | null
        }
        Insert: {
          assumptions?: Json | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_primary?: boolean | null
          name: string
          project_id: string
          results_cache?: Json | null
          updated_at?: string | null
          user_id: string
          version?: number | null
        }
        Update: {
          assumptions?: Json | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_primary?: boolean | null
          name?: string
          project_id?: string
          results_cache?: Json | null
          updated_at?: string | null
          user_id?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_models_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_models_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_models_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_models_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      presence: {
        Row: {
          created_at: string | null
          current_page: string | null
          cursor_position: Json | null
          id: string
          last_seen: string | null
          model_id: string | null
          project_id: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_page?: string | null
          cursor_position?: Json | null
          id?: string
          last_seen?: string | null
          model_id?: string | null
          project_id?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_page?: string | null
          cursor_position?: Json | null
          id?: string
          last_seen?: string | null
          model_id?: string | null
          project_id?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "presence_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "financial_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presence_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "model_performance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presence_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presence_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presence_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presence_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_domain: string | null
          created_at: string | null
          email: string
          id: string
          name: string | null
          picture: string | null
          preferences: Json | null
          updated_at: string | null
        }
        Insert: {
          company_domain?: string | null
          created_at?: string | null
          email: string
          id: string
          name?: string | null
          picture?: string | null
          preferences?: Json | null
          updated_at?: string | null
        }
        Update: {
          company_domain?: string | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string | null
          picture?: string | null
          preferences?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      project_shares: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          last_accessed: string | null
          owner_id: string
          permission: string | null
          project_id: string
          shared_with_email: string
          shared_with_id: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_accessed?: string | null
          owner_id: string
          permission?: string | null
          project_id: string
          shared_with_email: string
          shared_with_id?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_accessed?: string | null
          owner_id?: string
          permission?: string | null
          project_id?: string
          shared_with_email?: string
          shared_with_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_shares_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_shares_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_shares_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_shares_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_shares_shared_with_id_fkey"
            columns: ["shared_with_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          avatar_image: string | null
          created_at: string | null
          data: Json | null
          deleted_at: string | null
          description: string | null
          event_date: string | null
          event_end_date: string | null
          event_type: string | null
          id: string
          is_public: boolean | null
          name: string
          owner_email: string | null
          product_type: string
          share_count: number | null
          target_audience: string | null
          timeline: Json | null
          updated_at: string | null
          user_id: string
          version: number | null
        }
        Insert: {
          avatar_image?: string | null
          created_at?: string | null
          data?: Json | null
          deleted_at?: string | null
          description?: string | null
          event_date?: string | null
          event_end_date?: string | null
          event_type?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          owner_email?: string | null
          product_type: string
          share_count?: number | null
          target_audience?: string | null
          timeline?: Json | null
          updated_at?: string | null
          user_id: string
          version?: number | null
        }
        Update: {
          avatar_image?: string | null
          created_at?: string | null
          data?: Json | null
          deleted_at?: string | null
          description?: string | null
          event_date?: string | null
          event_end_date?: string | null
          event_type?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          owner_email?: string | null
          product_type?: string
          share_count?: number | null
          target_audience?: string | null
          timeline?: Json | null
          updated_at?: string | null
          user_id?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      risks: {
        Row: {
          created_at: string | null
          id: string
          impact: string
          likelihood: string
          mitigation: string | null
          name: string
          notes: string | null
          owner_email: string | null
          project_id: string
          status: string | null
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          impact: string
          likelihood: string
          mitigation?: string | null
          name: string
          notes?: string | null
          owner_email?: string | null
          project_id: string
          status?: string | null
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          impact?: string
          likelihood?: string
          mitigation?: string | null
          name?: string
          notes?: string | null
          owner_email?: string | null
          project_id?: string
          status?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "risks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      scenarios: {
        Row: {
          assumptions: Json | null
          created_at: string | null
          description: string | null
          id: string
          model_id: string
          name: string
          project_id: string
          results: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assumptions?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          model_id: string
          name: string
          project_id: string
          results?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assumptions?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          model_id?: string
          name?: string
          project_id?: string
          results?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scenarios_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "financial_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenarios_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "model_performance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenarios_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenarios_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenarios_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenarios_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      special_event_actuals: {
        Row: {
          actual_attendance: number | null
          actual_fnb_cogs: number | null
          actual_fnb_revenue: number | null
          actual_marketing_costs: number | null
          actual_merch_cogs: number | null
          actual_merch_revenue: number | null
          actual_other_costs: number | null
          actual_other_income: number | null
          actual_production_costs: number | null
          actual_sponsorship_income: number | null
          actual_staffing_costs: number | null
          actual_ticket_sales: number | null
          actual_total_costs: number | null
          actual_vendor_costs: number | null
          actual_venue_costs: number | null
          attendance: number | null
          attendance_breakdown: string | null
          average_ticket_price: number | null
          brand_impact_assessment: string | null
          challenges_faced: string | null
          cost_variance_notes: string | null
          created_at: string | null
          customer_feedback_summary: string | null
          event_success_indicators: string | null
          general_notes: string | null
          id: string
          lessons_learned: string | null
          marketing_content_performance: string | null
          marketing_email_performance: string | null
          marketing_influencer_performance: string | null
          marketing_paid_ads_performance: string | null
          marketing_roi_notes: string | null
          marketing_social_performance: string | null
          notes: string | null
          press_coverage: string | null
          project_id: string
          recommendations_future: string | null
          revenue_variance_notes: string | null
          social_media_engagement: string | null
          success_rating: number | null
          team_feedback: string | null
          updated_at: string | null
          vendor_feedback: string | null
        }
        Insert: {
          actual_attendance?: number | null
          actual_fnb_cogs?: number | null
          actual_fnb_revenue?: number | null
          actual_marketing_costs?: number | null
          actual_merch_cogs?: number | null
          actual_merch_revenue?: number | null
          actual_other_costs?: number | null
          actual_other_income?: number | null
          actual_production_costs?: number | null
          actual_sponsorship_income?: number | null
          actual_staffing_costs?: number | null
          actual_ticket_sales?: number | null
          actual_total_costs?: number | null
          actual_vendor_costs?: number | null
          actual_venue_costs?: number | null
          attendance?: number | null
          attendance_breakdown?: string | null
          average_ticket_price?: number | null
          brand_impact_assessment?: string | null
          challenges_faced?: string | null
          cost_variance_notes?: string | null
          created_at?: string | null
          customer_feedback_summary?: string | null
          event_success_indicators?: string | null
          general_notes?: string | null
          id?: string
          lessons_learned?: string | null
          marketing_content_performance?: string | null
          marketing_email_performance?: string | null
          marketing_influencer_performance?: string | null
          marketing_paid_ads_performance?: string | null
          marketing_roi_notes?: string | null
          marketing_social_performance?: string | null
          notes?: string | null
          press_coverage?: string | null
          project_id: string
          recommendations_future?: string | null
          revenue_variance_notes?: string | null
          social_media_engagement?: string | null
          success_rating?: number | null
          team_feedback?: string | null
          updated_at?: string | null
          vendor_feedback?: string | null
        }
        Update: {
          actual_attendance?: number | null
          actual_fnb_cogs?: number | null
          actual_fnb_revenue?: number | null
          actual_marketing_costs?: number | null
          actual_merch_cogs?: number | null
          actual_merch_revenue?: number | null
          actual_other_costs?: number | null
          actual_other_income?: number | null
          actual_production_costs?: number | null
          actual_sponsorship_income?: number | null
          actual_staffing_costs?: number | null
          actual_ticket_sales?: number | null
          actual_total_costs?: number | null
          actual_vendor_costs?: number | null
          actual_venue_costs?: number | null
          attendance?: number | null
          attendance_breakdown?: string | null
          average_ticket_price?: number | null
          brand_impact_assessment?: string | null
          challenges_faced?: string | null
          cost_variance_notes?: string | null
          created_at?: string | null
          customer_feedback_summary?: string | null
          event_success_indicators?: string | null
          general_notes?: string | null
          id?: string
          lessons_learned?: string | null
          marketing_content_performance?: string | null
          marketing_email_performance?: string | null
          marketing_influencer_performance?: string | null
          marketing_paid_ads_performance?: string | null
          marketing_roi_notes?: string | null
          marketing_social_performance?: string | null
          notes?: string | null
          press_coverage?: string | null
          project_id?: string
          recommendations_future?: string | null
          revenue_variance_notes?: string | null
          social_media_engagement?: string | null
          success_rating?: number | null
          team_feedback?: string | null
          updated_at?: string | null
          vendor_feedback?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "special_event_actuals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "project_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_event_actuals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_event_actuals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "user_accessible_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      special_event_forecasts: {
        Row: {
          cost_notes: string | null
          created_at: string | null
          estimated_attendance: number | null
          forecast_fnb_cogs_pct: number | null
          forecast_fnb_revenue: number | null
          forecast_marketing_costs: number | null
          forecast_merch_cogs_pct: number | null
          forecast_merch_revenue: number | null
          forecast_other_costs: number | null
          forecast_other_income: number | null
          forecast_production_costs: number | null
          forecast_sponsorship_income: number | null
          forecast_staffing_costs: number | null
          forecast_ticket_sales: number | null
          forecast_total_costs: number | null
          forecast_vendor_costs: number | null
          forecast_venue_costs: number | null
          general_notes: string | null
          id: string
          marketing_content_budget: number | null
          marketing_email_budget: number | null
          marketing_influencer_budget: number | null
          marketing_notes: string | null
          marketing_paid_ads_budget: number | null
          marketing_social_budget: number | null
          marketing_strategy: string | null
          notes: string | null
          project_id: string
          revenue_notes: string | null
          ticket_price: number | null
          updated_at: string | null
        }
        Insert: {
          cost_notes?: string | null
          created_at?: string | null
          estimated_attendance?: number | null
          forecast_fnb_cogs_pct?: number | null
          forecast_fnb_revenue?: number | null
          forecast_marketing_costs?: number | null
          forecast_merch_cogs_pct?: number | null
          forecast_merch_revenue?: number | null
          forecast_other_costs?: number | null
          forecast_other_income?: number | null
          forecast_production_costs?: number | null
          forecast_sponsorship_income?: number | null
          forecast_staffing_costs?: number | null
          forecast_ticket_sales?: number | null
          forecast_total_costs?: number | null
          forecast_vendor_costs?: number | null
          forecast_venue_costs?: number | null
          general_notes?: string | null
          id?: string
          marketing_content_budget?: number | null
          marketing_email_budget?: number | null
          marketing_influencer_budget?: number | null
          marketing_notes?: string | null
          marketing_paid_ads_budget?: number | null
          marketing_social_budget?: number | null
          marketing_strategy?: string | null
          notes?: string | null
          project_id: string
          revenue_notes?: string | null
          ticket_price?: number | null
          updated_at?: string | null
        }
        Update: {
          cost_notes?: string | null
          created_at?: string | null
          estimated_attendance?: number | null
          forecast_fnb_cogs_pct?: number | null
          forecast_fnb_revenue?: number | null
          forecast_marketing_costs?: number | null
          forecast_merch_cogs_pct?: number | null
          forecast_merch_revenue?: number | null
          forecast_other_costs?: number | null
          forecast_other_income?: number | null
          forecast_production_costs?: number | null
          forecast_sponsorship_income?: number | null
          forecast_staffing_costs?: number | null
          forecast_ticket_sales?: number | null
          forecast_total_costs?: number | null
          forecast_vendor_costs?: number | null
          forecast_venue_costs?: number | null
          general_notes?: string | null
          id?: string
          marketing_content_budget?: number | null
          marketing_email_budget?: number | null
          marketing_influencer_budget?: number | null
          marketing_notes?: string | null
          marketing_paid_ads_budget?: number | null
          marketing_social_budget?: number | null
          marketing_strategy?: string | null
          notes?: string | null
          project_id?: string
          revenue_notes?: string | null
          ticket_price?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "special_event_forecasts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_event_forecasts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_event_forecasts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      special_event_milestones: {
        Row: {
          assignee: string | null
          completed: boolean | null
          id: string
          milestone_label: string | null
          notes: string | null
          project_id: string
          target_date: string | null
        }
        Insert: {
          assignee?: string | null
          completed?: boolean | null
          id?: string
          milestone_label?: string | null
          notes?: string | null
          project_id: string
          target_date?: string | null
        }
        Update: {
          assignee?: string | null
          completed?: boolean | null
          id?: string
          milestone_label?: string | null
          notes?: string | null
          project_id?: string
          target_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "special_event_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_event_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_event_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      model_performance: {
        Row: {
          assumptions: Json | null
          created_at: string | null
          id: string | null
          name: string | null
          project_id: string | null
          results_cache: Json | null
          scenario_count: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_models_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_models_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_models_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_summaries: {
        Row: {
          created_at: string | null
          description: string | null
          id: string | null
          is_public: boolean | null
          model_count: number | null
          name: string | null
          performance_entries_count: number | null
          product_type: string | null
          risk_count: number | null
          share_count: number | null
          updated_at: string | null
        }
        Relationships: []
      }
      user_accessible_projects: {
        Row: {
          avatar_image: string | null
          created_at: string | null
          data: Json | null
          deleted_at: string | null
          description: string | null
          event_date: string | null
          event_end_date: string | null
          event_type: string | null
          id: string | null
          is_public: boolean | null
          name: string | null
          owner_email: string | null
          product_type: string | null
          share_count: number | null
          target_audience: string | null
          timeline: Json | null
          updated_at: string | null
          user_id: string | null
          version: number | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      calculate_special_event_roi: {
        Args: { p_project_id: string }
        Returns: {
          forecast_revenue: number
          forecast_costs: number
          forecast_profit: number
          actual_revenue: number
          actual_costs: number
          actual_profit: number
          revenue_variance: number
          cost_variance: number
          profit_variance: number
          roi_percent: number
        }[]
      }
      get_shared_projects: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          user_id: string
          name: string
          description: string
          product_type: string
          target_audience: string
          data: Json
          timeline: Json
          avatar_image: string
          is_public: boolean
          owner_email: string
          share_count: number
          version: number
          created_at: string
          updated_at: string
          deleted_at: string
          event_type: string
          event_date: string
          event_end_date: string
          permission: string
        }[]
      }
      get_user_projects: {
        Args: Record<PropertyKey, never>
        Returns: {
          owner_email: string
          project_id: string
          user_id: string
          name: string
          description: string
          product_type: string
          target_audience: string
          data: Json
          timeline: Json
          avatar_image: string
          is_public: boolean
          share_count: number
          version: number
          created_at: string
          updated_at: string
          deleted_at: string
          event_type: string
          event_date: string
          event_end_date: string
        }[]
      }
      migrate_user_data: {
        Args: {
          user_email: string
          user_name?: string
          user_picture?: string
          user_company_domain?: string
          user_preferences?: Json
        }
        Returns: string
      }
      simple_project_owner_check: {
        Args: { project_id: string }
        Returns: boolean
      }
      simple_project_shared_check: {
        Args: { project_id: string }
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
