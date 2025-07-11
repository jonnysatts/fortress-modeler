export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          name: string | null
          picture: string | null
          company_domain: string | null
          preferences: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          picture?: string | null
          company_domain?: string | null
          preferences?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          picture?: string | null
          company_domain?: string | null
          preferences?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      projects: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          product_type: string
          target_audience: string | null
          data: Json
          timeline: Json
          avatar_image: string | null
          is_public: boolean
          owner_email: string | null
          share_count: number
          version: number
          created_at: string
          updated_at: string
          deleted_at: string | null
          event_type: string | null
          event_date: string | null
          event_end_date: string | null
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          product_type: string
          target_audience?: string | null
          data?: Json
          timeline?: Json
          avatar_image?: string | null
          is_public?: boolean
          owner_email?: string | null
          share_count?: number
          version?: number
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          event_type?: string | null
          event_date?: string | null
          event_end_date?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          product_type?: string
          target_audience?: string | null
          data?: Json
          timeline?: Json
          avatar_image?: string | null
          is_public?: boolean
          owner_email?: string | null
          share_count?: number
          version?: number
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          event_type?: string | null
          event_date?: string | null
          event_end_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      special_event_forecasts: {
        Row: {
          id: string
          project_id: string
          forecast_fnb_revenue: number | null
          forecast_fnb_cogs_pct: number | null
          forecast_merch_revenue: number | null
          forecast_merch_cogs_pct: number | null
          forecast_sponsorship_income: number | null
          forecast_ticket_sales: number | null
          forecast_other_income: number | null
          forecast_total_costs: number | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          forecast_fnb_revenue?: number | null
          forecast_fnb_cogs_pct?: number | null
          forecast_merch_revenue?: number | null
          forecast_merch_cogs_pct?: number | null
          forecast_sponsorship_income?: number | null
          forecast_ticket_sales?: number | null
          forecast_other_income?: number | null
          forecast_total_costs?: number | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          forecast_fnb_revenue?: number | null
          forecast_fnb_cogs_pct?: number | null
          forecast_merch_revenue?: number | null
          forecast_merch_cogs_pct?: number | null
          forecast_sponsorship_income?: number | null
          forecast_ticket_sales?: number | null
          forecast_other_income?: number | null
          forecast_total_costs?: number | null
          notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "special_event_forecasts_project_id_fkey"
            columns: ["project_id"]
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
      special_event_actuals: {
        Row: {
          id: string
          project_id: string
          actual_fnb_revenue: number | null
          actual_fnb_cogs: number | null
          actual_merch_revenue: number | null
          actual_merch_cogs: number | null
          actual_sponsorship_income: number | null
          actual_ticket_sales: number | null
          actual_other_income: number | null
          actual_total_costs: number | null
          attendance: number | null
          notes: string | null
          success_rating: number | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          actual_fnb_revenue?: number | null
          actual_fnb_cogs?: number | null
          actual_merch_revenue?: number | null
          actual_merch_cogs?: number | null
          actual_sponsorship_income?: number | null
          actual_ticket_sales?: number | null
          actual_other_income?: number | null
          actual_total_costs?: number | null
          attendance?: number | null
          notes?: string | null
          success_rating?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          actual_fnb_revenue?: number | null
          actual_fnb_cogs?: number | null
          actual_merch_revenue?: number | null
          actual_merch_cogs?: number | null
          actual_sponsorship_income?: number | null
          actual_ticket_sales?: number | null
          actual_other_income?: number | null
          actual_total_costs?: number | null
          attendance?: number | null
          notes?: string | null
          success_rating?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "special_event_actuals_project_id_fkey"
            columns: ["project_id"]
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
      special_event_milestones: {
        Row: {
          id: string
          project_id: string
          milestone_label: string | null
          target_date: string | null
          completed: boolean | null
          assignee: string | null
          notes: string | null
        }
        Insert: {
          id?: string
          project_id: string
          milestone_label?: string | null
          target_date?: string | null
          completed?: boolean | null
          assignee?: string | null
          notes?: string | null
        }
        Update: {
          id?: string
          project_id?: string
          milestone_label?: string | null
          target_date?: string | null
          completed?: boolean | null
          assignee?: string | null
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "special_event_milestones_project_id_fkey"
            columns: ["project_id"]
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
      financial_models: {
        Row: {
          id: string
          project_id: string
          user_id: string
          name: string
          assumptions: Json
          results_cache: Json
          version: number
          created_at: string
          updated_at: string
          deleted_at: string | null
          is_primary: boolean | null
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          name: string
          assumptions?: Json
          results_cache?: Json
          version?: number
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          is_primary?: boolean | null
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          name?: string
          assumptions?: Json
          results_cache?: Json
          version?: number
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          is_primary?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_models_project_id_fkey"
            columns: ["project_id"]
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_models_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      actual_performance: {
        Row: {
          id: string
          project_id: string
          user_id: string
          date: string
          metrics: Json
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          date: string
          metrics: Json
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          date?: string
          metrics?: Json
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "actual_performance_project_id_fkey"
            columns: ["project_id"]
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actual_performance_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      actuals_period_entries: {
        Row: {
          id: string
          project_id: string
          user_id: string
          period: number
          data: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          period: number
          data: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          period?: number
          data?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "actuals_period_entries_project_id_fkey"
            columns: ["project_id"]
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actuals_period_entries_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      risks: {
        Row: {
          id: string
          project_id: string
          user_id: string
          name: string
          type: string
          likelihood: string
          impact: string
          status: string
          mitigation: string | null
          notes: string | null
          owner_email: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          name: string
          type: string
          likelihood: string
          impact: string
          status?: string
          mitigation?: string | null
          notes?: string | null
          owner_email?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          name?: string
          type?: string
          likelihood?: string
          impact?: string
          status?: string
          mitigation?: string | null
          notes?: string | null
          owner_email?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "risks_project_id_fkey"
            columns: ["project_id"]
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risks_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      scenarios: {
        Row: {
          id: string
          project_id: string
          model_id: string
          user_id: string
          name: string
          description: string | null
          assumptions: Json
          results: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          model_id: string
          user_id: string
          name: string
          description?: string | null
          assumptions: Json
          results?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          model_id?: string
          user_id?: string
          name?: string
          description?: string | null
          assumptions?: Json
          results?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scenarios_project_id_fkey"
            columns: ["project_id"]
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenarios_model_id_fkey"
            columns: ["model_id"]
            referencedRelation: "financial_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenarios_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      project_shares: {
        Row: {
          id: string
          project_id: string
          owner_id: string
          shared_with_email: string
          shared_with_id: string | null
          permission: string
          last_accessed: string | null
          is_active: boolean
          created_at: string
          expires_at: string | null
          status: string
        }
        Insert: {
          id?: string
          project_id: string
          owner_id: string
          shared_with_email: string
          shared_with_id?: string | null
          permission?: string
          last_accessed?: string | null
          is_active?: boolean
          created_at?: string
          expires_at?: string | null
          status?: string
        }
        Update: {
          id?: string
          project_id?: string
          owner_id?: string
          shared_with_email?: string
          shared_with_id?: string | null
          permission?: string
          last_accessed?: string | null
          is_active?: boolean
          created_at?: string
          expires_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_shares_project_id_fkey"
            columns: ["project_id"]
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_shares_owner_id_fkey"
            columns: ["owner_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_shares_shared_with_id_fkey"
            columns: ["shared_with_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      presence: {
        Row: {
          id: string
          user_id: string
          project_id: string | null
          model_id: string | null
          status: string
          current_page: string | null
          cursor_position: Json | null
          last_seen: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          project_id?: string | null
          model_id?: string | null
          status?: string
          current_page?: string | null
          cursor_position?: Json | null
          last_seen?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          project_id?: string | null
          model_id?: string | null
          status?: string
          current_page?: string | null
          cursor_position?: Json | null
          last_seen?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "presence_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presence_project_id_fkey"
            columns: ["project_id"]
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presence_model_id_fkey"
            columns: ["model_id"]
            referencedRelation: "financial_models"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      project_summaries: {
        Row: {
          id: string
          name: string
          description: string | null
          product_type: string
          is_public: boolean
          created_at: string
          updated_at: string
          model_count: number
          performance_entries_count: number
          risk_count: number
          share_count: number
        }
        Relationships: []
      }
      model_performance: {
        Row: {
          id: string
          name: string
          project_id: string
          assumptions: Json
          results_cache: Json
          created_at: string
          updated_at: string
          scenario_count: number
        }
        Relationships: []
      }
    }
    Functions: {
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
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
