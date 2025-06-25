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
import { TrendDataPoint } from "@/types/trends";
import { formatCurrency } from "@/lib/utils";

interface CostTrendsProps {
  costs: CostAssumption[];
  marketingSetup?: MarketingSetup;
  metadata?: ModelMetadata;
  growthModel?: GrowthModel;
  model: FinancialModel;
  onUpdateCostData: (data: TrendDataPoint[]) => void;
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
  const costData: TrendDataPoint[] = useMemo(() => {
    try {
      const data: TrendDataPoint[] = [];
      // Use passed props directly
      if (!costs || !metadata) return []; 
      
      const currentMarketingSetup = marketingSetup || { allocationMode: 'channels', channels: [] }; 
      const isWeekly = isWeeklyEvent; 
      const duration = isWeekly ? (metadata?.weeks || 12) : 12;
      
      if (isWeeklyEvent && metadata) {
        const weeks = Math.min(metadata.weeks || 12, timePoints);
        
        for (let week = 1; week <= weeks; week++) {
          const point: TrendDataPoint = { point: `Week ${week}` };
          let weeklyTotal = 0;
          
          // Get week 1 attendance and current attendance
          const initialAttendance = metadata.initialWeeklyAttendance;
          let currentAttendance = initialAttendance;
          
          // Calculate attendance with growth if applicable
          if (week > 1 && metadata.growth) {
            const growthRate = metadata.growth.attendanceGrowthRate / 100;
            currentAttendance = initialAttendance * Math.pow(1 + growthRate, week - 1);
          }

          // Calculate F&B revenue for this week
          let fbSpendPerCustomer = metadata.perCustomer?.fbSpend || 0;
          if (week > 1 && metadata.growth?.useCustomerSpendGrowth) {
            const fbSpendGrowthRate = (metadata.growth.fbSpendGrowth || 0) / 100;
            fbSpendPerCustomer *= Math.pow(1 + fbSpendGrowthRate, week - 1);
          }
          const fbRevenue = currentAttendance * fbSpendPerCustomer;
          
          // Add regular costs
          costs.forEach(cost => {
            const costType = cost.type?.toLowerCase();
            const safeName = cost.name.replace(/[^a-zA-Z0-9]/g, "");
            let costValue = 0;
            
            if (costType === "fixed") {
              // Fixed costs only apply in the first period (week 1 or month 1)
              costValue = week === 1 ? cost.value : 0;
            } else if (costType === "variable") {
              // Special handling for F&B COGS - should be exactly the percentage of F&B revenue
              if (cost.name === "F&B COGS") {
                const cogsPct = metadata.costs?.fbCOGSPercent || 30;
                costValue = (fbRevenue * cogsPct) / 100;
              } else {
                costValue = cost.value;
                if (week > 1) {
                  const growthRate = metadata.growth?.useCustomerSpendGrowth 
                    ? metadata.growth?.fbSpendGrowth / 100 
                    : (growthModel?.rate || 0);
                  costValue *= Math.pow(1 + growthRate, week - 1);
                }
              }
            } else if (costType === "recurring") {
              // Recurring costs apply every week
              // Special handling for Setup Costs if they are marked as recurring
              if (cost.name === "Setup Costs" && metadata.weeks > 0) { 
                 // Spread the setup cost evenly across all weeks (based on type being recurring)
                 costValue = cost.value / metadata.weeks;
              } else {
                 // Regular recurring cost (or Setup Cost if metadata.weeks <= 0), apply the full value
                 costValue = cost.value;
              }
            } else {
              // Default behavior for unknown types (maybe log a warning?)
              // For now, treat as recurring for safety, but might need refinement
              costValue = cost.value;
            }
            
            point[safeName] = Math.ceil(costValue);
            weeklyTotal += costValue;
          });
          
          // --- Calculate Marketing Cost based on mode ---
          let periodMarketingCost = 0;
          if (currentMarketingSetup.allocationMode === 'channels') {
             periodMarketingCost = currentMarketingSetup.channels.reduce((sum, ch) => sum + (ch.weeklyBudget || 0), 0);
          } else if (currentMarketingSetup.allocationMode === 'highLevel' && currentMarketingSetup.totalBudget) {
             const totalBudget = currentMarketingSetup.totalBudget;
             const application = currentMarketingSetup.budgetApplication || 'spreadEvenly';
             const modelDuration = duration; // Use calculated model duration
             
             if (application === 'upfront') {
                periodMarketingCost = (week === 1) ? totalBudget : 0;
             } else if (application === 'spreadEvenly') {
                periodMarketingCost = totalBudget / modelDuration; 
             } else if (application === 'spreadCustom' && currentMarketingSetup.spreadDuration && currentMarketingSetup.spreadDuration > 0) {
                const spreadDuration = currentMarketingSetup.spreadDuration;
                periodMarketingCost = (week <= spreadDuration) ? (totalBudget / spreadDuration) : 0;
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
         const modelDuration = duration; // Use calculated model duration (likely 12 months)

         for (let month = 1; month <= months; month++) {
           const point: TrendDataPoint = { point: `Month ${month}` };
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
                  const { rate } = growthModel || { rate: 0 };
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
               const totalWeeklyBudget = currentMarketingSetup.channels.reduce((sum, ch) => sum + (ch.weeklyBudget || 0), 0);
               periodMarketingCost = totalWeeklyBudget * (365.25 / 7 / 12); 
           } else if (currentMarketingSetup.allocationMode === 'highLevel' && currentMarketingSetup.totalBudget) {
               const totalBudget = currentMarketingSetup.totalBudget;
               const application = currentMarketingSetup.budgetApplication || 'spreadEvenly';
              
               if (application === 'upfront') {
                 periodMarketingCost = (month === 1) ? totalBudget : 0;
               } else if (application === 'spreadEvenly') {
                 periodMarketingCost = totalBudget / modelDuration; 
               } else if (application === 'spreadCustom' && currentMarketingSetup.spreadDuration && currentMarketingSetup.spreadDuration > 0) {
                 const spreadDuration = currentMarketingSetup.spreadDuration;
                 periodMarketingCost = (month <= spreadDuration) ? (totalBudget / spreadDuration) : 0;
               }
           }

           // Add calculated marketing cost
           if (periodMarketingCost > 0) {
             point["MarketingBudget"] = Math.ceil(periodMarketingCost);
             monthlyTotal += periodMarketingCost;
           }
           
           point.costs = Math.ceil(monthlyTotal);

           if (month === 1) {
             point.cumulativeCosts = Math.ceil(monthlyTotal);
           } else {
             point.cumulativeCosts = Math.ceil(data[month - 2].cumulativeCosts + monthlyTotal);
           }
           
           data.push(point);
         }
      }
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
      isWeeklyEvent
  ]);

  // Ref to store the previous costData string representation
  const prevCostDataStringRef = useRef<string | null>(null);
  
  // Dynamically generate the cost keys for the chart - MOVED BEFORE EARLY RETURN
  const costKeys = useMemo(() => {
    if (!costData || costData.length === 0) {
      return [];
    }
    
    const keys = new Set<string>();
    costs.forEach(cost => {
        keys.add(cost.name.replace(/[^a-zA-Z0-9]/g, ""));
    });
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
    
    return sortedKeys;

  }, [costs, costData]);

  useEffect(() => {
    if (onUpdateCostData && costData) { 
      const currentCostDataString = JSON.stringify(costData);
      // Only call update if the stringified data has actually changed
      if (currentCostDataString !== prevCostDataStringRef.current) {
          onUpdateCostData(costData);
          // Update the ref to the current stringified data
          prevCostDataStringRef.current = currentCostDataString;
      } else {
          // Data reference changed but content is the same, skipping update.
      }
    }
    // Dependencies remain costData (the result of useMemo) and the callback
  }, [costData, onUpdateCostData]);
  
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
              tickFormatter={(value) => formatCurrency(value)}
            />
            <Tooltip 
              formatter={(value: number, name: string) => [
                  formatCurrency(value),
                  name
              ]}
              labelFormatter={(label) => `${label}`}
            />
            <Legend />

            {/* Map over the SORTED costKeys */}
            {costKeys.map((key) => { 
                const color = getColor(key);
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
