import { FinancialModel, RevenueAssumption, CostAssumption } from './db';

export interface CashFlowPeriod {
  period: number;
  periodName: string;
  revenue: number;
  costs: number;
  netIncome: number;
  operatingCashFlow: number;
  investingCashFlow: number;
  financingCashFlow: number;
  netCashFlow: number;
  cumulativeCashFlow: number;
}

export interface FinancialMetrics {
  npv: number;
  irr: number;
  breakEvenUnits?: number;
  breakEvenRevenue?: number;
  paybackPeriod: number;
  roi: number;
  totalRevenue: number;
  totalCosts: number;
  totalProfit: number;
  profitMargin: number;
}

export interface ScenarioAnalysis {
  baseCase: FinancialMetrics;
  bestCase: FinancialMetrics;
  worstCase: FinancialMetrics;
  sensitivity: {
    revenueImpact: { change: number; npvChange: number }[];
    costImpact: { change: number; npvChange: number }[];
  };
}

// NPV Calculation
export const calculateNPV = (cashFlows: number[], discountRate: number): number => {
  return cashFlows.reduce((npv, cashFlow, period) => {
    return npv + cashFlow / Math.pow(1 + discountRate, period);
  }, 0);
};

// IRR Calculation using Newton-Raphson method
export const calculateIRR = (cashFlows: number[], guess: number = 0.1): number => {
  const maxIterations = 100;
  const tolerance = 1e-6;
  
  for (let i = 0; i < maxIterations; i++) {
    const npv = calculateNPV(cashFlows, guess);
    const derivative = cashFlows.reduce((sum, cashFlow, period) => {
      return sum - (period * cashFlow) / Math.pow(1 + guess, period + 1);
    }, 0);
    
    if (Math.abs(derivative) < tolerance) break;
    
    const newGuess = guess - npv / derivative;
    
    if (Math.abs(newGuess - guess) < tolerance) {
      return newGuess;
    }
    
    guess = newGuess;
  }
  
  return guess;
};

// Break-even Analysis
export const calculateBreakEven = (
  fixedCosts: number,
  variableCostPerUnit: number,
  pricePerUnit: number
): { units: number; revenue: number } => {
  const contributionMargin = pricePerUnit - variableCostPerUnit;
  
  if (contributionMargin <= 0) {
    return { units: Infinity, revenue: Infinity };
  }
  
  const breakEvenUnits = fixedCosts / contributionMargin;
  const breakEvenRevenue = breakEvenUnits * pricePerUnit;
  
  return {
    units: Math.ceil(breakEvenUnits),
    revenue: breakEvenRevenue,
  };
};

// Payback Period Calculation
export const calculatePaybackPeriod = (cashFlows: number[]): number => {
  let cumulativeCashFlow = 0;
  
  for (let period = 0; period < cashFlows.length; period++) {
    cumulativeCashFlow += cashFlows[period];
    
    if (cumulativeCashFlow >= 0) {
      // Linear interpolation for more accurate payback period
      const previousCumulative = cumulativeCashFlow - cashFlows[period];
      const fraction = Math.abs(previousCumulative) / cashFlows[period];
      return period + fraction;
    }
  }
  
  return cashFlows.length; // If never breaks even, return total periods
};

// Generate Cash Flow Projections
export const generateCashFlowProjections = (
  model: FinancialModel,
  periods: number = 36,
  isWeekly: boolean = false
): CashFlowPeriod[] => {
  const cashFlows: CashFlowPeriod[] = [];
  const periodUnit = isWeekly ? 'Week' : 'Month';
  
  for (let period = 1; period <= periods; period++) {
    const revenue = calculatePeriodRevenue(model, period, isWeekly);
    const costs = calculatePeriodCosts(model, period, isWeekly);
    const netIncome = revenue - costs;
    
    // Simplified cash flow assumptions
    const operatingCashFlow = netIncome * 0.9; // 90% of net income becomes operating cash flow
    const investingCashFlow = period === 1 ? -costs * 0.2 : 0; // Initial capital investment
    const financingCashFlow = period === 1 ? costs * 0.3 : 0; // Initial financing
    
    const netCashFlow = operatingCashFlow + investingCashFlow + financingCashFlow;
    const previousCumulative = period === 1 ? 0 : cashFlows[period - 2].cumulativeCashFlow;
    const cumulativeCashFlow = previousCumulative + netCashFlow;
    
    cashFlows.push({
      period,
      periodName: `${periodUnit} ${period}`,
      revenue,
      costs,
      netIncome,
      operatingCashFlow,
      investingCashFlow,
      financingCashFlow,
      netCashFlow,
      cumulativeCashFlow,
    });
  }
  
  return cashFlows;
};

// Calculate revenue for a specific period
const calculatePeriodRevenue = (model: FinancialModel, period: number, isWeekly: boolean): number => {
  if (!model.assumptions?.revenue) return 0;
  
  return model.assumptions.revenue.reduce((total, stream) => {
    const baseValue = stream.value;
    const growthFactor = calculateGrowthFactor(model, period, isWeekly);
    
    // Apply frequency adjustments
    let frequencyMultiplier = 1;
    if (stream.frequency) {
      const periodsPerYear = isWeekly ? 52 : 12;
      switch (stream.frequency) {
        case 'weekly':
          frequencyMultiplier = isWeekly ? 1 : 4.33; // ~4.33 weeks per month
          break;
        case 'monthly':
          frequencyMultiplier = isWeekly ? 0.23 : 1; // ~0.23 months per week
          break;
        case 'quarterly':
          frequencyMultiplier = isWeekly ? 0.077 : 0.33; // ~3 months per quarter
          break;
        case 'annually':
          frequencyMultiplier = 1 / periodsPerYear;
          break;
        case 'one-time':
          frequencyMultiplier = period === 1 ? 1 : 0;
          break;
      }
    }
    
    return total + (baseValue * growthFactor * frequencyMultiplier);
  }, 0);
};

// Calculate costs for a specific period
const calculatePeriodCosts = (model: FinancialModel, period: number, isWeekly: boolean): number => {
  if (!model.assumptions?.costs) return 0;
  
  return model.assumptions.costs.reduce((total, cost) => {
    const baseValue = cost.value;
    const growthFactor = calculateGrowthFactor(model, period, isWeekly, true);
    
    return total + (baseValue * growthFactor);
  }, 0);
};

// Calculate growth factor based on model assumptions
const calculateGrowthFactor = (
  model: FinancialModel,
  period: number,
  isWeekly: boolean,
  isCost: boolean = false
): number => {
  const growthModel = model.assumptions?.growthModel;
  if (!growthModel) return 1;
  
  const { type, rate = 0, seasonality } = growthModel;
  let factor = 1;
  
  // Base growth calculation
  switch (type) {
    case 'linear':
      factor = 1 + (rate * period);
      break;
    case 'exponential':
      factor = Math.pow(1 + rate, period);
      break;
    case 'logarithmic':
      factor = 1 + rate * Math.log(period + 1);
      break;
    default:
      factor = 1;
  }
  
  // Apply seasonality if defined
  if (seasonality && Array.isArray(seasonality)) {
    const seasonIndex = isWeekly 
      ? Math.floor((period - 1) / 13) % 4 // 13 weeks per season
      : (period - 1) % 12; // Monthly seasonality
    
    const seasonalMultiplier = seasonality[seasonIndex] || 1;
    factor *= seasonalMultiplier;
  }
  
  // Costs typically grow slower than revenue
  if (isCost && factor > 1) {
    factor = 1 + (factor - 1) * 0.7; // Reduce cost growth by 30%
  }
  
  return Math.max(factor, 0.1); // Minimum 10% of original value
};

// Comprehensive Financial Analysis
export const performFinancialAnalysis = (
  model: FinancialModel,
  periods: number = 36,
  discountRate: number = 0.1,
  isWeekly: boolean = false
): FinancialMetrics => {
  const cashFlows = generateCashFlowProjections(model, periods, isWeekly);
  const netCashFlows = cashFlows.map(cf => cf.netCashFlow);
  
  // Add initial investment as negative cash flow
  const initialInvestment = -Math.abs(cashFlows[0]?.investingCashFlow || 0);
  const allCashFlows = [initialInvestment, ...netCashFlows];
  
  const npv = calculateNPV(allCashFlows, discountRate);
  const irr = calculateIRR(allCashFlows);
  const paybackPeriod = calculatePaybackPeriod(allCashFlows);
  
  const totalRevenue = cashFlows.reduce((sum, cf) => sum + cf.revenue, 0);
  const totalCosts = cashFlows.reduce((sum, cf) => sum + cf.costs, 0);
  const totalProfit = totalRevenue - totalCosts;
  const profitMargin = totalRevenue > 0 ? totalProfit / totalRevenue : 0;
  const roi = Math.abs(initialInvestment) > 0 ? totalProfit / Math.abs(initialInvestment) : 0;
  
  // Break-even analysis (simplified)
  const avgRevenue = totalRevenue / periods;
  const avgCosts = totalCosts / periods;
  const fixedCosts = avgCosts * 0.4; // Assume 40% fixed costs
  const variableCostRatio = 0.6; // 60% variable costs
  const avgPrice = avgRevenue / 100; // Assume 100 units per period
  const variableCostPerUnit = (avgCosts * variableCostRatio) / 100;
  
  const breakEven = calculateBreakEven(fixedCosts, variableCostPerUnit, avgPrice);
  
  return {
    npv,
    irr: irr * 100, // Convert to percentage
    breakEvenUnits: isFinite(breakEven.units) ? breakEven.units : undefined,
    breakEvenRevenue: isFinite(breakEven.revenue) ? breakEven.revenue : undefined,
    paybackPeriod,
    roi: roi * 100, // Convert to percentage
    totalRevenue,
    totalCosts,
    totalProfit,
    profitMargin: profitMargin * 100, // Convert to percentage
  };
};

// Scenario Analysis
export const performScenarioAnalysis = (
  model: FinancialModel,
  periods: number = 36,
  discountRate: number = 0.1,
  isWeekly: boolean = false
): ScenarioAnalysis => {
  // Base case
  const baseCase = performFinancialAnalysis(model, periods, discountRate, isWeekly);
  
  // Create optimistic scenario (20% higher revenue, 10% lower costs)
  const optimisticModel = {
    ...model,
    assumptions: {
      ...model.assumptions,
      revenue: model.assumptions?.revenue?.map(r => ({ ...r, value: r.value * 1.2 })) || [],
      costs: model.assumptions?.costs?.map(c => ({ ...c, value: c.value * 0.9 })) || [],
    },
  };
  const bestCase = performFinancialAnalysis(optimisticModel, periods, discountRate, isWeekly);
  
  // Create pessimistic scenario (20% lower revenue, 15% higher costs)
  const pessimisticModel = {
    ...model,
    assumptions: {
      ...model.assumptions,
      revenue: model.assumptions?.revenue?.map(r => ({ ...r, value: r.value * 0.8 })) || [],
      costs: model.assumptions?.costs?.map(c => ({ ...c, value: c.value * 1.15 })) || [],
    },
  };
  const worstCase = performFinancialAnalysis(pessimisticModel, periods, discountRate, isWeekly);
  
  // Sensitivity analysis
  const revenueChanges = [-0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.3];
  const costChanges = [-0.2, -0.1, 0, 0.1, 0.2, 0.3];
  
  const revenueImpact = revenueChanges.map(change => {
    const testModel = {
      ...model,
      assumptions: {
        ...model.assumptions,
        revenue: model.assumptions?.revenue?.map(r => ({ ...r, value: r.value * (1 + change) })) || [],
      },
    };
    const metrics = performFinancialAnalysis(testModel, periods, discountRate, isWeekly);
    return {
      change: change * 100,
      npvChange: ((metrics.npv - baseCase.npv) / Math.abs(baseCase.npv)) * 100,
    };
  });
  
  const costImpact = costChanges.map(change => {
    const testModel = {
      ...model,
      assumptions: {
        ...model.assumptions,
        costs: model.assumptions?.costs?.map(c => ({ ...c, value: c.value * (1 + change) })) || [],
      },
    };
    const metrics = performFinancialAnalysis(testModel, periods, discountRate, isWeekly);
    return {
      change: change * 100,
      npvChange: ((metrics.npv - baseCase.npv) / Math.abs(baseCase.npv)) * 100,
    };
  });
  
  return {
    baseCase,
    bestCase,
    worstCase,
    sensitivity: {
      revenueImpact,
      costImpact,
    },
  };
};
// Helper functions for CategoryBreakdown component
// Added during Phase 1 cleanup to replace deleted duplicate file

/**
 * Calculate total revenue from a financial model
 */
export const calculateTotalRevenue = (model: any): number => {
  let total = 0;
  
  // Sum all revenue streams
  if (model.revenue && Array.isArray(model.revenue)) {
    total = model.revenue.reduce((sum: number, stream: any) => sum + (stream.value || 0), 0);
  }
  
  return total;
};

/**
 * Calculate total costs from a financial model
 */
export const calculateTotalCosts = (model: any): number => {
  let total = 0;
  
  // Sum all cost categories
  if (model.costs && Array.isArray(model.costs)) {
    total = model.costs.reduce((sum: number, cost: any) => sum + (cost.value || 0), 0);
  }
  
  return total;
};
