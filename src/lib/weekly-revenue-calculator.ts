/**
 * Weekly Revenue Calculator Utility
 * Consolidates revenue calculation logic for weekly event models
 */

export interface PerCustomerRevenue {
  ticketPrice: number;
  fbSpend: number;
  merchandiseSpend: number;
  onlineSpend: number;
  miscSpend: number;
}

export interface WeeklyRevenueBreakdown {
  ticketSales: number;
  fbSales: number;
  merchandiseSales: number;
  onlineSales: number;
  miscRevenue: number;
  total: number;
}

/**
 * Calculate weekly revenue breakdown based on attendance and per-customer spending
 */
export function calculateWeeklyRevenue(
  attendance: number,
  perCustomer: PerCustomerRevenue
): WeeklyRevenueBreakdown {
  const ticketSales = attendance * perCustomer.ticketPrice;
  const fbSales = attendance * perCustomer.fbSpend;
  const merchandiseSales = attendance * perCustomer.merchandiseSpend;
  const onlineSales = attendance * perCustomer.onlineSpend;
  const miscRevenue = attendance * perCustomer.miscSpend;

  return {
    ticketSales,
    fbSales,
    merchandiseSales,
    onlineSales,
    miscRevenue,
    total: ticketSales + fbSales + merchandiseSales + onlineSales + miscRevenue,
  };
}

/**
 * Calculate F&B Cost of Goods Sold based on F&B sales and COGS percentage
 */
export function calculateFbCOGS(fbSales: number, cogsPercentage: number): number {
  return (fbSales * cogsPercentage) / 100;
}

/**
 * Convert weekly revenue breakdown to revenue assumptions for financial model
 */
export function weeklyRevenueToAssumptions(revenue: WeeklyRevenueBreakdown) {
  return [
    { 
      name: "Ticket Sales", 
      value: revenue.ticketSales, 
      type: "recurring" as const, 
      frequency: "weekly" as const 
    },
    { 
      name: "F&B Sales", 
      value: revenue.fbSales, 
      type: "recurring" as const, 
      frequency: "weekly" as const 
    },
    { 
      name: "Merchandise Sales", 
      value: revenue.merchandiseSales, 
      type: "recurring" as const, 
      frequency: "weekly" as const 
    },
    { 
      name: "Online Sales", 
      value: revenue.onlineSales, 
      type: "recurring" as const, 
      frequency: "weekly" as const 
    },
    { 
      name: "Miscellaneous Revenue", 
      value: revenue.miscRevenue, 
      type: "recurring" as const, 
      frequency: "weekly" as const 
    },
  ];
}

/**
 * Calculate projected revenue for multiple weeks with growth
 */
export function calculateProjectedRevenue(
  baseRevenue: WeeklyRevenueBreakdown,
  weeks: number,
  weeklyGrowthRate: number = 0
): WeeklyRevenueBreakdown[] {
  const projections: WeeklyRevenueBreakdown[] = [];

  for (let week = 0; week < weeks; week++) {
    const growthMultiplier = Math.pow(1 + weeklyGrowthRate, week);
    
    projections.push({
      ticketSales: baseRevenue.ticketSales * growthMultiplier,
      fbSales: baseRevenue.fbSales * growthMultiplier,
      merchandiseSales: baseRevenue.merchandiseSales * growthMultiplier,
      onlineSales: baseRevenue.onlineSales * growthMultiplier,
      miscRevenue: baseRevenue.miscRevenue * growthMultiplier,
      total: baseRevenue.total * growthMultiplier,
    });
  }

  return projections;
}