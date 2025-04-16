/**
 * Scenario Summary Table Component
 * 
 * This component displays a summary comparison between baseline and scenario forecasts.
 */

import React from 'react';
import { ForecastPeriodData } from '@/lib/financialCalculations';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { useScenarioCalculation } from '../hooks';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { FinancialModel } from '@/lib/db';
import type { ActualsPeriodEntry } from '@/lib/finance/types';

interface ScenarioSummaryTableProps {
  baselineData: ForecastPeriodData[];
  scenarioData: ForecastPeriodData[];
  model?: FinancialModel;
  actuals?: ActualsPeriodEntry[];
}

const ScenarioSummaryTable: React.FC<ScenarioSummaryTableProps> = ({
  baselineData,
  scenarioData,
  model,
  actuals
}) => {
  // Use the scenario calculation hook
  const { summaryMetrics, comparisonMetrics } = useScenarioCalculation({
    baselineData,
    scenarioData,
    model,
    actuals
  });
  
  // Helper function to determine the color class based on the value
  const getColorClass = (value: number, isPositive: boolean = true) => {
    if (Math.abs(value) < 0.01) return '';
    return isPositive 
      ? (value > 0 ? 'text-green-600' : 'text-red-600')
      : (value > 0 ? 'text-red-600' : 'text-green-600');
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Metric</TableHead>
          <TableHead>Baseline</TableHead>
          <TableHead>Scenario</TableHead>
          <TableHead>Difference</TableHead>
          <TableHead>Change</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell className="font-medium">Total Revenue</TableCell>
          <TableCell>{formatCurrency(baselineData[baselineData.length - 1]?.cumulativeRevenue || 0)}</TableCell>
          <TableCell>{formatCurrency(scenarioData[scenarioData.length - 1]?.cumulativeRevenue || 0)}</TableCell>
          <TableCell>{formatCurrency(comparisonMetrics.revenueDelta)}</TableCell>
          <TableCell className={getColorClass(comparisonMetrics.revenueDeltaPercent)}>
            {comparisonMetrics.revenueDeltaPercent > 0 ? '+' : ''}
            {formatPercent(comparisonMetrics.revenueDeltaPercent / 100)}
          </TableCell>
        </TableRow>
        
        <TableRow>
          <TableCell className="font-medium">Total Costs</TableCell>
          <TableCell>{formatCurrency(baselineData[baselineData.length - 1]?.cumulativeCost || 0)}</TableCell>
          <TableCell>{formatCurrency(scenarioData[scenarioData.length - 1]?.cumulativeCost || 0)}</TableCell>
          <TableCell>{formatCurrency(comparisonMetrics.costsDelta)}</TableCell>
          <TableCell className={getColorClass(comparisonMetrics.costsDeltaPercent, false)}>
            {comparisonMetrics.costsDeltaPercent > 0 ? '+' : ''}
            {formatPercent(comparisonMetrics.costsDeltaPercent / 100)}
          </TableCell>
        </TableRow>
        
        <TableRow>
          <TableCell className="font-medium">Total Profit</TableCell>
          <TableCell>{formatCurrency(baselineData[baselineData.length - 1]?.cumulativeProfit || 0)}</TableCell>
          <TableCell>{formatCurrency(scenarioData[scenarioData.length - 1]?.cumulativeProfit || 0)}</TableCell>
          <TableCell>{formatCurrency(comparisonMetrics.profitDelta)}</TableCell>
          <TableCell className={getColorClass(comparisonMetrics.profitDeltaPercent)}>
            {comparisonMetrics.profitDeltaPercent > 0 ? '+' : ''}
            {formatPercent(comparisonMetrics.profitDeltaPercent / 100)}
          </TableCell>
        </TableRow>
        
        <TableRow>
          <TableCell className="font-medium">Profit Margin</TableCell>
          <TableCell>{formatPercent(summaryMetrics.profitMargin / 100)}</TableCell>
          <TableCell>{formatPercent((summaryMetrics.profitMargin + comparisonMetrics.marginDelta) / 100)}</TableCell>
          <TableCell>{comparisonMetrics.marginDelta.toFixed(1)} points</TableCell>
          <TableCell className={getColorClass(comparisonMetrics.marginDelta)}>
            {comparisonMetrics.marginDelta > 0 ? '+' : ''}
            {comparisonMetrics.marginDelta.toFixed(1)} points
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
};

export default ScenarioSummaryTable;
