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
import {
  calculateAttendance,
  calculateCustomerSpend,
  calculateCOGS,
  calculateCostBreakdown,
  generateForecastTimeSeries
} from "@/lib/finance/calculationEngine";
import { useCalculationEngine } from "@/hooks/useCalculationEngine";
import { calculationLogger, generateCalculationId } from "@/lib/finance/logging/calculationLogger";
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

  // Use the calculation engine hook
  const { calculateCostBreakdown: versionedCalculateCostBreakdown, versionString, featureFlags } = useCalculationEngine();

  // Determine if we should show version information
  const showVersionInfo = featureFlags.showVersionInfo;

  // Define the calculation function with performance tracking
  const calculateCostData = useCallback((): CostDataPoint[] => {
    // Generate a unique ID for this calculation
    const calculationId = generateCalculationId();

    // Log the start of the calculation
    calculationLogger.debug(
      'Starting cost trends calculation',
      {
        modelId: model.id,
        modelName: model.name,
        timePoints
      },
      calculationId,
      'CostTrends.calculateCostData'
    );

    // Start performance tracking
    const startTime = performance.now();

    try {
      // Try to use the centralized forecast generation function first
      const forecastData = generateForecastTimeSeries(model);

      if (forecastData && forecastData.length > 0) {
        // Limit to the requested number of periods
        const limitedData = forecastData.slice(0, Math.min(forecastData.length, timePoints));

        // Convert the forecast data to the format expected by this component
        const data: CostDataPoint[] = limitedData.map(period => {
          if (!period.period) return null;

          // Get cost breakdown for this period
          const costBreakdown = calculateCostBreakdown(model, period.period);

          // Create the data point
          const point: CostDataPoint = {
            point: period.point || `Week ${period.period}`,
            costs: period.cost || 0,
            cumulativeCosts: period.cumulativeCost || 0,
            attendance: period.attendance
          };

          // Add individual cost categories
          if (costBreakdown) {
            // Map cost breakdown to the expected format
            if (costBreakdown.fbCOGS) point['FBCOGS'] = Math.ceil(costBreakdown.fbCOGS);
            if (costBreakdown.merchCOGS) point['MerchandiseCOGS'] = Math.ceil(costBreakdown.merchCOGS);
            if (costBreakdown.staffCosts) point['StaffCosts'] = Math.ceil(costBreakdown.staffCosts);
            if (costBreakdown.managementCosts) point['ManagementCosts'] = Math.ceil(costBreakdown.managementCosts);
            if (costBreakdown.setupCosts) point['SetupCosts'] = Math.ceil(costBreakdown.setupCosts);
            if (costBreakdown.marketingCost) point['MarketingBudget'] = Math.ceil(costBreakdown.marketingCost);
          }

          return point;
        }).filter(Boolean) as CostDataPoint[];

        // End performance tracking
        const endTime = performance.now();
        const duration = endTime - startTime;

        // Log the result
        calculationLogger.debug(
          'Completed cost trends calculation using centralized engine',
          {
            modelId: model.id,
            modelName: model.name,
            periods: data.length,
            duration: `${duration.toFixed(2)}ms`
          },
          calculationId,
          'CostTrends.calculateCostData'
        );

        return data;
      }

      // Fallback to manual calculation if the centralized function fails
      const data: CostDataPoint[] = [];
      // Ensure required base data exists
      if (!costs || !metadata) {
          console.warn("[CostTrends] Missing costs or metadata, cannot calculate.");
          return [];
      }

      const currentMarketingSetup = marketingSetup || { allocationMode: 'channels', channels: [] };
      const isWeekly = isWeeklyEvent;
      // Provide default for duration if metadata.weeks is missing
      const duration = isWeekly ? (metadata.weeks ?? 12) : 12; // Use nullish coalescing

      if (isWeeklyEvent) {
        // Use the calculated duration (which has a default)
        const weeks = Math.min(duration, timePoints);

        // Track cumulative costs
        let cumulativeCosts = 0;

        for (let week = 1; week <= weeks; week++) {
          // Get cost breakdown using the centralized function
          const costBreakdownResult = versionedCalculateCostBreakdown(model, week);
          const costBreakdown = costBreakdownResult.value;

          // Create the data point
          const point: CostDataPoint = {
            point: `Week ${week}`,
            costs: 0,
            cumulativeCosts: 0
          };

          // Calculate attendance using the centralized function
          const initialAttendance = metadata.initialWeeklyAttendance ?? 0;
          const attendanceGrowthRate = metadata.growth?.attendanceGrowthRate ?? 0;
          const currentAttendance = calculateAttendance(initialAttendance, attendanceGrowthRate, week);
          point.attendance = currentAttendance;

          // Add individual cost categories from the breakdown
          let weeklyTotal = 0;

          if (costBreakdown) {
            // Map cost breakdown to the expected format
            if (costBreakdown.fbCOGS) {
              point['FBCOGS'] = Math.ceil(costBreakdown.fbCOGS);
              weeklyTotal += costBreakdown.fbCOGS;
            }
            if (costBreakdown.merchCOGS) {
              point['MerchandiseCOGS'] = Math.ceil(costBreakdown.merchCOGS);
              weeklyTotal += costBreakdown.merchCOGS;
            }
            if (costBreakdown.staffCosts) {
              point['StaffCosts'] = Math.ceil(costBreakdown.staffCosts);
              weeklyTotal += costBreakdown.staffCosts;
            }
            if (costBreakdown.managementCosts) {
              point['ManagementCosts'] = Math.ceil(costBreakdown.managementCosts);
              weeklyTotal += costBreakdown.managementCosts;
            }
            if (costBreakdown.setupCosts) {
              point['SetupCosts'] = Math.ceil(costBreakdown.setupCosts);
              weeklyTotal += costBreakdown.setupCosts;
            }
            if (costBreakdown.marketingCost) {
              point['MarketingBudget'] = Math.ceil(costBreakdown.marketingCost);
              weeklyTotal += costBreakdown.marketingCost;
            }
          }

          // Update total costs
          point.costs = Math.ceil(weeklyTotal);
          cumulativeCosts += weeklyTotal;
          point.cumulativeCosts = Math.ceil(cumulativeCosts);

          // Add marketing cost (already included in the breakdown)
          // No need to add it again

          // Add the point to the data array
          data.push(point);
        }
      } else {
        // Non-Weekly Event (Monthly)
         const months = timePoints;
         const modelDuration = duration; // Use calculated duration (default is 12)

         for (let month = 1; month <= months; month++) {
           const point: CostDataPoint = { point: `Month ${month}`, costs: 0, cumulativeCosts: 0 };
           let monthlyTotal = 0;
           // Add regular costs
           costs.forEach(cost => {
              const costType = cost.type?.toLowerCase();
              const safeName = cost.name.replace(/[^a-zA-Z0-9]/g, "");
              let costValue = 0;

              if (costType === "fixed") {
                costValue = month === 1 ? cost.value : 0;
              } else if (costType === "variable") {
                costValue = cost.value;
                if (month > 1) {
                  const rate = growthModel?.rate ?? 0; // Default rate
                  costValue *= Math.pow(1 + rate, month - 1);
                }
              } else if (costType === "recurring") {
                costValue = cost.value;
              } else {
                costValue = cost.value;
              }

              point[safeName] = Math.ceil(costValue);
              monthlyTotal += costValue;
           });

           // Calculate Monthly Marketing Cost
           let periodMarketingCost = 0;
           if (currentMarketingSetup.allocationMode === 'channels') {
               const totalWeeklyBudget = currentMarketingSetup.channels.reduce((sum, ch) => sum + (ch.weeklyBudget ?? 0), 0); // Default weeklyBudget
               periodMarketingCost = totalWeeklyBudget * (365.25 / 7 / 12);
           } else if (currentMarketingSetup.allocationMode === 'highLevel') {
               const totalBudget = currentMarketingSetup.totalBudget ?? 0; // Default totalBudget
               const application = currentMarketingSetup.budgetApplication || 'spreadEvenly';

               if (application === 'upfront') {
                 periodMarketingCost = (month === 1) ? totalBudget : 0;
               } else if (application === 'spreadEvenly' && modelDuration > 0) { // Avoid division by zero
                 periodMarketingCost = totalBudget / modelDuration;
               } else if (application === 'spreadCustom') {
                 const spreadDuration = currentMarketingSetup.spreadDuration ?? 0; // Default spreadDuration
                 if (spreadDuration > 0 && month <= spreadDuration) { // Avoid division by zero
                   periodMarketingCost = (totalBudget / spreadDuration);
                 } else {
                   periodMarketingCost = 0;
                 }
               }
           }

           // Add calculated marketing cost
           if (periodMarketingCost > 0) {
             point["MarketingBudget"] = Math.ceil(periodMarketingCost);
             monthlyTotal += periodMarketingCost;
           }

           // Rename keys for monthly consistency
           point.costs = Math.ceil(monthlyTotal);

           if (month === 1) {
             point.cumulativeCosts = Math.ceil(monthlyTotal);
           } else {
             point.cumulativeCosts = Math.ceil(data[month - 2].cumulativeCosts + monthlyTotal);
           }

           data.push(point);
         }
      }
      // End performance tracking for fallback calculation
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Log the result
      calculationLogger.debug(
        'Completed cost trends calculation using fallback method',
        {
          modelId: model.id,
          modelName: model.name,
          periods: data.length,
          duration: `${duration.toFixed(2)}ms`
        },
        calculationId,
        'CostTrends.calculateCostData'
      );

      return data;
    } catch (error) {
      // End performance tracking
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Log the error
      calculationLogger.error(
        'Error calculating cost trends',
        {
          modelId: model.id,
          modelName: model.name,
          error,
          duration: `${duration.toFixed(2)}ms`
        },
        calculationId,
        'CostTrends.calculateCostData'
      );

      console.error("Error calculating cost trends:", error);
      return [];
    }
  }, [
      model,
      costs,
      marketingSetup,
      metadata,
      growthModel,
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
          // Generate a unique ID for this operation
          const operationId = generateCalculationId();

          // Log the update
          calculationLogger.debug(
            'Updating cost data',
            { dataLength: costData.length },
            operationId,
            'CostTrends.onUpdateCostData'
          );

          // Start performance tracking
          const startTime = performance.now();

          // Update the data
          onUpdateCostData(costData);

          // End performance tracking
          const endTime = performance.now();
          const duration = endTime - startTime;

          // Log the completion
          calculationLogger.debug(
            'Completed updating cost data',
            {
              dataLength: costData.length,
              duration: `${duration.toFixed(2)}ms`
            },
            operationId,
            'CostTrends.onUpdateCostData'
          );

          prevCostDataStringRef.current = currentCostDataString;
      }
    }
    // Dependencies remain costData (the result of useMemo) and the callback
  }, [costData, onUpdateCostData]);

  // MOVED: costKeys calculation before the early return
  const costKeys = useMemo(() => {
    const keys = new Set<string>();
    costs.forEach(cost => {
        keys.add(cost.name.replace(/[^a-zA-Z0-9]/g, ""));
    });
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

  }, [costs, costData]); // costData is now a dependency

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
          {showVersionInfo && (
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger>
                  <Badge variant="outline" className="ml-2 text-xs">
                    {versionString}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Using calculation engine version {versionString}</p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          )}
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
