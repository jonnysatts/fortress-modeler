/**
 * useScenarioCalculation Hook
 * 
 * Custom hook for calculating scenario forecasts and metrics.
 */

import { useMemo } from 'react';
import { ForecastPeriodData } from '@/lib/financialCalculations';
import { ScenarioSummaryMetrics, ScenarioComparisonMetrics } from '../types/scenarioTypes';
import { metricsSummaryAdapter, scenarioComparisonAdapter } from '@/lib/finance/centralizationAdapters';
import type { FinancialModel } from '@/lib/db';
import type { ActualsPeriodEntry } from '@/lib/finance/types';

interface UseScenarioCalculationProps {
  baselineData: ForecastPeriodData[];
  scenarioData: ForecastPeriodData[];
  model?: FinancialModel;
  actuals?: ActualsPeriodEntry[];
}

interface UseScenarioCalculationReturn {
  summaryMetrics: ScenarioSummaryMetrics;
  comparisonMetrics: ScenarioComparisonMetrics;
  chartData: any[]; // Data formatted for charts
}

/**
 * Calculate summary metrics from forecast data
 * (Migrated: now uses centralized engine adapter)
 */
function calculateSummaryMetrics(
  data: ForecastPeriodData[],
  model?: FinancialModel,
  actuals?: ActualsPeriodEntry[]
): ScenarioSummaryMetrics {
  // If model and actuals are provided and actuals is non-empty, use centralized adapter
  if (model && actuals && actuals.length > 0) {
    return metricsSummaryAdapter(model, actuals) as ScenarioSummaryMetrics;
  }
  // Otherwise, fallback to forecast-only summary (legacy logic)
  if (!data || data.length === 0) {
    return {
      totalRevenue: 0,
      totalCosts: 0,
      totalProfit: 0,
      profitMargin: 0,
      breakEvenPeriod: {
        index: null,
        label: 'N/A'
      },
      averageWeeklyRevenue: 0,
      averageWeeklyCosts: 0,
      averageWeeklyProfit: 0
    };
  }

  // Get the last period for totals
  const lastPeriod = data[data.length - 1];
  
  // Calculate averages
  const totalPeriods = data.length;
  const averageWeeklyRevenue = data.reduce((sum, period) => sum + period.revenue, 0) / totalPeriods;
  const averageWeeklyCosts = data.reduce((sum, period) => sum + period.cost, 0) / totalPeriods;
  const averageWeeklyProfit = data.reduce((sum, period) => sum + period.profit, 0) / totalPeriods;
  
  // Find break-even period
  let breakEvenIndex = null;
  let breakEvenLabel = 'N/A';
  
  for (let i = 0; i < data.length; i++) {
    if (data[i].cumulativeProfit >= 0) {
      breakEvenIndex = i;
      breakEvenLabel = data[i].point;
      break;
    }
  }
  
  // Calculate profit margin
  const profitMargin = lastPeriod.cumulativeRevenue > 0 
    ? (lastPeriod.cumulativeProfit / lastPeriod.cumulativeRevenue) * 100 
    : 0;
  
  return {
    totalRevenue: lastPeriod.cumulativeRevenue,
    totalCosts: lastPeriod.cumulativeCost,
    totalProfit: lastPeriod.cumulativeProfit,
    profitMargin,
    breakEvenPeriod: {
      index: breakEvenIndex,
      label: breakEvenLabel
    },
    averageWeeklyRevenue,
    averageWeeklyCosts,
    averageWeeklyProfit
  };
}

/**
 * Calculate comparison metrics between baseline and scenario
 * (Migrated: now uses centralized engine adapter)
 */
function calculateComparisonMetrics(
  baselineMetrics: ScenarioSummaryMetrics,
  scenarioMetrics: ScenarioSummaryMetrics
): ScenarioComparisonMetrics {
  // Use centralized adapter
  return scenarioComparisonAdapter(baselineMetrics, scenarioMetrics);
}

/**
 * Prepare chart data from forecast data
 */
function prepareChartData(baselineData: ForecastPeriodData[], scenarioData: ForecastPeriodData[]): any[] {
  return baselineData.map((baseline, index) => {
    const scenario = scenarioData[index] || {};
    return {
      name: `Period ${baseline.period}`,
      baselineRevenue: baseline.revenue,
      baselineProfit: baseline.profit,
      scenarioRevenue: scenario.revenue || 0,
      scenarioProfit: scenario.profit || 0,
      revenueDiff: (scenario.revenue || 0) - baseline.revenue,
      profitDiff: (scenario.profit || 0) - baseline.profit
    };
  });
}

/**
 * Custom hook for scenario calculations
 */
export default function useScenarioCalculation({
  baselineData,
  scenarioData,
  model,
  actuals
}: UseScenarioCalculationProps): UseScenarioCalculationReturn {
  // Calculate summary metrics
  const baselineSummary = useMemo(() => 
    calculateSummaryMetrics(baselineData, model, actuals), 
    [baselineData, model, actuals]
  );
  
  const scenarioSummary = useMemo(() => 
    calculateSummaryMetrics(scenarioData, model, actuals), 
    [scenarioData, model, actuals]
  );
  
  // Calculate comparison metrics
  const comparisonMetrics = useMemo(() => 
    calculateComparisonMetrics(baselineSummary, scenarioSummary),
    [baselineSummary, scenarioSummary]
  );
  
  // Prepare chart data
  const chartData = useMemo(() => 
    prepareChartData(baselineData, scenarioData),
    [baselineData, scenarioData]
  );
  
  return {
    summaryMetrics: scenarioSummary,
    comparisonMetrics,
    chartData
  };
}
