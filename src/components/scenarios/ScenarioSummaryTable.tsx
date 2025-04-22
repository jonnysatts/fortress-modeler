import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { ForecastPeriodData } from '@/lib/financialCalculations';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface ScenarioSummaryTableProps {
  baselineData: ForecastPeriodData[] | null;
  scenarioData: ForecastPeriodData[] | null;
  isCalculating?: boolean;
}

const ScenarioSummaryTable: React.FC<ScenarioSummaryTableProps> = ({
  baselineData,
  scenarioData,
  isCalculating = false
}) => {
  if (isCalculating) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mr-2" />
        <span className="ml-2 text-muted-foreground">Calculating summary...</span>
      </div>
    );
  }
  if (!baselineData || !scenarioData) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No data available</p>
      </div>
    );
  }

  // Calculate totals (legacy method, UI unchanged)
  // --- FIX: Use marketingTotal if present for accurate costs ---
  const baselineTotals = baselineData.reduce(
    (acc, period) => {
      acc.revenue += period.revenue;
      acc.costs += typeof period.marketingTotal === 'number' ? (period.cost - (period.marketingTotal || 0)) + (period.marketingTotal || 0) : period.cost;
      acc.profit += period.profit;
      return acc;
    },
    { revenue: 0, costs: 0, profit: 0 }
  );

  const scenarioTotals = scenarioData.reduce(
    (acc, period) => {
      acc.revenue += period.revenue;
      acc.costs += typeof period.marketingTotal === 'number' ? (period.cost - (period.marketingTotal || 0)) + (period.marketingTotal || 0) : period.cost;
      acc.profit += period.profit;
      return acc;
    },
    { revenue: 0, costs: 0, profit: 0 }
  );

  console.log('Baseline totals:', baselineTotals);
  console.log('Scenario totals:', scenarioTotals);

  // Calculate differences
  const differences = {
    revenue: scenarioTotals.revenue - baselineTotals.revenue,
    costs: scenarioTotals.costs - baselineTotals.costs,
    profit: scenarioTotals.profit - baselineTotals.profit
  };

  console.log('Differences:', differences);

  // Calculate percentages
  const percentages = {
    revenue: baselineTotals.revenue ? (differences.revenue / baselineTotals.revenue) * 100 : 0,
    costs: baselineTotals.costs ? (differences.costs / baselineTotals.costs) * 100 : 0,
    profit: baselineTotals.profit ? (differences.profit / baselineTotals.profit) * 100 : 0
  };

  console.log('Percentages:', percentages);

  // Log the first few periods of each dataset to help diagnose issues
  console.log('First 3 baseline periods:', baselineData.slice(0, 3));
  console.log('First 3 scenario periods:', scenarioData.slice(0, 3));

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Metric</TableHead>
            <TableHead className="text-right">Baseline</TableHead>
            <TableHead className="text-right">Scenario</TableHead>
            <TableHead className="text-right">Difference</TableHead>
            <TableHead className="text-right">Change</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="font-medium">Total Revenue</TableCell>
            <TableCell className="text-right">{formatCurrency(baselineTotals.revenue)}</TableCell>
            <TableCell className="text-right">{formatCurrency(scenarioTotals.revenue)}</TableCell>
            <TableCell className="text-right">{formatCurrency(differences.revenue)}</TableCell>
            <TableCell className="text-right">
              <Badge variant={percentages.revenue >= 0 ? "success" : "destructive"}>
                {formatPercent(percentages.revenue)}
              </Badge>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">Total Costs</TableCell>
            <TableCell className="text-right">{formatCurrency(baselineTotals.costs)}</TableCell>
            <TableCell className="text-right">{formatCurrency(scenarioTotals.costs)}</TableCell>
            <TableCell className="text-right">{formatCurrency(differences.costs)}</TableCell>
            <TableCell className="text-right">
              <Badge variant={percentages.costs <= 0 ? "success" : "destructive"}>
                {formatPercent(percentages.costs)}
              </Badge>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">Total Profit</TableCell>
            <TableCell className="text-right">{formatCurrency(baselineTotals.profit)}</TableCell>
            <TableCell className="text-right">{formatCurrency(scenarioTotals.profit)}</TableCell>
            <TableCell className="text-right">{formatCurrency(differences.profit)}</TableCell>
            <TableCell className="text-right">
              <Badge variant={percentages.profit >= 0 ? "success" : "destructive"}>
                {formatPercent(percentages.profit)}
              </Badge>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">Profit Margin</TableCell>
            <TableCell className="text-right">
              {formatPercent(baselineTotals.revenue ? (baselineTotals.profit / baselineTotals.revenue) * 100 : 0)}
            </TableCell>
            <TableCell className="text-right">
              {formatPercent(scenarioTotals.revenue ? (scenarioTotals.profit / scenarioTotals.revenue) * 100 : 0)}
            </TableCell>
            <TableCell className="text-right">
              {formatPercent(
                (scenarioTotals.revenue ? (scenarioTotals.profit / scenarioTotals.revenue) * 100 : 0) -
                (baselineTotals.revenue ? (baselineTotals.profit / baselineTotals.revenue) * 100 : 0)
              )}
            </TableCell>
            <TableCell className="text-right">-</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">Total Attendance</TableCell>
            <TableCell className="text-right">{baselineData.reduce((sum, p) => sum + (p.attendance ?? 0), 0)}</TableCell>
            <TableCell className="text-right">{scenarioData.reduce((sum, p) => sum + (p.attendance ?? 0), 0)}</TableCell>
            <TableCell className="text-right">{scenarioData.reduce((sum, p) => sum + (p.attendance ?? 0), 0) - baselineData.reduce((sum, p) => sum + (p.attendance ?? 0), 0)}</TableCell>
            <TableCell className="text-right">-</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
};

export default ScenarioSummaryTable;
