import { FinancialModel } from './db'; // Adjust import path if necessary

// Calculate total revenue for a weekly event model over its duration, including growth
export const calculateTotalRevenue = (model: FinancialModel): number => {
  try {
    if (model.assumptions.metadata?.type !== "WeeklyEvent" || !model.assumptions.metadata) return 0;

    const metadata = model.assumptions.metadata;
    const weeks = metadata.weeks || 12;
    const initialRevenue = model.assumptions.revenue.reduce((sum, item) => sum + item.value, 0);
    let totalRevenue = 0;

    for (let week = 0; week < weeks; week++) {
      const growthFactor = Math.pow(1 + (model.assumptions.growthModel.rate || 0), week);
      totalRevenue += initialRevenue * growthFactor;
    }

    return Math.round(totalRevenue);
  } catch (error) {
    console.error("Error calculating total revenue:", error);
    return 0;
  }
};

// Calculate total costs for a weekly event model over its duration, handling different cost types and growth
export const calculateTotalCosts = (model: FinancialModel): number => {
  try {
    if (model.assumptions.metadata?.type !== "WeeklyEvent" || !model.assumptions.metadata) return 0;

    const metadata = model.assumptions.metadata;
    const weeks = metadata.weeks || 12;
    if (weeks <= 0) return 0; // Avoid division by zero

    // Separate costs: Setup, Other Fixed, Recurring/Variable
    const setupCostItem = model.assumptions.costs.find(cost => cost.name === "Setup Costs");
    const setupCostValue = setupCostItem?.value || 0;
    const isSetupCostFixed = setupCostItem?.type === 'fixed'; // True if fixed, false if recurring (spread) or not found

    const otherFixedCosts = model.assumptions.costs
      .filter(cost => cost.type?.toLowerCase() === "fixed" && cost.name !== "Setup Costs")
      .reduce((sum, cost) => sum + cost.value, 0);

    const recurringAndVariableCostsList = model.assumptions.costs
      .filter(cost => cost.type?.toLowerCase() !== "fixed" && cost.name !== "Setup Costs");

    let totalCosts = 0;

    // Add one-time costs (Other Fixed + Setup if Fixed)
    totalCosts += otherFixedCosts;
    if (isSetupCostFixed) {
      totalCosts += setupCostValue;
    }

    // Calculate sum of weekly costs
    let totalWeeklyComponentCosts = 0;
    for (let week = 0; week < weeks; week++) {
      let currentWeekRecurringVariableCost = 0;
      recurringAndVariableCostsList.forEach(cost => {
        // Apply growth factor (example uses 70% of revenue growth rate for costs)
        // Note: This assumes a single growth rate applies to all recurring/variable costs. Refine if needed.
        const growthFactor = Math.pow(1 + ((model.assumptions.growthModel.rate || 0) * 0.7), week);
        currentWeekRecurringVariableCost += cost.value * growthFactor;
      });

      // Add recurring/variable costs for the week
      totalWeeklyComponentCosts += currentWeekRecurringVariableCost;

      // Add spread setup cost component for the week if applicable
      if (!isSetupCostFixed && setupCostItem) { // If setup cost exists and is recurring (spread)
        totalWeeklyComponentCosts += (setupCostValue / weeks);
      }
    }

    totalCosts += totalWeeklyComponentCosts;

    return Math.round(totalCosts);
  } catch (error) {
    console.error("Error calculating total costs:", error);
    return 0;
  }
}; 