// Adapter layer for safe migration to centralized calculation engine
// Each adapter calls both the legacy and centralized function, logs discrepancies, and returns the legacy result

import { calculateTotalRevenue, calculateTotalCosts } from '../financialCalculations';
import {
  generateForecastTimeSeries,
  calculateProfit,
  calculateMetrics,
  calculateVariance,
  calculateRiskScore,
  calculateScenarioComparison
} from './calculationEngine';
import type { FinancialModel } from '../db';
import type { ForecastPeriodData, ActualsPeriodEntry, MetricsSummary, RiskScore } from './types';

// Utility for deep equality
function deepEqual(a: any, b: any): boolean {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

// Adapter for total revenue
export function totalRevenueAdapter(model: FinancialModel): number {
  const legacy = calculateTotalRevenue(model);
  let centralized = 0;
  try {
    const forecast: ForecastPeriodData[] = generateForecastTimeSeries(model);
    if (forecast && forecast.length > 0) {
      centralized = forecast[forecast.length - 1]?.cumulativeRevenue ?? 0;
    }
  } catch (e) {
    centralized = NaN;
  }
  if (legacy !== centralized) {
    console.warn('[CentralizationAdapter] totalRevenue mismatch', { legacy, centralized, model });
  }
  return legacy;
}

// Adapter for total costs
export function totalCostsAdapter(model: FinancialModel): number {
  const legacy = calculateTotalCosts(model);
  let centralized = 0;
  try {
    const forecast: ForecastPeriodData[] = generateForecastTimeSeries(model);
    if (forecast && forecast.length > 0) {
      centralized = forecast[forecast.length - 1]?.cumulativeCost ?? 0;
    }
  } catch (e) {
    centralized = NaN;
  }
  if (legacy !== centralized) {
    console.warn('[CentralizationAdapter] totalCosts mismatch', { legacy, centralized, model });
  }
  return legacy;
}

// Adapter for profit
export function profitAdapter(model: FinancialModel): number {
  let legacy = 0;
  let centralized = 0;
  try {
    const forecast: ForecastPeriodData[] = generateForecastTimeSeries(model);
    if (forecast && forecast.length > 0) {
      legacy = forecast[forecast.length - 1]?.cumulativeProfit ?? 0;
    }
    centralized = calculateProfit(model);
  } catch (e) {
    centralized = NaN;
  }
  if (legacy !== centralized) {
    console.warn('[CentralizationAdapter] profit mismatch', { legacy, centralized, model });
  }
  return legacy;
}

// Adapter for period data (returns array)
export function periodDataAdapter(model: FinancialModel): ForecastPeriodData[] {
  let legacy: ForecastPeriodData[] = [];
  let centralized: ForecastPeriodData[] = [];
  try {
    // If legacy period data function exists, call it here (else leave as empty array)
    // legacy = legacyPeriodData(model);
    centralized = generateForecastTimeSeries(model);
  } catch (e) {
    centralized = [];
  }
  if (!deepEqual(legacy, centralized)) {
    console.warn('[CentralizationAdapter] periodData mismatch', { legacy, centralized, model });
  }
  return legacy;
}

// Adapter for metrics summary
export function metricsSummaryAdapter(model: FinancialModel, actuals: ActualsPeriodEntry[]): MetricsSummary {
  let legacy: MetricsSummary = {
    totalRevenue: 0,
    totalCosts: 0,
    totalProfit: 0,
    profitMargin: 0,
    breakEvenPeriod: { index: null, label: 'N/A' },
    averageWeeklyRevenue: 0,
    averageWeeklyCosts: 0,
    averageWeeklyProfit: 0
  };
  let centralized: MetricsSummary = legacy;
  try {
    // If legacy metrics function exists, call it here (else leave as zeroes)
    centralized = calculateMetrics(model, actuals);
  } catch (e) {
    centralized = legacy;
  }
  if (!deepEqual(legacy, centralized)) {
    console.warn('[CentralizationAdapter] metricsSummary mismatch', { legacy, centralized, model, actuals });
  }
  return legacy;
}

// Adapter for variance
export function varianceAdapter(actual: number, forecast: number): { absolute: number, percent: number } {
  // No legacy; just call centralized
  return calculateVariance(actual, forecast);
}

// Adapter for risk score
export function riskScoreAdapter(model: FinancialModel): RiskScore {
  // No legacy; just call centralized
  return calculateRiskScore(model);
}

// Adapter for scenario comparison
export function scenarioComparisonAdapter(baseline: MetricsSummary, scenario: MetricsSummary) {
  // No legacy; just call centralized
  return calculateScenarioComparison(baseline, scenario);
}

// Add more adapters as needed (break-even, averages, etc.)
