
import { useState } from "react";
import { FinancialModel } from "@/lib/db";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface ModelProjectionsProps {
  model: FinancialModel;
}

const ModelProjections = ({ model }: ModelProjectionsProps) => {
  const [projectionMonths, setProjectionMonths] = useState<number>(12);

  // Calculate projections based on model assumptions
  const calculateProjections = () => {
    const data = [];
    const totalInitialRevenue = model.assumptions.revenue.reduce(
      (sum, item) => sum + item.value,
      0
    );
    const totalInitialCosts = model.assumptions.costs.reduce(
      (sum, item) => sum + item.value,
      0
    );

    // Initialize revenue and costs
    let currentRevenue = totalInitialRevenue;
    let currentCosts = totalInitialCosts;

    for (let month = 0; month <= projectionMonths; month++) {
      // Calculate growth based on model type
      const { type, rate, seasonalFactors } = model.assumptions.growthModel;
      
      if (month > 0) {
        if (type === "linear") {
          // Linear growth: add a fixed amount each period
          currentRevenue = totalInitialRevenue * (1 + rate * month);
        } else if (type === "exponential") {
          // Exponential growth: compound growth
          currentRevenue = totalInitialRevenue * Math.pow(1 + rate, month);
        } else if (type === "seasonal" && seasonalFactors && seasonalFactors.length > 0) {
          // Seasonal growth: apply seasonal factors in rotation
          const seasonIndex = (month - 1) % seasonalFactors.length;
          const seasonFactor = seasonalFactors[seasonIndex];
          currentRevenue = totalInitialRevenue * Math.pow(1 + rate, month) * seasonFactor;
        } else {
          // Default to simple growth
          currentRevenue = totalInitialRevenue * (1 + rate * month);
        }

        // Simple growth for costs (typically doesn't grow as fast as revenue)
        currentCosts = totalInitialCosts * (1 + (rate * 0.7) * month);
      }

      // Calculate profit
      const profit = currentRevenue - currentCosts;

      // Add data point
      data.push({
        month: month === 0 ? "Start" : `Month ${month}`,
        revenue: Math.round(currentRevenue * 100) / 100,
        costs: Math.round(currentCosts * 100) / 100,
        profit: Math.round(profit * 100) / 100,
      });
    }

    return data;
  };

  const projectionData = calculateProjections();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Financial Projections</h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm">Projection Period:</span>
          <select
            className="border rounded px-2 py-1"
            value={projectionMonths}
            onChange={(e) => setProjectionMonths(Number(e.target.value))}
          >
            <option value="6">6 months</option>
            <option value="12">12 months</option>
            <option value="24">24 months</option>
            <option value="36">36 months</option>
          </select>
        </div>
      </div>

      <div className="w-full h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={projectionData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => value === "Start" ? value : value.split(" ")[1]}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `$${value.toLocaleString()}`}
            />
            <Tooltip 
              formatter={(value: number) => [`$${value.toLocaleString()}`, undefined]}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="revenue"
              name="Revenue"
              stroke="#4CAF50"
              strokeWidth={2}
              activeDot={{ r: 8 }}
            />
            <Line
              type="monotone"
              dataKey="costs"
              name="Costs"
              stroke="#FF5722"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="profit"
              name="Profit"
              stroke="#2196F3"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border rounded-lg p-4 bg-green-50">
          <h4 className="text-sm font-medium text-green-700">Final Revenue</h4>
          <p className="text-2xl font-bold text-green-800">
            ${projectionData[projectionData.length - 1].revenue.toLocaleString()}
          </p>
          <p className="text-xs text-green-600">
            {projectionMonths} month projection
          </p>
        </div>

        <div className="border rounded-lg p-4 bg-red-50">
          <h4 className="text-sm font-medium text-red-700">Final Costs</h4>
          <p className="text-2xl font-bold text-red-800">
            ${projectionData[projectionData.length - 1].costs.toLocaleString()}
          </p>
          <p className="text-xs text-red-600">
            {projectionMonths} month projection
          </p>
        </div>

        <div className="border rounded-lg p-4 bg-blue-50">
          <h4 className="text-sm font-medium text-blue-700">Final Profit</h4>
          <p className="text-2xl font-bold text-blue-800">
            ${projectionData[projectionData.length - 1].profit.toLocaleString()}
          </p>
          <p className="text-xs text-blue-600">
            {projectionMonths} month projection
          </p>
        </div>
      </div>
    </div>
  );
};

export default ModelProjections;
