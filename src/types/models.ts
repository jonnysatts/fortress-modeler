export interface RevenueStream {
  name: string;
  value: number;
  type: 'fixed' | 'variable' | 'recurring';
  frequency?: 'weekly' | 'monthly' | 'quarterly' | 'annually' | 'one-time';
}

export interface CostCategory {
  name: string;
  value: number;
  type: 'fixed' | 'variable' | 'recurring';
  category?: 'staffing' | 'marketing' | 'operations' | 'other';
}

export interface GrowthModel {
  type: 'linear' | 'exponential' | 'seasonal' | 'custom';
  rate: number;
  seasonalFactors?: number[];
  individualRates?: {
    [key: string]: number;
  };
}

export interface ModelMetadata {
  type?: 'WeeklyEvent' | 'SpecialEvent' | 'MonthlySubscription' | 'OneTime' | 'Custom';
  weeks?: number;
  months?: number;
  initialWeeklyAttendance?: number;
  perCustomer?: {
    ticketPrice?: number;
    fbSpend?: number;
    merchandiseSpend?: number;
    onlineSpend?: number;
    miscSpend?: number;
  };
  growth?: {
    attendanceGrowthRate: number;
    useCustomerSpendGrowth?: boolean;
    ticketPriceGrowth?: number;
    fbSpendGrowth?: number;
    merchandiseSpendGrowth?: number;
    onlineSpendGrowth?: number;
    miscSpendGrowth?: number;
  };
  costs?: {
    fbCOGSPercent?: number;
    merchandiseCOGSPercent?: number;
    staffCount?: number;
    staffCostPerPerson?: number;
    managementCosts?: number;
  };
}

export interface MarketingChannelItem {
  id: string;
  channelType: string;
  name: string;
  weeklyBudget: number;
  targetAudience: string;
  description: string;
}

export interface MarketingSetup {
  allocationMode: 'channels' | 'highLevel';
  channels: MarketingChannelItem[];
  totalBudget?: number;
  budgetApplication?: 'upfront' | 'spreadEvenly' | 'spreadCustom';
  spreadDuration?: number;
}

export interface ModelAssumptions {
  metadata?: ModelMetadata;
  revenue: RevenueStream[];
  costs: CostCategory[];
  growthModel: GrowthModel;
  marketing?: MarketingSetup;
}

export interface Model {
  id: string; // UUID primary key
  name: string;
  description?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  assumptions: ModelAssumptions;
}

// --- NEW: Actuals Data Interface ---
export interface ActualsPeriodEntry {
  id: string; // UUID primary key
  projectId: string; // Project UUID reference
  period: number; // Week or Month number
  periodType: 'Week' | 'Month'; // Type of period
  // Use Record<string, number> for flexibility
  revenueActuals: Record<string, number>; 
  costActuals: Record<string, number>; 
  attendanceActual?: number; // NEW: Actual attendance for the period
  notes?: string;
  useFbCogsPercentage?: boolean; // NEW: Whether to use model percentage for F&B COGS
  useMerchandiseCogsPercentage?: boolean; // NEW: Whether to use model percentage for Merchandise COGS
  useMarketingPlan?: boolean; // NEW: Whether to use planned marketing spend from model
}
// --- End NEW ---

// --- SPECIAL EVENTS: Current Database Schema Types ---

export type EventType = 'weekly' | 'special';

export interface SpecialEventForecast {
  id: string;
  project_id: string;
  
  // Revenue streams
  forecast_ticket_sales?: number;
  forecast_fnb_revenue?: number;
  forecast_fnb_cogs_pct?: number;
  forecast_merch_revenue?: number;
  forecast_merch_cogs_pct?: number;
  forecast_sponsorship_income?: number;
  forecast_other_income?: number;
  
  // Cost breakdown
  forecast_staffing_costs?: number;
  forecast_venue_costs?: number;
  forecast_vendor_costs?: number;
  forecast_marketing_costs?: number;
  forecast_production_costs?: number;
  forecast_other_costs?: number;
  
  // Marketing details
  marketing_email_budget?: number;
  marketing_social_budget?: number;
  marketing_influencer_budget?: number;
  marketing_paid_ads_budget?: number;
  marketing_content_budget?: number;
  marketing_strategy?: string;
  
  // Event details
  estimated_attendance?: number;
  ticket_price?: number;
  
  // Notes
  revenue_notes?: string;
  cost_notes?: string;
  marketing_notes?: string;
  general_notes?: string;
  
  // Legacy fields (for backward compatibility)
  forecast_total_costs?: number;
  notes?: string;
  
  created_at: string;
}

export interface SpecialEventActual {
  id: string;
  project_id: string;
  
  // Actual revenue streams
  actual_ticket_sales?: number;
  actual_fnb_revenue?: number;
  actual_fnb_cogs?: number;
  actual_merch_revenue?: number;
  actual_merch_cogs?: number;
  actual_sponsorship_income?: number;
  actual_other_income?: number;
  
  // Actual cost breakdown
  actual_staffing_costs?: number;
  actual_venue_costs?: number;
  actual_vendor_costs?: number;
  actual_marketing_costs?: number;
  actual_production_costs?: number;
  actual_other_costs?: number;
  
  // Marketing performance
  marketing_email_performance?: string;
  marketing_social_performance?: string;
  marketing_influencer_performance?: string;
  marketing_paid_ads_performance?: string;
  marketing_content_performance?: string;
  marketing_roi_notes?: string;
  
  // Event metrics
  actual_attendance?: number;
  attendance_breakdown?: string;
  average_ticket_price?: number;
  
  // Success indicators
  success_rating?: number;
  event_success_indicators?: string;
  challenges_faced?: string;
  lessons_learned?: string;
  recommendations_future?: string;
  
  // Post-event analysis
  customer_feedback_summary?: string;
  team_feedback?: string;
  vendor_feedback?: string;
  
  // Additional metrics
  social_media_engagement?: string;
  press_coverage?: string;
  brand_impact_assessment?: string;
  
  // Variance notes
  revenue_variance_notes?: string;
  cost_variance_notes?: string;
  general_notes?: string;
  
  // Legacy fields (for backward compatibility)
  actual_total_costs?: number;
  attendance?: number;
  notes?: string;
  
  created_at: string;
}

export interface SpecialEventMilestone {
  id: string;
  project_id: string;
  milestone_label?: string;
  target_date?: string;
  completed?: boolean;
  assignee?: string;
  notes?: string;
}

// --- End SPECIAL EVENTS ---
