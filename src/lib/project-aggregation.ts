/**
 * Project-level data aggregation utilities
 * Functions to aggregate data across multiple financial models within a project
 */

import { FinancialModel } from '@/lib/db';
import { ActualsPeriodEntry } from '@/types/models';

// NEW: Scenario Analysis Types (Additive - doesn't break existing functionality)
export interface ScenarioMetrics {
  min: number;
  max: number;
  average: number;
  median: number;
  primary: number; // Value from the selected primary model
}

export interface ModelScenario {
  modelId: string;
  name: string;
  description?: string;
  label: 'Conservative' | 'Realistic' | 'Optimistic' | 'Custom';
  projectedRevenue: number;
  projectedCosts: number;
  netProfit: number;
  profitMargin: number;
  createdAt?: string | Date;
  assumptions: {
    revenueStreams: number;
    costCategories: number;
    growthRate: number;
    marketingBudget: number;
  };
}

export interface ProjectScenarioAnalysis {
  hasMultipleModels: boolean;
  primaryModelId: string;
  scenarios: ModelScenario[];
  aggregateMetrics: {
    revenue: ScenarioMetrics;
    costs: ScenarioMetrics;
    profit: ScenarioMetrics;
    profitMargin: ScenarioMetrics;
  };
  variance: 'Low' | 'Medium' | 'High';
  variancePercent: number;
  keyDifferences: string[];
  riskFactors: string[];
}

export type ScenarioLabel = 'Conservative' | 'Realistic' | 'Optimistic' | 'Custom';

export interface ProjectAggregateMetrics {
  totalProjectedRevenue: number;
  totalProjectedCosts: number;
  netProjectedProfit: number;
  totalActualRevenue: number;
  totalActualCosts: number;
  netActualProfit: number;
  overallVariancePercent: number;
  modelCount: number;
  periodsTracked: number;
}

export interface ModelSummary {
  id: string;
  name: string;
  projectedRevenue: number;
  projectedCosts: number;
  netProfit: number;
  actualRevenue: number;
  actualCosts: number;
  variancePercent: number;
  createdAt?: string | Date;
  growthModelType?: string;
}

/**
 * Calculate project-level aggregate metrics across all financial models
 */
export function calculateProjectAggregateMetrics(
  models: FinancialModel[],
  actualsData: ActualsPeriodEntry[]
): ProjectAggregateMetrics {
  if (!models.length) {
    return {
      totalProjectedRevenue: 0,
      totalProjectedCosts: 0,
      netProjectedProfit: 0,
      totalActualRevenue: 0,
      totalActualCosts: 0,
      netActualProfit: 0,
      overallVariancePercent: 0,
      modelCount: 0,
      periodsTracked: 0,
    };
  }

  let totalProjectedRevenue = 0;
  let totalProjectedCosts = 0;
  let totalActualRevenue = 0;
  let totalActualCosts = 0;

  // Calculate projected totals from all models
  models.forEach(model => {
    const duration = model.assumptions.metadata?.weeks || 12;
    
    // Sum up revenue streams
    model.assumptions.revenue.forEach(revenue => {
      if (revenue.type === 'recurring') {
        totalProjectedRevenue += revenue.value * duration;
      } else {
        totalProjectedRevenue += revenue.value;
      }
    });

    // Sum up cost categories
    model.assumptions.costs.forEach(cost => {
      if (cost.type === 'recurring') {
        totalProjectedCosts += cost.value * duration;
      } else {
        totalProjectedCosts += cost.value;
      }
    });
  });

  // Calculate actual totals from actuals data
  actualsData.forEach(actual => {
    Object.values(actual.revenueActuals || {}).forEach(value => {
      totalActualRevenue += value;
    });
    Object.values(actual.costActuals || {}).forEach(value => {
      totalActualCosts += value;
    });
  });

  const netProjectedProfit = totalProjectedRevenue - totalProjectedCosts;
  const netActualProfit = totalActualRevenue - totalActualCosts;
  
  // Calculate overall variance percentage
  const overallVariancePercent = netProjectedProfit > 0 
    ? ((netActualProfit - netProjectedProfit) / netProjectedProfit) * 100 
    : 0;

  // Count unique periods tracked
  const periodsTracked = new Set(actualsData.map(a => `${a.periodType}-${a.period}`)).size;

  return {
    totalProjectedRevenue: Math.round(totalProjectedRevenue),
    totalProjectedCosts: Math.round(totalProjectedCosts),
    netProjectedProfit: Math.round(netProjectedProfit),
    totalActualRevenue: Math.round(totalActualRevenue),
    totalActualCosts: Math.round(totalActualCosts),
    netActualProfit: Math.round(netActualProfit),
    overallVariancePercent: Math.round(overallVariancePercent * 100) / 100,
    modelCount: models.length,
    periodsTracked,
  };
}

/**
 * Shared simulation logic that matches ModelOverview calculations
 */
export function runModelSimulation(model: FinancialModel): {
  totalRevenue: number;
  totalCosts: number;
  totalProfit: number;
  totalAttendance: number;
} {
  if (!model?.assumptions?.metadata || !model?.assumptions?.revenue || !model?.assumptions?.costs) {
    return { totalRevenue: 0, totalCosts: 0, totalProfit: 0, totalAttendance: 0 };
  }

  const metadata = model.assumptions.metadata;
  const isWeekly = metadata.type === 'WeeklyEvent';
  const duration = isWeekly ? metadata.weeks || 12 : 12;
  const revenueStreams = model.assumptions.revenue;
  const costs = model.assumptions.costs;
  const marketingSetup = model.assumptions.marketing || { allocationMode: 'channels', channels: [] };

  let cumulativeRevenue = 0;
  let cumulativeCosts = 0;
  let totalAttendance = 0;

  for (let period = 1; period <= duration; period++) {
    let currentAttendance = metadata.initialWeeklyAttendance || 0;
    if (isWeekly && period > 1 && metadata.growth) {
      const attendanceGrowthRate = (metadata.growth.attendanceGrowthRate || 0) / 100;
      currentAttendance = (metadata.initialWeeklyAttendance || 0) * Math.pow(1 + attendanceGrowthRate, period - 1);
    }
    if (isWeekly) {
      totalAttendance += currentAttendance;
    }
    
    let periodRevenue = 0;
    revenueStreams.forEach(stream => {
      let streamRevenue = 0;
      const baseValue = stream.value;
      
      if (isWeekly) {
        if (stream.name === "F&B Sales") {
          let spend = metadata.perCustomer?.fbSpend || 0;
          if (period > 1 && metadata.growth?.useCustomerSpendGrowth) {
            spend *= Math.pow(1 + (metadata.growth.fbSpendGrowth || 0) / 100, period - 1);
          }
          streamRevenue = currentAttendance * spend;
        } else if (stream.name === "Merchandise Sales") {
          let spend = metadata.perCustomer?.merchandiseSpend || 0;
          if (period > 1 && metadata.growth?.useCustomerSpendGrowth) {
            spend *= Math.pow(1 + (metadata.growth.merchandiseSpendGrowth || 0) / 100, period - 1);
          }
          streamRevenue = currentAttendance * spend;
        } else {
          streamRevenue = baseValue;
          if (period > 1 && metadata.growth?.useCustomerSpendGrowth) {
            let growthRate = 0;
            switch(stream.name) {
              case "Ticket Sales": growthRate = (metadata.growth.ticketPriceGrowth || 0) / 100; break;
              case "Online Sales": growthRate = (metadata.growth.onlineSpendGrowth || 0) / 100; break;
              case "Miscellaneous Revenue": growthRate = (metadata.growth.miscSpendGrowth || 0) / 100; break;
            }
            streamRevenue *= Math.pow(1 + growthRate, period - 1);
          }
        }
      } else {
        streamRevenue = baseValue;
        if (period > 1) {
          const { type, rate } = model.assumptions.growthModel;
          if (type === "linear") streamRevenue = baseValue * (1 + rate * (period - 1));
          else streamRevenue = baseValue * Math.pow(1 + rate, period - 1);
        }
      }
      periodRevenue += streamRevenue;
    });

    let periodCosts = 0;
    costs.forEach(cost => {
      let costValue = 0;
      const costType = cost.type?.toLowerCase();
      const baseValue = cost.value;

      if (isWeekly) {
        if (costType === "fixed") {
          costValue = period === 1 ? baseValue : 0;
        } else if (costType === "variable") {
          if (cost.name === "F&B COGS") {
            const cogsPct = metadata.costs?.fbCOGSPercent || 30;
            let fbSpend = metadata.perCustomer?.fbSpend || 0;
            if (period > 1 && metadata.growth?.useCustomerSpendGrowth) {
              fbSpend *= Math.pow(1 + (metadata.growth.fbSpendGrowth || 0) / 100, period - 1);
            }
            const fbRevenueThisPeriod = currentAttendance * fbSpend;
            costValue = fbRevenueThisPeriod * (cogsPct / 100);
          } else if (cost.name === "Merchandise COGS") {
            const cogsPct = metadata.costs?.merchandiseCOGSPercent || 50;
            let merchandiseSpend = metadata.perCustomer?.merchandiseSpend || 0;
            if (period > 1 && metadata.growth?.useCustomerSpendGrowth) {
              merchandiseSpend *= Math.pow(1 + (metadata.growth.merchandiseSpendGrowth || 0) / 100, period - 1);
            }
            const merchandiseRevenueThisPeriod = currentAttendance * merchandiseSpend;
            costValue = merchandiseRevenueThisPeriod * (cogsPct / 100);
          } else {
            costValue = baseValue;
          }
        } else {
          costValue = baseValue;
        }
      } else {
        costValue = baseValue;
        if (period > 1) {
          const { type, rate } = model.assumptions.growthModel;
          if (type === "linear") costValue = baseValue * (1 + rate * (period - 1));
          else costValue = baseValue * Math.pow(1 + rate, period - 1);
        }
      }
      periodCosts += costValue;
    });

    // Add marketing costs
    if (marketingSetup.allocationMode === 'channels' && marketingSetup.channels) {
      marketingSetup.channels.forEach(channel => {
        if (channel.allocationMode === 'period' && channel.periodAllocations) {
          const allocation = channel.periodAllocations.find(a => a.period === period);
          if (allocation) {
            periodCosts += allocation.amount;
          }
        } else if (channel.allocationMode === 'equal') {
          periodCosts += (channel.totalBudget || 0) / duration;
        }
      });
    }

    cumulativeRevenue += periodRevenue;
    cumulativeCosts += periodCosts;
  }

  return {
    totalRevenue: cumulativeRevenue,
    totalCosts: cumulativeCosts,
    totalProfit: cumulativeRevenue - cumulativeCosts,
    totalAttendance
  };
}

/**
 * Generate a summary for each model including actual performance
 */
export function generateModelSummaries(
  models: FinancialModel[],
  actualsData: ActualsPeriodEntry[]
): ModelSummary[] {
  return models.map(model => {
    // Use the shared simulation logic
    const simulation = runModelSimulation(model);
    const projectedRevenue = simulation.totalRevenue;
    const projectedCosts = simulation.totalCosts;

    // Calculate actuals for this model (would need model-specific actuals in real implementation)
    // For now, we'll aggregate all actuals assuming single model scenarios
    let actualRevenue = 0;
    let actualCosts = 0;

    actualsData.forEach(actual => {
      Object.values(actual.revenueActuals || {}).forEach(value => {
        actualRevenue += value;
      });
      Object.values(actual.costActuals || {}).forEach(value => {
        actualCosts += value;
      });
    });

    const netProfit = projectedRevenue - projectedCosts;
    const actualNetProfit = actualRevenue - actualCosts;
    const variancePercent = netProfit > 0 
      ? ((actualNetProfit - netProfit) / netProfit) * 100 
      : 0;

    return {
      id: model.id,
      name: model.name,
      projectedRevenue: Math.round(projectedRevenue),
      projectedCosts: Math.round(projectedCosts),
      netProfit: Math.round(netProfit),
      actualRevenue: Math.round(actualRevenue),
      actualCosts: Math.round(actualCosts),
      variancePercent: Math.round(variancePercent * 100) / 100,
      createdAt: model.createdAt,
      growthModelType: model.assumptions.growthModel?.type,
    };
  });
}

/**
 * Get the most recent activity across all models and actuals
 */
export function getRecentProjectActivity(
  models: FinancialModel[],
  actualsData: ActualsPeriodEntry[]
): Array<{
  type: 'model_created' | 'actuals_updated';
  description: string;
  timestamp: Date;
  modelName?: string;
}> {
  const activities: Array<{
    type: 'model_created' | 'actuals_updated';
    description: string;
    timestamp: Date;
    modelName?: string;
  }> = [];

  // Add model creation activities
  models.forEach(model => {
    if (model.createdAt) {
      activities.push({
        type: 'model_created',
        description: `Created financial model "${model.name}"`,
        timestamp: new Date(model.createdAt),
        modelName: model.name,
      });
    }
  });

  // Add actuals update activities (would need updatedAt field in real implementation)
  // For now, we'll use a simple approach
  const recentActuals = actualsData
    .sort((a, b) => b.period - a.period)
    .slice(0, 5);

  recentActuals.forEach(actual => {
    const modelName = models.find(m => m.id === models[0]?.id)?.name || 'Unknown Model';
    activities.push({
      type: 'actuals_updated',
      description: `Updated ${actual.periodType.toLowerCase()} ${actual.period} performance data`,
      timestamp: new Date(), // Would use actual.updatedAt in real implementation
      modelName,
    });
  });

  return activities
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 10);
}

// NEW: Scenario Analysis Functions (Additive - doesn't break existing functionality)

/**
 * Detect scenario type from model name using keywords
 */
export function detectScenarioLabel(modelName: string): ScenarioLabel {
  const name = modelName.toLowerCase();
  
  if (name.includes('conserv') || name.includes('worst') || name.includes('low') || name.includes('minimum')) {
    return 'Conservative';
  }
  if (name.includes('optimist') || name.includes('best') || name.includes('high') || name.includes('maximum')) {
    return 'Optimistic';
  }
  if (name.includes('realist') || name.includes('base') || name.includes('likely') || name.includes('expected')) {
    return 'Realistic';
  }
  
  return 'Custom';
}

/**
 * Calculate variance level based on the spread of values
 */
export function calculateVarianceLevel(min: number, max: number): 'Low' | 'Medium' | 'High' {
  if (min === 0) return 'High'; // Avoid division by zero
  
  const variancePercent = ((max - min) / min) * 100;
  
  if (variancePercent < 20) return 'Low';
  if (variancePercent < 50) return 'Medium';
  return 'High';
}

/**
 * Select the most appropriate primary model from available scenarios
 */
export function selectPrimaryModel(models: FinancialModel[]): string {
  if (models.length === 0) return '';
  if (models.length === 1) return models[0].id;
  
  // Prefer models labeled as "Realistic" or "Base"
  const realisticModel = models.find(model => {
    const label = detectScenarioLabel(model.name);
    return label === 'Realistic';
  });
  
  if (realisticModel) return realisticModel.id;
  
  // Fallback to most recently updated model
  const sortedModels = [...models].sort((a, b) => {
    const dateA = new Date(a.updatedAt || a.createdAt || 0);
    const dateB = new Date(b.updatedAt || b.createdAt || 0);
    return dateB.getTime() - dateA.getTime();
  });
  
  return sortedModels[0].id;
}

/**
 * Calculate scenario metrics (min, max, average, median) from an array of values
 */
export function calculateScenarioMetrics(values: number[], primaryValue: number): ScenarioMetrics {
  if (values.length === 0) {
    return { min: 0, max: 0, average: 0, median: 0, primary: primaryValue };
  }
  
  const sorted = [...values].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const average = values.reduce((sum, val) => sum + val, 0) / values.length;
  
  let median: number;
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    median = (sorted[mid - 1] + sorted[mid]) / 2;
  } else {
    median = sorted[mid];
  }
  
  return { min, max, average, median, primary: primaryValue };
}

/**
 * Identify key differences between scenarios
 */
export function identifyKeyDifferences(scenarios: ModelScenario[]): string[] {
  const differences: string[] = [];
  
  if (scenarios.length < 2) return differences;
  
  // Check revenue variance
  const revenues = scenarios.map(s => s.projectedRevenue);
  const revenueVariance = calculateVarianceLevel(Math.min(...revenues), Math.max(...revenues));
  if (revenueVariance !== 'Low') {
    differences.push('Revenue projections');
  }
  
  // Check cost variance
  const costs = scenarios.map(s => s.projectedCosts);
  const costVariance = calculateVarianceLevel(Math.min(...costs), Math.max(...costs));
  if (costVariance !== 'Low') {
    differences.push('Cost assumptions');
  }
  
  // Check growth rates
  const growthRates = scenarios.map(s => s.assumptions.growthRate);
  const growthVariance = calculateVarianceLevel(Math.min(...growthRates), Math.max(...growthRates));
  if (growthVariance !== 'Low') {
    differences.push('Growth models');
  }
  
  // Check marketing budgets
  const marketingBudgets = scenarios.map(s => s.assumptions.marketingBudget);
  const marketingVariance = calculateVarianceLevel(Math.min(...marketingBudgets), Math.max(...marketingBudgets));
  if (marketingVariance !== 'Low') {
    differences.push('Marketing spend');
  }
  
  return differences;
}

/**
 * Main function to calculate comprehensive scenario analysis
 */
export function calculateProjectScenarioAnalysis(
  models: FinancialModel[],
  actualsData: ActualsPeriodEntry[] = []
): ProjectScenarioAnalysis {
  if (models.length === 0) {
    return {
      hasMultipleModels: false,
      primaryModelId: '',
      scenarios: [],
      aggregateMetrics: {
        revenue: { min: 0, max: 0, average: 0, median: 0, primary: 0 },
        costs: { min: 0, max: 0, average: 0, median: 0, primary: 0 },
        profit: { min: 0, max: 0, average: 0, median: 0, primary: 0 },
        profitMargin: { min: 0, max: 0, average: 0, median: 0, primary: 0 },
      },
      variance: 'Low',
      variancePercent: 0,
      keyDifferences: [],
      riskFactors: [],
    };
  }
  
  const hasMultipleModels = models.length > 1;
  const primaryModelId = selectPrimaryModel(models);
  
  // Calculate individual scenario metrics using the same logic as generateModelSummaries
  const modelSummaries = generateModelSummaries(models, actualsData);
  
  const scenarios: ModelScenario[] = models.map((model, index) => {
    const summary = modelSummaries[index];
    const profitMargin = summary.projectedRevenue > 0 
      ? (summary.netProfit / summary.projectedRevenue) * 100 
      : 0;
    
    return {
      modelId: model.id,
      name: model.name,
      description: model.description,
      label: detectScenarioLabel(model.name),
      projectedRevenue: summary.projectedRevenue,
      projectedCosts: summary.projectedCosts,
      netProfit: summary.netProfit,
      profitMargin: Math.round(profitMargin * 100) / 100,
      createdAt: model.createdAt,
      assumptions: {
        revenueStreams: model.assumptions.revenue?.length || 0,
        costCategories: model.assumptions.costs?.length || 0,
        growthRate: model.assumptions.growthModel?.rate || 0,
        marketingBudget: calculateModelMarketingBudget(model),
      },
    };
  });
  
  // Find primary scenario for primary values
  const primaryScenario = scenarios.find(s => s.modelId === primaryModelId) || scenarios[0];
  
  // Calculate aggregate scenario metrics
  const revenues = scenarios.map(s => s.projectedRevenue);
  const costs = scenarios.map(s => s.projectedCosts);
  const profits = scenarios.map(s => s.netProfit);
  const margins = scenarios.map(s => s.profitMargin);
  
  const aggregateMetrics = {
    revenue: calculateScenarioMetrics(revenues, primaryScenario.projectedRevenue),
    costs: calculateScenarioMetrics(costs, primaryScenario.projectedCosts),
    profit: calculateScenarioMetrics(profits, primaryScenario.netProfit),
    profitMargin: calculateScenarioMetrics(margins, primaryScenario.profitMargin),
  };
  
  // Calculate overall variance
  const revenueVariance = calculateVarianceLevel(aggregateMetrics.revenue.min, aggregateMetrics.revenue.max);
  const profitVariance = calculateVarianceLevel(
    Math.abs(aggregateMetrics.profit.min), 
    Math.abs(aggregateMetrics.profit.max)
  );
  
  const variance = revenueVariance === 'High' || profitVariance === 'High' ? 'High' :
                  revenueVariance === 'Medium' || profitVariance === 'Medium' ? 'Medium' : 'Low';
  
  const variancePercent = aggregateMetrics.revenue.min > 0 
    ? ((aggregateMetrics.revenue.max - aggregateMetrics.revenue.min) / aggregateMetrics.revenue.min) * 100
    : 0;
  
  const keyDifferences = identifyKeyDifferences(scenarios);
  
  const riskFactors: string[] = [];
  if (variance === 'High') riskFactors.push('High variance between scenarios');
  if (aggregateMetrics.profit.min < 0) riskFactors.push('Potential for losses in worst case');
  if (scenarios.some(s => s.assumptions.marketingBudget > s.projectedRevenue * 0.5)) {
    riskFactors.push('High marketing spend relative to revenue');
  }
  
  return {
    hasMultipleModels,
    primaryModelId,
    scenarios,
    aggregateMetrics,
    variance,
    variancePercent: Math.round(variancePercent * 100) / 100,
    keyDifferences,
    riskFactors,
  };
}

/**
 * Helper function to calculate single model metrics (extracted for reuse)
 */
function calculateSingleModelMetrics(model: FinancialModel) {
  // Use the same calculation as generateModelSummaries for consistency
  const duration = model.assumptions.metadata?.weeks || model.assumptions.metadata?.duration || 12;
  const isWeekly = model.assumptions.metadata?.type === 'WeeklyEvent';
  
  let projectedRevenue = 0;
  let projectedCosts = 0;
  
  if (isWeekly) {
    // For weekly events, we need to calculate based on attendance and per-customer spend
    // This is a simplified calculation - the full simulation in ModelOverview is more complex
    const baseAttendance = model.assumptions.metadata?.attendance?.baseline || 0;
    
    model.assumptions.revenue.forEach(revenue => {
      // For weekly events, revenue.value typically represents per-period amount
      projectedRevenue += revenue.value * duration;
    });
  } else {
    // For non-weekly models, apply growth over duration
    model.assumptions.revenue.forEach(revenue => {
      if (revenue.type === 'recurring') {
        projectedRevenue += revenue.value * duration;
      } else {
        projectedRevenue += revenue.value;
      }
    });
  }
  
  // Calculate costs
  model.assumptions.costs.forEach(cost => {
    if (cost.type === 'recurring') {
      projectedCosts += cost.value * duration;
    } else {
      projectedCosts += cost.value;
    }
  });
  
  const netProfit = projectedRevenue - projectedCosts;
  
  return { projectedRevenue, projectedCosts, netProfit };
}

/**
 * Helper function to calculate total marketing budget for a model
 */
function calculateModelMarketingBudget(model: FinancialModel): number {
  const marketing = model.assumptions.marketing;
  if (!marketing) return 0;
  
  if (marketing.allocationMode === 'channels') {
    return marketing.channels?.reduce((total, channel) => total + (channel.budget || 0), 0) || 0;
  }
  
  // For other allocation modes, we'd need to implement based on the specific structure
  return 0;
}

/**
 * Calculate key performance indicators for the project
 */
export function calculateProjectKPIs(
  models: FinancialModel[],
  actualsData: ActualsPeriodEntry[]
) {
  const metrics = calculateProjectAggregateMetrics(models, actualsData);
  
  return {
    // Financial Health
    profitMargin: metrics.totalProjectedRevenue > 0 
      ? (metrics.netProjectedProfit / metrics.totalProjectedRevenue) * 100 
      : 0,
    
    // Performance Tracking
    revenueVariance: metrics.totalProjectedRevenue > 0 
      ? ((metrics.totalActualRevenue - metrics.totalProjectedRevenue) / metrics.totalProjectedRevenue) * 100 
      : 0,
    
    costVariance: metrics.totalProjectedCosts > 0 
      ? ((metrics.totalActualCosts - metrics.totalProjectedCosts) / metrics.totalProjectedCosts) * 100 
      : 0,

    // Progress Indicators
    dataCompleteness: metrics.periodsTracked > 0 ? (metrics.periodsTracked / (models[0]?.assumptions.metadata?.weeks || 12)) * 100 : 0,
    
    // Status Indicators
    performanceStatus: metrics.overallVariancePercent > 10 ? 'ahead' : 
                      metrics.overallVariancePercent < -10 ? 'behind' : 'on_track',
  };
}