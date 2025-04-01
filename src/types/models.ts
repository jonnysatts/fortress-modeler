export interface Model {
  id?: string | number;
  name: string;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
  assumptions: {
    metadata?: {
      weeks?: number;
      initialWeeklyAttendance?: number;
      growth?: {
        attendanceGrowthRate?: number;
        useCustomerSpendGrowth?: boolean;
        fbSpendGrowth?: number;
        merchandiseSpendGrowth?: number;
      };
      perCustomer?: {
        fbSpend?: number;
        merchandiseSpend?: number;
      };
      costs?: {
        fbCOGSPercent?: number;
        staffCount?: number;
        staffCostPerPerson?: number;
      };
    };
    revenue: Array<{
      name: string;
      value: number;
      type?: string;
    }>;
    costs: Array<{
      name: string;
      value: number;
      type?: string;
    }>;
  };
} 