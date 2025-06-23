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
  console.log("[BreakdownCalc] Input weekDataPoint:", weekDataPoint); // Log the input

  const costItems: CostData[] = [];
  // Get total cost for this week BEFORE potentially adding marketing
  // Recalculate total AFTER adding all items for accurate percentage
  // let totalWeeklyCosts = weekDataPoint.costs || 0; 

  // Map base costs
  model.assumptions.costs.forEach(baseCost => {
    const safeName = baseCost.name.replace(/[^a-zA-Z0-9]/g, "");
    const weeklyValue = weekDataPoint[safeName] || 0; 
    const costType = baseCost.type?.toLowerCase() || "recurring";
    
    // Only add if value is > 0 for cleaner breakdown
    if (weeklyValue > 0) {
        costItems.push({
          name: baseCost.name,
          value: weeklyValue,
          type: costType.charAt(0).toUpperCase() + costType.slice(1),
        });
    }
  });

  // Add Marketing Budget if it exists and is > 0
  const marketingBudgetCost = weekDataPoint.MarketingBudget || 0;
  console.log(`[BreakdownCalc] Found MarketingBudget value: ${marketingBudgetCost}`); // Log detected value
  if (marketingBudgetCost > 0) {
      console.log("[BreakdownCalc] Adding Marketing Budget to costItems"); // Log if added
      costItems.push({
          name: "Marketing Budget",
          value: marketingBudgetCost,
          type: "Recurring", // Treat marketing budget as recurring for categorization
      });
  }

  // Calculate total cost *from the items we've included*
  const totalWeeklyCosts = costItems.reduce((sum, item) => sum + item.value, 0);

  // Calculate percentage based on the derived total weekly cost
  costItems.forEach(item => {
    const percentage = totalWeeklyCosts > 0 ? Math.round((item.value / totalWeeklyCosts) * 100) : 0;
    item.percentage = percentage;
    item.nameAndPercentage = `${item.name} (${percentage}%)`; 
  });

  console.log("[BreakdownCalc] Final costItems before return:", costItems); // Log final array
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

  // Sum base costs by type
  model.assumptions.costs.forEach(baseCost => {
    const safeName = baseCost.name.replace(/[^a-zA-Z0-9]/g, "");
    const weeklyValue = weekDataPoint[safeName] || 0;
    const costType = (baseCost.type || "recurring").toLowerCase();

    if (typeCategories[costType] && weeklyValue > 0) {
      typeCategories[costType].value += weeklyValue;
    }
  });

  // Add Marketing Budget to the appropriate category (Recurring)
  const marketingBudgetCost = weekDataPoint.MarketingBudget || 0;
  if (marketingBudgetCost > 0) {
      typeCategories.recurring.value += marketingBudgetCost;
  }

  return Object.values(typeCategories).filter(category => category.value > 0);
};

// --- Remove or comment out old aggregate functions --- 
/*
export const prepareRevenueData = (model: FinancialModel): RevenueData[] => { ... };
export const prepareCostData = (model: FinancialModel): CostData[] => { ... };
export const prepareTypeCategorizedData = (model: FinancialModel): TypeCategoryData[] => { ... };
*/ 
