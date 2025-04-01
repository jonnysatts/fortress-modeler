
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
  AreaChart,
  Area,
} from "recharts";

interface CostTrendsProps {
  model: FinancialModel;
}

const CostTrends = ({ model }: CostTrendsProps) => {
  const [timePoints, setTimePoints] = useState<number>(12);
  const isWeeklyEvent = model.assumptions.metadata?.type === "WeeklyEvent";
  const timeUnit = isWeeklyEvent ? "Week" : "Month";

  const calculateCostTrends = () => {
    try {
      const data = [];
      const isWeeklyEvent = model.assumptions.metadata?.type === "WeeklyEvent";
      const costItems = model.assumptions.costs;
      
      if (isWeeklyEvent && model.assumptions.metadata) {
        const metadata = model.assumptions.metadata;
        const weeks = Math.min(metadata.weeks || 12, timePoints);
        
        // Map cost categories to colors for consistent visualization
        const categoryColors: Record<string, string> = {
          "Operations": "#ff8042",
          "Marketing": "#ffc658",
          "Staffing": "#82ca9d",
          "Administration": "#0088fe",
        };
        
        for (let week = 0; week <= weeks; week++) {
          const point: any = { point: week === 0 ? "Start" : `Week ${week}` };
          
          // Calculate attendance with compounding growth for variable costs
          let currentAttendance = metadata.initialWeeklyAttendance;
          if (week > 0) {
            const growthRate = metadata.growth?.attendanceGrowthRate / 100 || model.assumptions.growthModel.rate;
            currentAttendance = metadata.initialWeeklyAttendance * Math.pow(1 + growthRate, week);
          }
          
          // Calculate each cost with appropriate growth
          let totalCosts = 0;
          costItems.forEach(cost => {
            let costValue = cost.value;
            
            // Apply different growth rates based on cost type
            if (week > 0) {
              if (cost.type === "Variable") {
                // Variable costs scale with attendance
                const attendanceRatio = currentAttendance / metadata.initialWeeklyAttendance;
                costValue = cost.value * attendanceRatio;
              } else {
                // Fixed costs grow at 70% of the revenue growth rate
                const growthRate = model.assumptions.growthModel.rate * 0.7;
                costValue = cost.value * Math.pow(1 + growthRate, week);
              }
              
              // Special handling for setup costs
              if (cost.name === "Setup Costs") {
                if (metadata.costs?.spreadSetupCosts) {
                  // Evenly spread across all weeks
                  costValue = cost.value / weeks;
                } else if (week > 0) {
                  // One-time cost at the beginning
                  costValue = 0;
                }
              }
            }
            
            const safeName = cost.name.replace(/[^a-zA-Z0-9]/g, "");
            point[safeName] = Math.round(costValue * 100) / 100;
            point[`${safeName}Color`] = categoryColors[cost.category] || "#999999";
            totalCosts += costValue;
          });
          
          // Special handling for F&B COGS based on F&B revenue
          if (isWeeklyEvent && metadata && metadata.perCustomer?.fbSpend) {
            const fbRevenueStream = model.assumptions.revenue.find(rev => rev.name === "F&B Sales");
            if (fbRevenueStream) {
              let fbRevenue = fbRevenueStream.value;
              if (week > 0) {
                fbRevenue = fbRevenueStream.value * Math.pow(1 + model.assumptions.growthModel.rate, week);
              }
              
              const fbCogsPercent = metadata.costs?.fbCOGSPercent || 30;
              const fbCogs = (fbRevenue * fbCogsPercent) / 100;
              
              // Adjust or add to the total costs
              const fbCogsItem = costItems.find(cost => cost.name === "F&B COGS");
              if (fbCogsItem) {
                // If F&B COGS exists in costs, update its value
                const safeName = fbCogsItem.name.replace(/[^a-zA-Z0-9]/g, "");
                point[safeName] = Math.round(fbCogs * 100) / 100;
                totalCosts = totalCosts - fbCogsItem.value + fbCogs;
              } else {
                // If F&B COGS doesn't exist, add it
                point["FBCOGs"] = Math.round(fbCogs * 100) / 100;
                totalCosts += fbCogs;
              }
            }
          }
          
          point.total = Math.round(totalCosts * 100) / 100;
          data.push(point);
        }
      } else {
        const months = timePoints;
        
        for (let month = 0; month <= months; month++) {
          const point: any = { point: month === 0 ? "Start" : `Month ${month}` };
          
          let totalCosts = 0;
          costItems.forEach(cost => {
            let costValue = cost.value;
            if (month > 0) {
              // Apply growth model with reduced rate for costs
              const growthRate = model.assumptions.growthModel.rate * 0.7;
              costValue = cost.value * Math.pow(1 + growthRate, month);
            }
            
            const safeName = cost.name.replace(/[^a-zA-Z0-9]/g, "");
            point[safeName] = Math.round(costValue * 100) / 100;
            totalCosts += costValue;
          });
          
          point.total = Math.round(totalCosts * 100) / 100;
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
  
  if (!trendData || trendData.length === 0) {
    return (
      <div className="p-4 border border-red-200 rounded-md bg-red-50">
        <p className="text-red-600">
          Unable to generate cost trends. There might be an issue with the model data.
        </p>
      </div>
    );
  }

  // Prepare data for each cost item
  const costItems = model.assumptions.costs;
  
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
              tickFormatter={(value) => value === "Start" ? value : value.split(" ")[1]}
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
            {costItems.map((cost, index) => {
              const safeName = cost.name.replace(/[^a-zA-Z0-9]/g, "");
              const colors = [
                "#ff8042", "#ffc658", "#82ca9d", "#0088fe", "#8884d8", 
                "#FF8042", "#00C49F", "#FFBB28", "#9370DB", "#3366cc"
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

      <div className="mt-4">
        <h4 className="text-sm font-medium mb-2">Period-by-Period Cost Details</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-3">{timeUnit}</th>
                {costItems.map((cost, idx) => (
                  <th key={idx} className="text-right py-2 px-3">{cost.name}</th>
                ))}
                <th className="text-right py-2 px-3 font-bold">Total Costs</th>
              </tr>
            </thead>
            <tbody>
              {trendData.map((period, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? "bg-gray-50" : ""}>
                  <td className="py-2 px-3">{period.point}</td>
                  {costItems.map((cost, costIdx) => {
                    const safeName = cost.name.replace(/[^a-zA-Z0-9]/g, "");
                    return (
                      <td key={costIdx} className="text-right py-2 px-3">
                        ${period[safeName]?.toLocaleString() || "0"}
                      </td>
                    );
                  })}
                  <td className="text-right py-2 px-3 font-bold">
                    ${period.total.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CostTrends;
