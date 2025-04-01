import { FinancialModel } from "@/lib/db";

// Define interfaces for our data objects
export interface RevenueData {
  name: string;
  value: number;
  percentage?: number;
  nameAndPercentage?: string; // Used for Pie Chart legend
}

export interface CostData {
  name: string;
  value: number;
  type: string; // e.g., "Fixed", "Variable"
  percentage?: number;
  nameAndPercentage?: string; // Add field for legend
}

export interface TypeCategoryData {
  name: string; // e.g., "Fixed Costs"
  value: number;
}

// Prepare Revenue Breakdown Data for a SPECIFIC week's data point
export const prepareRevenueDataForWeek = (weekDataPoint: any | null): RevenueData[] => {
  if (!weekDataPoint) return [];

  const revenueStreams: RevenueData[] = [];
  let totalWeeklyRevenue = weekDataPoint.revenue || 0; // Get total revenue for this week

  // Extract individual revenue stream values from the data point
  // Assumes keys match original revenue stream names (e.g., 'Ticket Sales')
  // or their safeName versions (e.g., 'TicketSales')
  for (const key in weekDataPoint) {
    if (key !== 'point' && key !== 'revenue' && key !== 'cumulativeRevenue' && 
        key !== 'costs' && key !== 'cumulativeCosts' && key !== 'attendance' && 
        !key.endsWith('Color')) { // Exclude known non-revenue keys
      // Attempt to map safeName back to original name if possible, or use key
      // This part might need refinement depending on exact keys in weekDataPoint
      const name = key.replace(/([A-Z])/g, ' $1').trim(); // Simple split for potential safeName
      revenueStreams.push({ name: name, value: weekDataPoint[key] });
    }
  }

  // Calculate percentage based on this week's total revenue
  revenueStreams.forEach(item => {
    const percentage = totalWeeklyRevenue > 0 ? Math.round((item.value / totalWeeklyRevenue) * 100) : 0;
    item.percentage = percentage;
    item.nameAndPercentage = `${item.name} (${percentage}%)`; 
  });

  return revenueStreams.sort((a, b) => b.value - a.value);
};

// Prepare Cost Breakdown Data for a SPECIFIC week's data point
export const prepareCostDataForWeek = (weekDataPoint: any | null, model: FinancialModel): CostData[] => {
  if (!weekDataPoint) return [];

  const costItems: CostData[] = [];
  let totalWeeklyCosts = weekDataPoint.costs || 0; // Get total cost for this week

  // Map base costs to their calculated values for the week
  model.assumptions.costs.forEach(baseCost => {
    const safeName = baseCost.name.replace(/[^a-zA-Z0-9]/g, "");
    const weeklyValue = weekDataPoint[safeName] || 0; // Get calculated value for this week
    const costType = baseCost.type?.toLowerCase() || "recurring";
    
    costItems.push({
      name: baseCost.name,
      value: weeklyValue,
      type: costType.charAt(0).toUpperCase() + costType.slice(1),
    });
  });

  // Calculate percentage based on this week's total cost
  costItems.forEach(item => {
    const percentage = totalWeeklyCosts > 0 ? Math.round((item.value / totalWeeklyCosts) * 100) : 0;
    item.percentage = percentage;
    item.nameAndPercentage = `${item.name} (${percentage}%)`; 
  });

  return costItems.sort((a, b) => b.value - a.value);
};

// Prepare Cost Data Categorized by Type for a SPECIFIC week's data point
export const prepareTypeCategorizedDataForWeek = (weekDataPoint: any | null, model: FinancialModel): TypeCategoryData[] => {
  if (!weekDataPoint) return [];

  const typeCategories: Record<string, TypeCategoryData> = {
    fixed: { name: "Fixed Costs", value: 0 },
    variable: { name: "Variable Costs", value: 0 },
    recurring: { name: "Recurring Costs", value: 0 }
  };

  // Sum weekly values by type
  model.assumptions.costs.forEach(baseCost => {
    const safeName = baseCost.name.replace(/[^a-zA-Z0-9]/g, "");
    const weeklyValue = weekDataPoint[safeName] || 0;
    const costType = (baseCost.type || "recurring").toLowerCase();

    if (typeCategories[costType]) {
      typeCategories[costType].value += weeklyValue;
    }
  });

  return Object.values(typeCategories).filter(category => category.value > 0);
};

// --- Remove or comment out old aggregate functions --- 
/*
export const prepareRevenueData = (model: FinancialModel): RevenueData[] => { ... };
export const prepareCostData = (model: FinancialModel): CostData[] => { ... };
export const prepareTypeCategorizedData = (model: FinancialModel): TypeCategoryData[] => { ... };
*/ 