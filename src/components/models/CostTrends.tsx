import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { FinancialModel, CostAssumption } from "@/lib/db";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import FinancialMatrix from "./FinancialMatrix";
import { MarketingSetup, ModelMetadata, GrowthModel } from "@/types/models";
import { generateForecastTimeSeries } from "@/lib/financialCalculations";
import { Badge } from "@/components/ui/badge";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Define a type for the data points generated in costData
interface CostDataPoint {
  point: string; // e.g., "Week 1", "Month 1"
  costs: number; // Total cost for the period
  cumulativeCosts: number; // Cumulative cost up to this period
  attendance?: number; // Optional attendance number
  [key: string]: string | number | undefined; // Allow dynamic keys for cost names like 'SetupCosts', 'MarketingBudget'
}

interface CostTrendsProps {
  costs: CostAssumption[];
  marketingSetup?: MarketingSetup;
  metadata?: ModelMetadata;
  growthModel?: GrowthModel;
  model: FinancialModel;
  onUpdateCostData: (data: CostDataPoint[]) => void; // Use specific type
}

const CostTrends = ({
  costs,
  marketingSetup,
  metadata,
  growthModel,
  model,
  onUpdateCostData
}: CostTrendsProps) => {
  const [timePoints, setTimePoints] = useState<number>(12);
  const isWeeklyEvent = metadata?.type === "WeeklyEvent";
  const timeUnit = isWeeklyEvent ? "Week" : "Month";

  // Define the calculation function 
  const calculateCostData = useCallback((): CostDataPoint[] => {
    try {
      // Try to use the centralized forecast generation function first
      const forecastData = generateForecastTimeSeries(model);

      if (forecastData && forecastData.length > 0) {
        // Limit to the requested number of periods
        const limitedData = forecastData.slice(0, Math.min(forecastData.length, timePoints));

        // Convert the forecast data to the format expected by this component
        const data: CostDataPoint[] = limitedData.map((period, index) => {
          // Create the data point
          const point: CostDataPoint = {
            point: period.point || `${timeUnit} ${index + 1}`,
            costs: period.cost,
            cumulativeCosts: period.cumulativeCost,
            attendance: period.attendance
          };

          return point;
        });

        return data;
      }

      // If forecast data is empty, return an empty array
      return [];
    } catch (error) {
      console.error("Error calculating cost trends:", error);
      return [];
    }
  }, [
    model,
    timePoints,
    isWeeklyEvent // Dependency needed as it affects calculation logic
  ]);

  // Memoize the cost data calculation to avoid recalculating on every render
  const costData = useMemo(() => calculateCostData(), [calculateCostData]);

  // Ref to store the previous costData string representation
  const prevCostDataStringRef = useRef<string | null>(null);

  useEffect(() => {
    if (onUpdateCostData && costData) {
      const currentCostDataString = JSON.stringify(costData);
      if (currentCostDataString !== prevCostDataStringRef.current) {
        // Update the data
        onUpdateCostData(costData);

        prevCostDataStringRef.current = currentCostDataString;
      }
    }
    // Dependencies remain costData (the result of useMemo) and the callback
  }, [costData, onUpdateCostData]);

  // MOVED: costKeys calculation before the early return
  const costKeys = useMemo(() => {
    const keys = new Set<string>();
    // Check costData safely - it might be empty but shouldn't be null/undefined here
    if (costData.some(point => Object.prototype.hasOwnProperty.call(point, 'MarketingBudget'))) {
      keys.add("MarketingBudget");
    }
    const presentKeys = Array.from(keys);

    const costRenderOrder = [
      "SetupCosts",
      "MarketingBudget",
      "FBCOGS",
      "StaffCosts",
      "ManagementCosts",
    ];

    const sortedKeys = presentKeys.sort((a, b) => {
      let indexA = costRenderOrder.indexOf(a);
      let indexB = costRenderOrder.indexOf(b);
      if (indexA === -1) indexA = costRenderOrder.length;
      if (indexB === -1) indexB = costRenderOrder.length;
      return indexA - indexB;
    });

    console.log("[CostTrends] Sorted Keys for Rendering:", sortedKeys);
    return sortedKeys;

  }, [costData]); // costData is now a dependency

  // Early return if data calculation failed or resulted in empty array
  if (!costData || costData.length === 0) {
    return (
      <div className="p-4 border border-red-200 rounded-md bg-red-50">
        <p className="text-red-600">
          Unable to generate cost trends. There might be an issue with the model data.
        </p>
      </div>
    );
  }

  // Define a color mapping function or object
  const getColor = (key: string): string => { // Removed index param, not needed with map lookup
    const colorMap: Record<string, string> = {
      "MarketingBudget": "#a855f7", // Purple
      "SetupCosts": "#ef4444",      // Red
      "FBCOGS": "#f97316",          // Orange
      "StaffCosts": "#eab308",      // Yellow
      "ManagementCosts": "#22c55e",  // Green
    };
    const fallbackColor = '#9ca3af'; // Gray fallback
    const color = colorMap[key] || fallbackColor;
    // Log color assignment
    // console.log(`[CostTrends] getColor for key: ${key}, assigned: ${color}`);
    return color;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-medium">Cost Trends Over Time</h3>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm">Projection Period:</span>
          <select
            className="border rounded px-2 py-1"
            value={timePoints}
            onChange={(e) => setTimePoints(Number(e.target.value))}
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

      <div className="w-full h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={costData}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="point"
              tick={{ fontSize: 12 }}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `$${Math.ceil(value).toLocaleString()}`}
            />
            <Tooltip
              formatter={(value: number, name: string) => [
                `$${Math.ceil(value).toLocaleString()}`,
                name
              ]}
              labelFormatter={(label) => `${label}`}
            />
            <Legend />

            {/* Map over the SORTED costKeys */}
            {costKeys.map((key) => {
              const color = getColor(key);
              console.log(`[CostTrends] Rendering Area - Key: ${key}, Color: ${color}`);

              return (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  name={key === 'MarketingBudget' ? 'Marketing Budget' : key.replace(/([A-Z])/g, ' $1').trim()}
                  stackId="1"
                  stroke={color}
                  fill={color}
                  fillOpacity={0.6}
                />
              );
            })}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* FinancialMatrix rendering */}
      {!marketingSetup?.channels && (
        <FinancialMatrix
          model={model}
          trendData={costData}
          costData={true}
        />
      )}
    </div>
  );
};

export default CostTrends;
