/**
 * useScenarioCalculation Hook
 * 
 * Custom hook for calculating scenario forecasts and metrics.
 */

import { useMemo } from 'react';
import { ForecastPeriodData } from '@/lib/financialCalculations';
import { ScenarioSummaryMetrics, ScenarioComparisonMetrics } from '../types/scenarioTypes';

interface UseScenarioCalculationProps {
  baselineData: ForecastPeriodData[];
  scenarioData: ForecastPeriodData[];
}

interface UseScenarioCalculationReturn {
  summaryMetrics: ScenarioSummaryMetrics;
  comparisonMetrics: ScenarioComparisonMetrics;
  chartData: any[]; // Data formatted for charts
}

/**
 * Calculate summary metrics from forecast data
 */
function calculateSummaryMetrics(data: ForecastPeriodData[]): ScenarioSummaryMetrics {
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
  const profitMargin = lastPeriod.totalRevenue > 0 
    ? (lastPeriod.totalProfit / lastPeriod.totalRevenue) * 100 
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
 */
function calculateComparisonMetrics(
  baselineMetrics: ScenarioSummaryMetrics,
  scenarioMetrics: ScenarioSummaryMetrics
): ScenarioComparisonMetrics {
  // Calculate absolute differences
  const revenueDelta = scenarioMetrics.totalRevenue - baselineMetrics.totalRevenue;
  const costsDelta = scenarioMetrics.totalCosts - baselineMetrics.totalCosts;
  const profitDelta = scenarioMetrics.totalProfit - baselineMetrics.totalProfit;
  const marginDelta = scenarioMetrics.profitMargin - baselineMetrics.profitMargin;
  
  // Calculate percentage differences
  const revenueDeltaPercent = baselineMetrics.totalRevenue !== 0 
    ? (revenueDelta / baselineMetrics.totalRevenue) * 100 
    : 0;
    
  const costsDeltaPercent = baselineMetrics.totalCosts !== 0 
    ? (costsDelta / baselineMetrics.totalCosts) * 100 
    : 0;
    
  const profitDeltaPercent = baselineMetrics.totalProfit !== 0 
    ? (profitDelta / baselineMetrics.totalProfit) * 100 
    : 0;
  
  // Calculate break-even delta
  const baselineBreakEven = baselineMetrics.breakEvenPeriod.index;
  const scenarioBreakEven = scenarioMetrics.breakEvenPeriod.index;
  
  let breakEvenDelta = 0;
  if (baselineBreakEven !== null && scenarioBreakEven !== null) {
    breakEvenDelta = scenarioBreakEven - baselineBreakEven;
  } else if (baselineBreakEven === null && scenarioBreakEven !== null) {
    breakEvenDelta = -scenarioBreakEven; // Negative because scenario reaches break-even but baseline doesn't
  } else if (baselineBreakEven !== null && scenarioBreakEven === null) {
    breakEvenDelta = baselineBreakEven; // Positive because baseline reaches break-even but scenario doesn't
  }
  
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
  scenarioData
}: UseScenarioCalculationProps): UseScenarioCalculationReturn {
  // Calculate summary metrics
  const baselineSummary = useMemo(() => 
    calculateSummaryMetrics(baselineData), 
    [baselineData]
  );
  
  const scenarioSummary = useMemo(() => 
    calculateSummaryMetrics(scenarioData), 
    [scenarioData]
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
