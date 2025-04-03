import { useState, useEffect, useMemo, useRef } from "react";
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
  
  // Memoize the cost data calculation
  const costData: CostDataPoint[] = useMemo(() => {
    console.log("[CostTrends] Recalculating costData...");
    try {
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
        
        for (let week = 1; week <= weeks; week++) {
          const point: CostDataPoint = { point: `Week ${week}`, costs: 0, cumulativeCosts: 0 };
          let weeklyTotal = 0;
          
          // Provide default for initial attendance
          const initialAttendance = metadata.initialWeeklyAttendance ?? 0; // Use nullish coalescing
          let currentAttendance = initialAttendance;
          
          // Calculate attendance with growth if applicable
          // Check for metadata.growth before accessing its properties
          if (week > 1 && metadata.growth) { 
            const growthRate = (metadata.growth.attendanceGrowthRate ?? 0) / 100; // Default growth rate to 0
            currentAttendance = initialAttendance * Math.pow(1 + growthRate, week - 1);
          } else if (week > 1) {
              // Handle case where week > 1 but no growth info exists - attendance stays initial?
              // Or apply some default? For now, it stays initialAttendance.
          }

          // Calculate F&B revenue for this week
          let fbSpendPerCustomer = metadata.perCustomer?.fbSpend ?? 0;
          // Check metadata.growth before accessing fbSpendGrowth
          if (week > 1 && metadata.growth?.useCustomerSpendGrowth) {
            const fbSpendGrowthRate = (metadata.growth.fbSpendGrowth ?? 0) / 100; // Default growth rate to 0
            fbSpendPerCustomer *= Math.pow(1 + fbSpendGrowthRate, week - 1);
          }
          const fbRevenue = currentAttendance * fbSpendPerCustomer;
          
          // Add regular costs
          costs.forEach(cost => {
            const costType = cost.type?.toLowerCase();
            const safeName = cost.name.replace(/[^a-zA-Z0-9]/g, "");
            let costValue = 0;
            
            if (costType === "fixed") {
              costValue = week === 1 ? cost.value : 0;
            } else if (costType === "variable") {
              if (cost.name === "F&B COGS") {
                const cogsPct = metadata.costs?.fbCOGSPercent ?? 30; // Default COGS % if needed
                costValue = (fbRevenue * cogsPct) / 100;
              } else {
                costValue = cost.value;
                // Check metadata.growth before accessing fbSpendGrowth
                if (week > 1) {
                  const growthRate = metadata.growth?.useCustomerSpendGrowth 
                    ? (metadata.growth?.fbSpendGrowth ?? 0) / 100 // Default growth rate
                    : (growthModel?.rate ?? 0); // Default growth rate
                  costValue *= Math.pow(1 + growthRate, week - 1);
                }
              }
            } else if (costType === "recurring") {
              // Check metadata.weeks before dividing
              if (cost.name === "Setup Costs" && duration > 0) { // Use duration (has default)
                 costValue = cost.value / duration;
              } else {
                 costValue = cost.value;
              }
            } else {
              costValue = cost.value;
            }
            
            point[safeName] = Math.ceil(costValue);
            weeklyTotal += costValue;
          });
          
          // --- Calculate Marketing Cost based on mode ---
          let periodMarketingCost = 0;
          if (currentMarketingSetup.allocationMode === 'channels') {
             periodMarketingCost = currentMarketingSetup.channels.reduce((sum, ch) => sum + (ch.weeklyBudget ?? 0), 0); // Default weeklyBudget to 0
          } else if (currentMarketingSetup.allocationMode === 'highLevel') {
             // Check for totalBudget before using it
             const totalBudget = currentMarketingSetup.totalBudget ?? 0;
             const application = currentMarketingSetup.budgetApplication || 'spreadEvenly';
             const modelDuration = duration; // Use calculated duration (has default)
             
             if (application === 'upfront') {
                periodMarketingCost = (week === 1) ? totalBudget : 0;
             } else if (application === 'spreadEvenly' && modelDuration > 0) { // Avoid division by zero
                periodMarketingCost = totalBudget / modelDuration; 
             } else if (application === 'spreadCustom') {
                // Check spreadDuration before using it
                const spreadDuration = currentMarketingSetup.spreadDuration ?? 0;
                if (spreadDuration > 0 && week <= spreadDuration) { // Avoid division by zero
                  periodMarketingCost = totalBudget / spreadDuration;
                } else {
                  periodMarketingCost = 0;
                }
             }
          }
          
          // Add calculated marketing cost
          if (periodMarketingCost > 0) {
             point["MarketingBudget"] = Math.ceil(periodMarketingCost);
             weeklyTotal += periodMarketingCost;
          }
          
          point.costs = Math.ceil(weeklyTotal);
          
          // Add attendance for merging later
          point.attendance = Math.round(currentAttendance);
          
          if (week === 1) {
            point.cumulativeCosts = Math.ceil(weeklyTotal);
          } else {
            point.cumulativeCosts = Math.ceil(data[week - 2].cumulativeCosts + weeklyTotal);
          }
          
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
      console.log("[CostTrends] Finished calculating costData.");
      return data;
    } catch (error) {
      console.error("Error calculating cost trends:", error);
      return [];
    }
  }, [
      costs, 
      marketingSetup, 
      metadata, 
      growthModel, 
      timePoints, 
      isWeeklyEvent // Dependency needed as it affects calculation logic
  ]);

  // Ref to store the previous costData string representation
  const prevCostDataStringRef = useRef<string | null>(null);
  
  useEffect(() => {
    if (onUpdateCostData && costData) { 
      const currentCostDataString = JSON.stringify(costData);
      if (currentCostDataString !== prevCostDataStringRef.current) {
          console.log("[CostTrends] Data changed, calling onUpdateCostData");
          onUpdateCostData(costData);
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
        <h3 className="text-lg font-medium">Cost Trends Over Time</h3>
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
