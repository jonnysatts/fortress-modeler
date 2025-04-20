// calculationEngine.ts
// Centralized calculation engine for all financial modeling

import type { FinancialModel } from '../db';
import type { ForecastPeriodData, ActualsPeriodEntry, MetricsSummary, RiskScore } from './types';
import { generateForecastTimeSeries as generateForecastTimeSeriesV2 } from '../financialCalculations';

/**
 * Generate the full forecast time series for a model
 * DEPRECATED: Use the implementation in financialCalculations.ts
 */
export function generateForecastTimeSeries(model: FinancialModel): ForecastPeriodData[] {
  // Delegate to the robust implementation in financialCalculations.ts
  return generateForecastTimeSeriesV2(model);
}

/**
 * Calculate total forecasted revenue for a model
 */
export function calculateTotalRevenue(model: FinancialModel): number {
  // Example: Sum all revenue streams for all periods (placeholder)
  const timeSeries = generateForecastTimeSeries(model);
  return timeSeries.length > 0 ? timeSeries[timeSeries.length - 1].cumulativeRevenue ?? 0 : 0;
}

/**
 * Calculate total forecasted costs for a model
 */
export function calculateTotalCosts(model: FinancialModel): number {
  const timeSeries = generateForecastTimeSeries(model);
  return timeSeries.length > 0 ? timeSeries[timeSeries.length - 1].cumulativeCost ?? 0 : 0;
}

/**
 * Calculate total profit for a model
 */
export function calculateProfit(model: FinancialModel): number {
  const timeSeries = generateForecastTimeSeries(model);
  return timeSeries.length > 0 ? timeSeries[timeSeries.length - 1].cumulativeProfit ?? 0 : 0;
}

/**
 * Calculate variance between actual and forecast values
 */
export function calculateVariance(actual: number, forecast: number): { absolute: number, percent: number } {
  const absolute = actual - forecast;
  const percent = forecast !== 0 ? (absolute / forecast) * 100 : 0;
  return { absolute, percent };
}

/**
 * Calculate summary metrics for a model and actuals
 */
export function calculateMetrics(model: FinancialModel, actuals: ActualsPeriodEntry[]): MetricsSummary {
  // Placeholder: Use forecast time series for summary
  const forecast = generateForecastTimeSeries(model);
  if (!forecast || forecast.length === 0) {
    return {
      totalRevenue: 0,
      totalCosts: 0,
      totalProfit: 0,
      profitMargin: 0,
      breakEvenPeriod: { index: null, label: 'N/A' },
      averageWeeklyRevenue: 0,
      averageWeeklyCosts: 0,
      averageWeeklyProfit: 0
    };
  }
  const last = forecast[forecast.length - 1];
  let breakEvenIndex: number | null = null;
  let breakEvenLabel = 'N/A';
  for (let i = 0; i < forecast.length; i++) {
    if (forecast[i].cumulativeProfit >= 0) {
      breakEvenIndex = i;
      breakEvenLabel = forecast[i].point || `Period ${i + 1}`;
      break;
    }
  }
  const totalPeriods = forecast.length;
  const averageWeeklyRevenue = last.cumulativeRevenue / totalPeriods;
  const averageWeeklyCosts = last.cumulativeCost / totalPeriods;
  const averageWeeklyProfit = last.cumulativeProfit / totalPeriods;
  const profitMargin = last.cumulativeRevenue > 0 ? (last.cumulativeProfit / last.cumulativeRevenue) * 100 : 0;
  return {
    totalRevenue: last.cumulativeRevenue,
    totalCosts: last.cumulativeCost,
    totalProfit: last.cumulativeProfit,
    profitMargin,
    breakEvenPeriod: { index: breakEvenIndex, label: breakEvenLabel },
    averageWeeklyRevenue,
    averageWeeklyCosts,
    averageWeeklyProfit
  };
}

/**
 * Calculate risk score for a model
 */
export function calculateRiskScore(model: FinancialModel): RiskScore {
  // Placeholder: Implement real risk logic
  return { score: 0, level: 'Unknown' };
}

/**
 * Compare baseline and scenario metrics for scenario analysis
 */
export function calculateScenarioComparison(
  baseline: MetricsSummary,
  scenario: MetricsSummary
): {
  revenueDelta: number;
  revenueDeltaPercent: number;
  costsDelta: number;
  costsDeltaPercent: number;
  profitDelta: number;
  profitDeltaPercent: number;
  marginDelta: number;
  breakEvenDelta: number;
} {
  const revenueDelta = scenario.totalRevenue - baseline.totalRevenue;
  const revenueDeltaPercent = baseline.totalRevenue !== 0 ? (revenueDelta / baseline.totalRevenue) * 100 : 0;
  const costsDelta = scenario.totalCosts - baseline.totalCosts;
  const costsDeltaPercent = baseline.totalCosts !== 0 ? (costsDelta / baseline.totalCosts) * 100 : 0;
  const profitDelta = scenario.totalProfit - baseline.totalProfit;
  const profitDeltaPercent = baseline.totalProfit !== 0 ? (profitDelta / baseline.totalProfit) * 100 : 0;
  const marginDelta = scenario.profitMargin - baseline.profitMargin;
  const breakEvenDelta = (scenario.breakEvenPeriod.index ?? 0) - (baseline.breakEvenPeriod.index ?? 0);
  return {
    revenueDelta,
    revenueDeltaPercent,
    costsDelta,
    costsDeltaPercent,
    profitDelta,
    profitDeltaPercent,
    marginDelta,
    breakEvenDelta
  };
}

// Add more functions as needed for full centralization
