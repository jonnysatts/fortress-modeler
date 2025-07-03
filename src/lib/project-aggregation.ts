/**
 * Project-level data aggregation utilities
 * Functions to aggregate data across multiple financial models within a project
 */

import { FinancialModel } from '@/lib/db';
import { ActualsPeriodEntry } from '@/types/models';

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
 * Generate a summary for each model including actual performance
 */
export function generateModelSummaries(
  models: FinancialModel[],
  actualsData: ActualsPeriodEntry[]
): ModelSummary[] {
  return models.map(model => {
    const duration = model.assumptions.metadata?.weeks || 12;
    
    // Calculate model projections
    let projectedRevenue = 0;
    let projectedCosts = 0;

    model.assumptions.revenue.forEach(revenue => {
      if (revenue.type === 'recurring') {
        projectedRevenue += revenue.value * duration;
      } else {
        projectedRevenue += revenue.value;
      }
    });

    model.assumptions.costs.forEach(cost => {
      if (cost.type === 'recurring') {
        projectedCosts += cost.value * duration;
      } else {
        projectedCosts += cost.value;
      }
    });

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