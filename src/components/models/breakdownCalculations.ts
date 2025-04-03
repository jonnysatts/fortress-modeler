import { FinancialModel } from "@/lib/db";

// Re-use or define a compatible type for data points
// Assuming CostDataPoint from CostTrends.tsx is suitable or define similarly:
interface DataPoint {
  point: string;
  revenue?: number;
  cumulativeRevenue?: number;
  costs?: number;
  cumulativeCosts?: number;
  attendance?: number;
  [key: string]: string | number | undefined;
}

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
export const prepareRevenueDataForWeek = (weekDataPoint: DataPoint | null): RevenueData[] => {
  if (!weekDataPoint) return [];

  const revenueStreams: RevenueData[] = [];
  const totalWeeklyRevenue = weekDataPoint.revenue ?? 0;

  // Extract individual revenue stream values from the data point
  for (const key in weekDataPoint) {
    const value = weekDataPoint[key];
    if (typeof value === 'number' && 
        key !== 'point' && key !== 'revenue' && key !== 'cumulativeRevenue' && 
        key !== 'costs' && key !== 'cumulativeCosts' && key !== 'attendance') {
      const name = key.replace(/([A-Z])/g, ' $1').trim();
      revenueStreams.push({ name: name, value: value });
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
export const prepareCostDataForWeek = (weekDataPoint: DataPoint | null, model: FinancialModel): CostData[] => {
  if (!weekDataPoint) return [];
  console.log("[BreakdownCalc] Input weekDataPoint:", weekDataPoint); // Log the input

  const costItems: CostData[] = [];
  // Get total cost for this week BEFORE potentially adding marketing
  // Recalculate total AFTER adding all items for accurate percentage
  // let totalWeeklyCosts = weekDataPoint.costs || 0; 

  // Map base costs
  model.assumptions.costs.forEach(baseCost => {
    const safeName = baseCost.name.replace(/[^a-zA-Z0-9]/g, "");
    const weeklyValue = (weekDataPoint[safeName] as number) ?? 0; 
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
  const marketingBudgetCost = (weekDataPoint.MarketingBudget as number) ?? 0;
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
export const prepareTypeCategorizedDataForWeek = (weekDataPoint: DataPoint | null, model: FinancialModel): TypeCategoryData[] => {
  if (!weekDataPoint) return [];

  const typeCategories: Record<string, TypeCategoryData> = {
    fixed: { name: "Fixed Costs", value: 0 },
    variable: { name: "Variable Costs", value: 0 },
    recurring: { name: "Recurring Costs", value: 0 }
  };

  // Sum base costs by type
  model.assumptions.costs.forEach(baseCost => {
    const safeName = baseCost.name.replace(/[^a-zA-Z0-9]/g, "");
    const weeklyValue = (weekDataPoint[safeName] as number) ?? 0;
    const costType = (baseCost.type || "recurring").toLowerCase();

    if (typeCategories[costType] && weeklyValue > 0) {
      typeCategories[costType].value += weeklyValue;
    }
  });

  // Add Marketing Budget to the appropriate category (Recurring)
  const marketingBudgetCost = (weekDataPoint.MarketingBudget as number) ?? 0;
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