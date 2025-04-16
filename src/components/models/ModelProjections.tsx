import React, { useState, useMemo, useCallback } from "react";
import { FinancialModel } from "@/lib/db";
import { devLog, appError } from "@/lib/logUtils";
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
import { formatCurrency } from "@/lib/utils";
import { generateForecastTimeSeries } from "@/lib/financialCalculations";
import { Badge } from "@/components/ui/badge";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ModelProjectionsProps {
  model: FinancialModel;
  shouldSpreadSetupCosts?: boolean;
}

const ModelProjections = React.memo(({ model, shouldSpreadSetupCosts }: ModelProjectionsProps) => {
  const [projectionMonths, setProjectionMonths] = useState<number>(12);
  const [showCumulative, setShowCumulative] = useState<boolean>(true);

  if (!model || !model.assumptions || !model.assumptions.growthModel) {
    return (
      <div className="p-4 border border-red-200 rounded-md bg-red-50">
        <p className="text-red-600">
          Unable to generate projections. Model data is incomplete or invalid.
        </p>
      </div>
    );
  }

  const calculateProjections = useCallback(() => {
    try {
      // Use the centralized function to generate forecast time series
      const forecastData = generateForecastTimeSeries(model);

      // If we have forecast data, use it directly
      if (forecastData && forecastData.length > 0) {
        // Limit to the requested number of periods
        const timePoints = Math.min(forecastData.length, projectionMonths + 1); // +1 for the starting point
        const result = forecastData.slice(0, timePoints);

        return result;
      }

      return [];
    } catch (error) {
      appError("Error calculating projections", error);
      return [];
    }
  }, [model, projectionMonths, shouldSpreadSetupCosts]);

  // Memoize the projection data calculation to avoid recalculating on every render
  const projectionData = useMemo(() => calculateProjections(), [calculateProjections]);

  if (!projectionData || projectionData.length === 0) {
    return (
      <div className="p-4 border border-red-200 rounded-md bg-red-50">
        <p className="text-red-600">
          Unable to generate projections. There might be an issue with the model data.
        </p>
      </div>
    );
  }

  const isWeeklyEvent = model.assumptions.metadata?.type === "WeeklyEvent";
  const timeUnit = isWeeklyEvent ? "Week" : "Month";

  const finalDataPoint = projectionData[projectionData.length - 1];

  const displayData = showCumulative ?
    projectionData.map(point => ({
      ...point,
      displayRevenue: point.cumulativeRevenue,
      displayCost: point.cumulativeCost,
      displayProfit: point.cumulativeRevenue - point.cumulativeCost
    })) :
    projectionData.map(point => ({
      ...point,
      displayRevenue: point.revenue,
      displayCost: point.cost,
      displayProfit: point.revenue - point.cost
    }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-medium">Financial Projections</h3>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm">Display:</span>
            <select
              className="border rounded px-2 py-1"
              value={showCumulative ? "cumulative" : "period"}
              onChange={(e) => setShowCumulative(e.target.value === "cumulative")}
            >
              <option value="cumulative">Cumulative Totals</option>
              <option value="period">Per {isWeeklyEvent ? "Week" : "Month"}</option>
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm">Projection Period:</span>
            <select
              className="border rounded px-2 py-1"
              value={projectionMonths}
              onChange={(e) => setProjectionMonths(Number(e.target.value))}
            >
              {isWeeklyEvent ? (
                <>
                  <option value="4">4 weeks</option>
                  <option value="8">8 weeks</option>
                  <option value="12">12 weeks</option>
                  <option value="24">24 weeks</option>
                </>
              ) : (
                <>
                  <option value="6">6 months</option>
                  <option value="12">12 months</option>
                  <option value="24">24 months</option>
                  <option value="36">36 months</option>
                </>
              )}
            </select>
          </div>
        </div>
      </div>

      <div className="w-full h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={displayData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="point"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => value === "Start" ? value : value.split(" ")[1]}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `$${value.toLocaleString()}`}
            />
            {isWeeklyEvent && 'attendance' in finalDataPoint && (
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => value.toLocaleString()}
              />
            )}
            <Tooltip
              formatter={(value: number, name: string) => {
                if (name === "attendance" && typeof value === "number") {
                  return [value.toLocaleString(), "Attendance"];
                }
                if (name === "displayRevenue") return [`$${value.toLocaleString()}`, "Revenue"];
                if (name === "displayCost") return [`$${value.toLocaleString()}`, "Cost"];
                if (name === "displayProfit") return [`$${value.toLocaleString()}`, "Profit"];
                return [`$${value.toLocaleString()}`, name.charAt(0).toUpperCase() + name.slice(1)];
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="displayRevenue"
              name="Revenue"
              stroke="#4CAF50"
              strokeWidth={2}
              activeDot={{ r: 8 }}
            />
            <Line
              type="monotone"
              dataKey="displayCost"
              name="Cost"
              stroke="#FF5722"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="displayProfit"
              name="Profit"
              stroke="#2196F3"
              strokeWidth={2}
            />
            {isWeeklyEvent && 'attendance' in finalDataPoint && (
              <Line
                type="monotone"
                dataKey="attendance"
                name="Attendance"
                stroke="#9C27B0"
                strokeWidth={2}
                yAxisId="right"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border rounded-lg p-4 bg-green-50">
          <h4 className="text-sm font-medium text-green-700">
            {showCumulative ? "Total Revenue" : `Revenue (${timeUnit} ${projectionMonths})`}
          </h4>
          <p className="text-2xl font-bold text-green-800">
            {formatCurrency(showCumulative ? finalDataPoint.cumulativeRevenue : finalDataPoint.revenue)}
          </p>
          <p className="text-xs text-green-600">
            {showCumulative ? "Cumulative across all " : "Last "}
            {projectionMonths} {timeUnit.toLowerCase()}{showCumulative ? "s" : ""}
          </p>
        </div>

        <div className="border rounded-lg p-4 bg-red-50">
          <h4 className="text-sm font-medium text-red-700">
            {showCumulative ? "Total Costs" : `Costs (${timeUnit} ${projectionMonths})`}
          </h4>
          <p className="text-2xl font-bold text-red-800">
            {formatCurrency(showCumulative ? finalDataPoint.cumulativeCost : finalDataPoint.cost)}
          </p>
          <p className="text-xs text-red-600">
            {showCumulative ? "Cumulative across all " : "Last "}
            {projectionMonths} {timeUnit.toLowerCase()}{showCumulative ? "s" : ""}
          </p>
        </div>

        <div className="border rounded-lg p-4 bg-blue-50">
          <h4 className="text-sm font-medium text-blue-700">
            {showCumulative ? "Total Profit" : `Profit (${timeUnit} ${projectionMonths})`}
          </h4>
          <p className="text-2xl font-bold text-blue-800">
            {formatCurrency(showCumulative ? finalDataPoint.cumulativeRevenue - finalDataPoint.cumulativeCost : finalDataPoint.revenue - finalDataPoint.cost)}
          </p>
          <p className="text-xs text-blue-600">
            {showCumulative ? "Cumulative across all " : "Last "}
            {projectionMonths} {timeUnit.toLowerCase()}{showCumulative ? "s" : ""}
          </p>
        </div>
      </div>

      {isWeeklyEvent && 'attendance' in (projectionData[projectionData.length - 1] || {}) && (
        <div className="border rounded-lg p-4 bg-purple-50">
          <h4 className="text-sm font-medium text-purple-700">Total Attendance</h4>
          <p className="text-2xl font-bold text-purple-800">
            {projectionData[projectionData.length - 1].attendance?.toLocaleString() || "N/A"} customers
          </p>
          <p className="text-xs text-purple-600">
            Total projected customers over {projectionMonths} weeks
          </p>
        </div>
      )}
    </div>
  );
});

export default React.memo(ModelProjections, (prevProps, nextProps) => {
  // Only re-render if the model ID changes or the shouldSpreadSetupCosts prop changes
  return (
    prevProps.model.id === nextProps.model.id &&
    prevProps.shouldSpreadSetupCosts === nextProps.shouldSpreadSetupCosts
  );
});
