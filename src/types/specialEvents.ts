// Special Events Type Definitions
// Enhanced with COGS standardization features matching Weekly Events sophistication

export type EventType = 'weekly' | 'special';

export interface SpecialEvent {
  id: string;
  name: string;
  description?: string;
  type: EventType;
  estimatedAttendance: number;
  venue: string;
  eventStartDate: string;
  eventEndDate: string;
  sponsorshipTarget?: number;
  eventScope?: string;
  createdAt: string;
  updatedAt: string;
}

// Enhanced Forecast interface with COGS standardization
export interface SpecialEventForecast {
  id?: string;
  project_id: string;
  
  // Revenue streams with COGS support
  forecast_ticket_sales?: number;
  forecast_fnb_revenue?: number;
  forecast_fnb_cogs_pct?: number;  // NEW: F&B COGS percentage (default 30%)
  use_automatic_fnb_cogs?: boolean; // NEW: Toggle for automatic F&B COGS
  calculated_fnb_cogs?: number;     // NEW: Calculated F&B COGS amount
  
  forecast_merch_revenue?: number;
  forecast_merch_cogs_pct?: number; // NEW: Merchandise COGS percentage (default 50%)
  use_automatic_merch_cogs?: boolean; // NEW: Toggle for automatic Merchandise COGS
  calculated_merch_cogs?: number;    // NEW: Calculated Merchandise COGS amount
  
  forecast_sponsorship_income?: number;
  forecast_other_income?: number;
  
  // Cost breakdown
  forecast_staffing_costs?: number;
  forecast_venue_costs?: number;
  forecast_vendor_costs?: number;
  forecast_marketing_costs?: number;
  forecast_production_costs?: number;
  forecast_other_costs?: number;
  
  // Enhanced marketing fields
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
  
  created_at?: Date;
  updated_at?: Date;
}

// Enhanced Actual interface with comprehensive tracking
export interface SpecialEventActual {
  id?: string;
  project_id: string;
  
  // Actual revenue streams with COGS tracking
  actual_ticket_sales?: number;
  actual_fnb_revenue?: number;
  actual_fnb_cogs?: number;        // Actual F&B COGS amount
  use_forecast_fnb_cogs_pct?: boolean; // Use forecast COGS % or manual override
  
  actual_merch_revenue?: number;
  actual_merch_cogs?: number;      // Actual Merchandise COGS amount
  use_forecast_merch_cogs_pct?: boolean; // Use forecast COGS % or manual override
  
  actual_sponsorship_income?: number;
  actual_other_income?: number;
  
  // Actual cost breakdown
  actual_staffing_costs?: number;
  actual_venue_costs?: number;
  actual_vendor_costs?: number;
  actual_marketing_costs?: number;
  actual_production_costs?: number;
  actual_other_costs?: number;
  
  // Enhanced metrics
  actual_attendance?: number;
  revenue_per_attendee?: number;   // NEW: Revenue per attendee
  cost_per_attendee?: number;      // NEW: Cost per attendee
  marketing_roi?: number;          // NEW: Marketing ROI percentage
  
  // Marketing performance tracking
  marketing_email_performance?: string;
  marketing_social_performance?: string;
  marketing_influencer_performance?: string;
  marketing_paid_ads_performance?: string;
  marketing_content_performance?: string;
  marketing_roi_notes?: string;
  
  // Event metrics
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
  
  // Variance analysis notes
  revenue_variance_notes?: string;
  cost_variance_notes?: string;
  general_notes?: string;
  
  created_at?: Date;
  updated_at?: Date;
}

export interface SpecialEventSummary {
  id: string;
  name: string;
  description?: string;
  type: EventType;
  estimatedAttendance: number;
  venue: string;
  eventStartDate: string;
  eventEndDate: string;
  sponsorshipTarget?: number;
  eventScope?: string;
  
  // Forecast data
  forecastTickets?: number;
  forecastFnB?: number;
  forecastMerchandise?: number;
  forecastSponsorship?: number;
  totalForecastRevenue?: number;
  totalForecastCosts?: number;
  forecastFnBCogs?: number;        // NEW: Forecast F&B COGS
  forecastMerchCogs?: number;      // NEW: Forecast Merchandise COGS
  
  // Actual data
  actualTickets?: number;
  actualFnB?: number;
  actualMerchandise?: number;
  actualSponsorship?: number;
  totalActualRevenue?: number;
  totalActualCosts?: number;
  actualFnBCogs?: number;          // NEW: Actual F&B COGS
  actualMerchCogs?: number;        // NEW: Actual Merchandise COGS
  actualAttendance?: number;
  
  // Enhanced metrics
  revenuePerAttendee?: number;     // NEW
  costPerAttendee?: number;        // NEW
  marketingROI?: number;           // NEW
  grossMarginFnB?: number;         // NEW: F&B gross margin %
  grossMarginMerch?: number;       // NEW: Merchandise gross margin %
  
  actualNotes?: string;
  createdAt: string;
  updatedAt: string;
}

// Enhanced form data interfaces
export interface SpecialEventFormData {
  name: string;
  description?: string;
  estimatedAttendance: number;
  venue: string;
  eventStartDate: string;
  eventEndDate: string;
  sponsorshipTarget?: number;
  eventScope?: string;
}

export interface SpecialEventForecastFormData {
  // Revenue streams with COGS
  forecast_ticket_sales?: number;
  forecast_fnb_revenue?: number;
  forecast_fnb_cogs_pct?: number;
  use_automatic_fnb_cogs?: boolean;
  
  forecast_merch_revenue?: number;
  forecast_merch_cogs_pct?: number;
  use_automatic_merch_cogs?: boolean;
  
  forecast_sponsorship_income?: number;
  forecast_other_income?: number;
  
  // Cost breakdown
  forecast_staffing_costs?: number;
  forecast_venue_costs?: number;
  forecast_vendor_costs?: number;
  forecast_marketing_costs?: number;
  forecast_production_costs?: number;
  forecast_other_costs?: number;
  
  // Enhanced marketing fields
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
}

export interface SpecialEventActualFormData {
  // Actual revenue with COGS tracking
  actual_ticket_sales?: number;
  actual_fnb_revenue?: number;
  actual_fnb_cogs?: number;
  use_forecast_fnb_cogs_pct?: boolean;
  
  actual_merch_revenue?: number;
  actual_merch_cogs?: number;
  use_forecast_merch_cogs_pct?: boolean;
  
  actual_sponsorship_income?: number;
  actual_other_income?: number;
  
  // Actual costs
  actual_staffing_costs?: number;
  actual_venue_costs?: number;
  actual_vendor_costs?: number;
  actual_marketing_costs?: number;
  actual_production_costs?: number;
  actual_other_costs?: number;
  
  // Event metrics
  actual_attendance?: number;
  success_rating?: number;
  
  // Notes and feedback
  event_success_indicators?: string;
  challenges_faced?: string;
  lessons_learned?: string;
  recommendations_future?: string;
  customer_feedback_summary?: string;
  general_notes?: string;
}

// Enhanced variance interface
export interface EventVariance {
  revenueVariance: number;
  costVariance: number;
  profitVariance: number;
  revenueVariancePercent: number;
  costVariancePercent: number;
  profitVariancePercent: number;
  
  // NEW: COGS variance tracking
  fnbCogsVariance?: number;
  fnbCogsVariancePercent?: number;
  merchCogsVariance?: number;
  merchCogsVariancePercent?: number;
  
  // NEW: Efficiency metrics variance
  revenuePerAttendeeVariance?: number;
  costPerAttendeeVariance?: number;
  attendanceVariance?: number;
  attendanceVariancePercent?: number;
}

export interface SpecialEventWithVariance extends SpecialEventSummary {
  variance: EventVariance;
}

// COGS calculation interfaces
export interface COGSCalculation {
  revenue: number;
  cogsPercentage: number;
  cogsAmount: number;
  grossProfit: number;
  grossMarginPercent: number;
}

export interface COGSValidation {
  isValid: boolean;
  warnings: string[];
  recommendations: string[];
}

// Enhanced metrics interface
export interface SpecialEventMetrics {
  // Financial metrics
  totalRevenue: number;
  totalCosts: number;
  totalCOGS: number;
  grossProfit: number;
  netProfit: number;
  grossMarginPercent: number;
  netMarginPercent: number;
  
  // Per-attendee metrics
  revenuePerAttendee: number;
  costPerAttendee: number;
  profitPerAttendee: number;
  
  // COGS breakdown
  fnbCOGS: number;
  merchCOGS: number;
  fnbGrossMargin: number;
  merchGrossMargin: number;
  
  // Marketing efficiency
  marketingROI: number;
  customerAcquisitionCost: number;
  marketingCostPerAttendee: number;
  
  // Performance indicators
  attendanceConversionRate?: number;
  averageRevenuePerCustomer: number;
  repeatCustomerRate?: number;
}

// Validation schemas
export const specialEventSchema = {
  name: { required: true, minLength: 3, maxLength: 100 },
  description: { maxLength: 500 },
  estimatedAttendance: { required: true, min: 1, max: 100000 },
  venue: { required: true, minLength: 2, maxLength: 100 },
  eventStartDate: { required: true },
  eventEndDate: { required: true },
  sponsorshipTarget: { min: 0 },
  eventScope: { maxLength: 1000 }
};

export const specialEventForecastSchema = {
  forecast_ticket_sales: { min: 0 },
  forecast_fnb_revenue: { min: 0 },
  forecast_fnb_cogs_pct: { min: 0, max: 100 },
  forecast_merch_revenue: { min: 0 },
  forecast_merch_cogs_pct: { min: 0, max: 100 },
  forecast_sponsorship_income: { min: 0 },
  forecast_other_income: { min: 0 },
  forecast_staffing_costs: { min: 0 },
  forecast_venue_costs: { min: 0 },
  forecast_vendor_costs: { min: 0 },
  forecast_marketing_costs: { min: 0 },
  forecast_production_costs: { min: 0 },
  forecast_other_costs: { min: 0 },
  estimated_attendance: { min: 1 },
  ticket_price: { min: 0 }
};

// API Response types
export interface SpecialEventApiResponse {
  data: SpecialEvent;
  forecast?: SpecialEventForecast;
  actual?: SpecialEventActual;
  metrics?: SpecialEventMetrics;
  variance?: EventVariance;
}

export interface SpecialEventsListResponse {
  data: SpecialEventSummary[];
  total: number;
}

// Form validation types
export interface SpecialEventValidationErrors {
  name?: string;
  description?: string;
  estimatedAttendance?: string;
  venue?: string;
  eventStartDate?: string;
  eventEndDate?: string;
  sponsorshipTarget?: string;
  eventScope?: string;
}

export interface SpecialEventForecastValidationErrors {
  forecast_ticket_sales?: string;
  forecast_fnb_revenue?: string;
  forecast_fnb_cogs_pct?: string;
  forecast_merch_revenue?: string;
  forecast_merch_cogs_pct?: string;
  forecast_sponsorship_income?: string;
  forecast_staffing_costs?: string;
  forecast_venue_costs?: string;
  forecast_vendor_costs?: string;
  forecast_marketing_costs?: string;
  forecast_production_costs?: string;
  forecast_other_costs?: string;
}

// Utility types
export type SpecialEventStatus = 'draft' | 'forecasted' | 'completed' | 'cancelled';
export type SpecialEventSortField = 'name' | 'eventStartDate' | 'totalForecastRevenue' | 'totalActualRevenue' | 'netProfit';
export type SpecialEventSortOrder = 'asc' | 'desc';

// COGS Constants
export const COGS_DEFAULTS = {
  FNB_PERCENTAGE: 30,
  MERCHANDISE_PERCENTAGE: 50,
  VALIDATION_RANGES: {
    FNB_MIN: 15,
    FNB_MAX: 60,
    MERCHANDISE_MIN: 25,
    MERCHANDISE_MAX: 75
  }
} as const;

// Migration support interfaces for backward compatibility
export interface LegacySpecialEventForecast {
  id?: string;
  productId?: string;  // Old field name
  project_id?: string; // New field name
  forecastDate?: string;
  revenueTickets?: number;
  revenueFnB?: number;
  revenueMerchandise?: number;
  revenueSponsorship?: number;
  costStaffing?: number;
  costVenue?: number;
  costVendors?: number;
  costMarketing?: number;
  costProduction?: number;
  costOther?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface LegacySpecialEventActual {
  id?: string;
  productId?: string;  // Old field name
  project_id?: string; // New field name
  actualDate?: string;
  actualRevenueTickets?: number;
  actualRevenueFnB?: number;
  actualRevenueMerchandise?: number;
  actualRevenueSponsorship?: number;
  actualCostStaffing?: number;
  actualCostVenue?: number;
  actualCostVendors?: number;
  actualCostMarketing?: number;
  actualCostProduction?: number;
  actualCostOther?: number;
  actualAttendance?: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}