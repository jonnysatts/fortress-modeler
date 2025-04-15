/**
 * Scenario Chart Component
 * 
 * This component displays a chart comparing baseline and scenario forecasts.
 */

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { ForecastPeriodData } from '@/lib/financialCalculations';
import { formatCurrency } from '@/lib/utils';
import { useScenarioCalculation } from '../hooks';

interface ScenarioChartProps {
  baselineData: ForecastPeriodData[];
  scenarioData: ForecastPeriodData[];
  height?: number;
}

const ScenarioChart: React.FC<ScenarioChartProps> = ({
  baselineData,
  scenarioData,
  height = 300
}) => {
  // Use the scenario calculation hook to get chart data
  const { chartData } = useScenarioCalculation({
    baselineData,
    scenarioData
  });

  if (!baselineData || !scenarioData || baselineData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No data available</p>
      </div>
    );
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-md shadow-md">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis tickFormatter={(value) => formatCurrency(value)} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar dataKey="baselineRevenue" name="Baseline Revenue" fill="#8884d8" />
          <Bar dataKey="scenarioRevenue" name="Scenario Revenue" fill="#82ca9d" />
          <Bar dataKey="baselineProfit" name="Baseline Profit" fill="#ffc658" />
          <Bar dataKey="scenarioProfit" name="Scenario Profit" fill="#ff8042" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ScenarioChart;
