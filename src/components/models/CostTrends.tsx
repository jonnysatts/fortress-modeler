import { useState, useEffect } from "react";
import { FinancialModel } from "@/lib/db";
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

interface CostTrendsProps {
  model: FinancialModel;
  combinedData?: any[];
  onUpdateCostData?: (data: any[]) => void;
  shouldSpreadSetupCosts?: boolean;
}

const CostTrends = ({ model, combinedData, onUpdateCostData, shouldSpreadSetupCosts }: CostTrendsProps) => {
  const [timePoints, setTimePoints] = useState<number>(12);
  const isWeeklyEvent = model.assumptions.metadata?.type === "WeeklyEvent";
  const timeUnit = isWeeklyEvent ? "Week" : "Month";
  
  const calculateCostTrends = () => {
    try {
      const data = [];
      const costs = model.assumptions.costs;
      
      if (isWeeklyEvent && model.assumptions.metadata) {
        const metadata = model.assumptions.metadata;
        const weeks = Math.min(metadata.weeks || 12, timePoints);
        
        for (let week = 1; week <= weeks; week++) {
          const point: any = { point: `Week ${week}` };
          let weeklyTotal = 0;
          
          // Get week 1 attendance and current attendance
          const initialAttendance = metadata.initialWeeklyAttendance;
          let currentAttendance = initialAttendance;
          
          // Calculate attendance with growth if applicable
          if (week > 1 && metadata.growth) {
            const growthRate = metadata.growth.attendanceGrowthRate / 100;
            currentAttendance = initialAttendance * Math.pow(1 + growthRate, week - 1);
          }
          
          // Calculate F&B revenue to determine COGS correctly
          const fbRevenue = currentAttendance * (metadata.perCustomer?.fbSpend || 0);
          
          costs.forEach(cost => {
            const costType = cost.type?.toLowerCase();
            const safeName = cost.name.replace(/[^a-zA-Z0-9]/g, "");
            let costValue = 0;
            
            if (costType === "fixed") {
              // Critical fix: handle setup costs correctly
              if (cost.name === "Setup Costs") {
                if (shouldSpreadSetupCosts) {
                  // If spreading setup costs, divide by total weeks
                  costValue = cost.value / metadata.weeks;
                } else {
                  // Otherwise only show in week 1
                  costValue = week === 1 ? cost.value : 0;
                }
              } else {
                // For other fixed costs, only apply in week 1
                costValue = week === 1 ? cost.value : 0;
              }
            } else if (costType === "variable") {
              // Special handling for F&B COGS - should be exactly the percentage of F&B revenue
              if (cost.name === "F&B COGS") {
                const cogsPct = metadata.costs?.fbCOGSPercent || 30;
                costValue = (fbRevenue * cogsPct) / 100;
              } else {
                costValue = cost.value;
                if (week > 1) {
                  const growthRate = metadata.growth?.fbSpendGrowth / 100 || model.assumptions.growthModel.rate;
                  costValue *= Math.pow(1 + growthRate, week - 1);
                }
              }
            } else if (costType === "recurring") {
              costValue = cost.value;
            } else {
              costValue = cost.value;
            }
            
            point[safeName] = Math.ceil(costValue);
            weeklyTotal += costValue;
          });
          
          point.costs = Math.ceil(weeklyTotal);
          
          if (week === 1) {
            point.cumulativeCosts = Math.ceil(weeklyTotal);
          } else {
            point.cumulativeCosts = Math.ceil(data[week - 2].cumulativeCosts + weeklyTotal);
          }
          
          data.push(point);
        }
      } else {
        const months = timePoints;
        
        for (let month = 1; month <= months; month++) {
          const point: any = { point: `Month ${month}` };
          let monthlyTotal = 0;
          
          costs.forEach(cost => {
            const costType = cost.type?.toLowerCase();
            const safeName = cost.name.replace(/[^a-zA-Z0-9]/g, "");
            let costValue = 0;
            
            if (costType === "fixed") {
              costValue = month === 1 ? cost.value : 0;
            } else if (costType === "variable") {
              costValue = cost.value;
              if (month > 1) {
                const { rate } = model.assumptions.growthModel;
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
          
          point.total = Math.ceil(monthlyTotal);
          
          if (month === 1) {
            point.cumulativeTotal = Math.ceil(monthlyTotal);
          } else {
            point.cumulativeTotal = Math.ceil(data[month - 2].cumulativeTotal + monthlyTotal);
          }
          
          data.push(point);
        }
      }
      
      return data;
    } catch (error) {
      console.error("Error calculating cost trends:", error);
      return [];
    }
  };

  const trendData = calculateCostTrends();
  
  useEffect(() => {
    if (onUpdateCostData && trendData.length > 0) {
      onUpdateCostData(trendData);
    }
  }, [trendData, timePoints, onUpdateCostData]);
  
  if (!trendData || trendData.length === 0) {
    return (
      <div className="p-4 border border-red-200 rounded-md bg-red-50">
        <p className="text-red-600">
          Unable to generate cost trends. There might be an issue with the model data.
        </p>
      </div>
    );
  }
  
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
            data={trendData}
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
              formatter={(value: number) => [`$${Math.ceil(value).toLocaleString()}`, ""]} 
              labelFormatter={(label) => `${label}`}
            />
            <Legend />
            {model.assumptions.costs.map((cost, index) => {
              const safeName = cost.name.replace(/[^a-zA-Z0-9]/g, "");
              const colors = [
                "#ff8042", "#8884d8", "#82ca9d", "#ffc658", "#0088fe", 
                "#00c49f", "#ffbb28", "#9370db", "#3366cc"
              ];
              return (
                <Area
                  key={index}
                  type="monotone"
                  dataKey={safeName}
                  name={cost.name}
                  stackId="1"
                  stroke={colors[index % colors.length]}
                  fill={colors[index % colors.length]}
                />
              );
            })}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {!combinedData && (
        <FinancialMatrix 
          model={model} 
          trendData={trendData} 
          costData={true} 
          shouldSpreadSetupCosts={shouldSpreadSetupCosts}
        />
      )}
    </div>
  );
};

export default CostTrends;
