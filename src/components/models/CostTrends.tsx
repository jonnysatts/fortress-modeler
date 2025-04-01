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
}

const CostTrends = ({ model, combinedData, onUpdateCostData }: CostTrendsProps) => {
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
        
        // Map cost types to colors
        const colorMap = {
          fixed: "#FF8042",
          variable: "#8884D8",
          recurring: "#82CA9D"
        };

        let cumulativeTotal = 0;
        
        // Generate data for each week
        for (let week = 1; week <= weeks; week++) {
          const point: any = { point: `Week ${week}` };
          let totalCost = 0;
          
          costs.forEach(cost => {
            let costValue = 0; // Default to 0
            const costType = cost.type?.toLowerCase();
            
            // Handle different cost types
            if (costType === "fixed") {
              // Fixed costs (setup costs) are only applied in week 1 or spread across all weeks
              if (metadata.costs?.spreadSetupCosts) {
                costValue = cost.value / weeks; // Spread evenly
              } else if (week === 1) {
                costValue = cost.value; // Apply only in first week
              }
            } else if (costType === "variable") {
              // Variable costs like F&B COGS grow with revenue
              costValue = cost.value;
              if (week > 1) {
                const fbGrowthRate = metadata.growth?.fbSpendGrowth / 100 || model.assumptions.growthModel.rate;
                costValue *= Math.pow(1 + fbGrowthRate, week - 1);
              }
            } else if (costType === "recurring") {
              // Recurring costs remain constant each week
              costValue = cost.value;
            }
            
            const safeName = cost.name.replace(/[^a-zA-Z0-9]/g, "");
            point[safeName] = Math.round(costValue * 100) / 100;
            totalCost += costValue;
          });
          
          point.costs = Math.round(totalCost * 100) / 100;
          cumulativeTotal += totalCost;
          point.cumulativeCosts = Math.round(cumulativeTotal * 100) / 100;
          data.push(point);
        }
      } else {
        const months = timePoints;
        let cumulativeTotal = 0;
        
        // Generate data for each month
        for (let month = 1; month <= months; month++) {
          const point: any = { point: `Month ${month}` };
          let totalCost = 0;
          
          costs.forEach(cost => {
            let costValue = 0; // Default to 0
            const costType = cost.type?.toLowerCase();
            
            // Handle different cost types for monthly model
            if (costType === "fixed") {
              // Fixed costs are only applied in month 1
              if (month === 1) {
                costValue = cost.value;
              }
            } else if (costType === "variable") {
              // Variable costs grow with the model's growth rate
              costValue = cost.value;
              if (month > 1) {
                const { rate } = model.assumptions.growthModel;
                costValue *= Math.pow(1 + rate, month - 1);
              }
            } else if (costType === "recurring") {
              // Recurring costs remain constant each month
              costValue = cost.value;
            }
            
            const safeName = cost.name.replace(/[^a-zA-Z0-9]/g, "");
            point[safeName] = Math.round(costValue * 100) / 100;
            totalCost += costValue;
          });
          
          point.total = Math.round(totalCost * 100) / 100;
          cumulativeTotal += totalCost;
          point.cumulativeTotal = Math.round(cumulativeTotal * 100) / 100;
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
  
  // Use useEffect to update combined data to prevent infinite render loops
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
              tickFormatter={(value) => `$${value.toLocaleString()}`}
            />
            <Tooltip 
              formatter={(value: number) => [`$${value.toLocaleString()}`, ""]} 
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

      {/* Only render the FinancialMatrix when we're not in combined view */}
      {!combinedData && (
        <FinancialMatrix 
          model={model} 
          trendData={trendData} 
          costData={true} 
        />
      )}
    </div>
  );
};

export default CostTrends;
