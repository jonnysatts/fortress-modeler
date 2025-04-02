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
  type: string;
  rate: number;
  seasonalFactors?: number[];
  individualRates?: {
    [key: string]: number;
  };
}

export interface ModelMetadata {
  type?: string;
  weeks?: number;
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
  id?: string | number;
  name: string;
  description?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  assumptions: ModelAssumptions;
}

// --- NEW: Actuals Data Interface ---
export interface ActualsPeriodEntry {
  id?: number; // Auto-incrementing primary key from Dexie
  projectId: number; // Changed from modelId to projectId
  period: number; // Week or Month number
  periodType: 'Week' | 'Month'; // Type of period
  // Use Record<string, number> for flexibility
  revenueActuals: Record<string, number>; 
  costActuals: Record<string, number>; 
  attendanceActual?: number; // NEW: Actual attendance for the period
  notes?: string;
}
// --- End NEW --- 