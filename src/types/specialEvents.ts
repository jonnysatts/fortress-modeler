// Special Events Type Definitions
// Updated to use products-based schema as per SPECIAL_EVENTS_IMPLEMENTATION_PLAN.md

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

export interface SpecialEventForecast {
  id?: string;
  productId: string;
  forecastDate: string;
  revenueTickets: number;
  revenueFnB: number;
  revenueMerchandise: number;
  revenueSponsorship: number;
  costStaffing: number;
  costVenue: number;
  costVendors: number;
  costMarketing: number;
  costProduction: number;
  costOther: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SpecialEventActual {
  id?: string;
  productId: string;
  actualDate: string;
  actualRevenueTickets: number;
  actualRevenueFnB: number;
  actualRevenueMerchandise: number;
  actualRevenueSponsorship: number;
  actualCostStaffing: number;
  actualCostVenue: number;
  actualCostVendors: number;
  actualCostMarketing: number;
  actualCostProduction: number;
  actualCostOther: number;
  actualAttendance: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
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
  forecastTickets?: number;
  forecastFnB?: number;
  forecastMerchandise?: number;
  forecastSponsorship?: number;
  totalForecastRevenue?: number;
  totalForecastCosts?: number;
  actualTickets?: number;
  actualFnB?: number;
  actualMerchandise?: number;
  actualSponsorship?: number;
  totalActualRevenue?: number;
  totalActualCosts?: number;
  actualAttendance?: number;
  actualNotes?: string;
  createdAt: string;
  updatedAt: string;
}

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
  // Basic revenue fields
  revenueTickets: number;
  revenueFnB: number;
  revenueMerchandise: number;
  revenueSponsorship: number;
  revenueOther?: number;
  
  // Cost breakdown fields
  costStaffing: number;
  costVenue: number;
  costVendors: number;
  costMarketing: number;
  costProduction: number;
  costOther: number;
  
  // Enhanced marketing fields
  marketingEmailBudget?: number;
  marketingSocialBudget?: number;
  marketingInfluencerBudget?: number;
  marketingPaidAdsBudget?: number;
  marketingContentBudget?: number;
  marketingStrategy?: string;
  
  // Event details
  estimatedAttendance?: number;
  ticketPrice?: number;
  
  // Notes fields
  revenueNotes?: string;
  costNotes?: string;
  marketingNotes?: string;
  generalNotes?: string;
}

export interface SpecialEventActualFormData {
  actualRevenueTickets: number;
  actualRevenueFnB: number;
  actualRevenueMerchandise: number;
  actualRevenueSponsorship: number;
  actualCostStaffing: number;
  actualCostVenue: number;
  actualCostVendors: number;
  actualCostMarketing: number;
  actualCostProduction: number;
  actualCostOther: number;
  actualAttendance: number;
  notes?: string;
}

export interface EventVariance {
  revenueVariance: number;
  costVariance: number;
  profitVariance: number;
  revenueVariancePercent: number;
  costVariancePercent: number;
  profitVariancePercent: number;
}

export interface SpecialEventWithVariance extends SpecialEventSummary {
  variance: EventVariance;
}

// Validation schemas for forms
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
  revenueTickets: { min: 0 },
  revenueFnB: { min: 0 },
  revenueMerchandise: { min: 0 },
  revenueSponsorship: { min: 0 },
  costStaffing: { min: 0 },
  costVenue: { min: 0 },
  costVendors: { min: 0 },
  costMarketing: { min: 0 },
  costProduction: { min: 0 },
  costOther: { min: 0 }
};

// API Response types
export interface SpecialEventApiResponse {
  data: SpecialEvent;
  forecast?: SpecialEventForecast;
  actual?: SpecialEventActual;
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
  revenueTickets?: string;
  revenueFnB?: string;
  revenueMerchandise?: string;
  revenueSponsorship?: string;
  costStaffing?: string;
  costVenue?: string;
  costVendors?: string;
  costMarketing?: string;
  costProduction?: string;
  costOther?: string;
}

// Utility types
export type SpecialEventStatus = 'draft' | 'forecasted' | 'completed' | 'cancelled';
export type SpecialEventSortField = 'name' | 'eventStartDate' | 'totalForecastRevenue' | 'totalActualRevenue';
export type SpecialEventSortOrder = 'asc' | 'desc';
