export interface RevenueStream {
  name: string;
  value: number;
  type?: string;
}

export interface CostCategory {
  name: string;
  value: number;
  type?: string;
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

export interface ModelAssumptions {
  metadata?: ModelMetadata;
  revenue: RevenueStream[];
  costs: CostCategory[];
  growthModel: {
    type: string;
    rate: number;
  };
}

export interface Model {
  id?: string | number;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  assumptions: ModelAssumptions;
} 