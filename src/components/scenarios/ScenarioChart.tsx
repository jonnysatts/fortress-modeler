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
  LineChart,
  Line,
  ReferenceLine
} from 'recharts';
import { ForecastPeriodData } from '@/lib/financialCalculations';
import { formatCurrency } from '@/lib/utils';

interface ScenarioChartProps {
  baselineData: ForecastPeriodData[] | null;
  scenarioData: ForecastPeriodData[] | null;
  height?: number;
}

const ScenarioChart: React.FC<ScenarioChartProps> = ({
  baselineData,
  scenarioData,
  height = 300
}) => {
  if (!baselineData || !scenarioData) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No data available</p>
      </div>
    );
  }

  // Prepare data for the chart
  const chartData = baselineData.map((baseline, index) => {
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
