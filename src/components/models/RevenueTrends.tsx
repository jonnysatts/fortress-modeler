
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
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface RevenueTrendsProps {
  model: FinancialModel;
}

const RevenueTrends = ({ model }: RevenueTrendsProps) => {
  const [timePoints, setTimePoints] = useState<number>(12);
  const isWeeklyEvent = model.assumptions.metadata?.type === "WeeklyEvent";
  const timeUnit = isWeeklyEvent ? "Week" : "Month";

  const calculateRevenueTrends = () => {
    try {
      const data = [];
      const isWeeklyEvent = model.assumptions.metadata?.type === "WeeklyEvent";
      const revenueStreams = model.assumptions.revenue;
      
      if (isWeeklyEvent && model.assumptions.metadata) {
        const metadata = model.assumptions.metadata;
        const weeks = Math.min(metadata.weeks || 12, timePoints);
        
        // Map revenue names to colors for consistent visualization
        const colorMap: Record<string, string> = {
          "Ticket Sales": "#8884d8",
          "F&B Sales": "#82ca9d",
          "Merchandise Sales": "#ffc658",
          "Online Sales": "#ff8042",
          "Miscellaneous Revenue": "#0088fe",
        };
        
        let cumulativeTotal = 0;
        
        for (let week = 1; week <= weeks; week++) {
          const point: any = { point: `Week ${week}` };
          
          // Calculate attendance with compounding growth
          let currentAttendance = metadata.initialWeeklyAttendance;
          if (week > 1) {
            const growthRate = metadata.growth?.attendanceGrowthRate / 100 || model.assumptions.growthModel.rate;
            currentAttendance = metadata.initialWeeklyAttendance * Math.pow(1 + growthRate, week - 1);
          }
          
          // Calculate each revenue stream with growth
          let totalRevenue = 0;
          revenueStreams.forEach(stream => {
            let streamRevenue = stream.value;
            if (week > 1) {
              streamRevenue = stream.value * Math.pow(1 + model.assumptions.growthModel.rate, week - 1);
            }
            
            const safeName = stream.name.replace(/[^a-zA-Z0-9]/g, "");
            point[safeName] = Math.round(streamRevenue * 100) / 100;
            point[`${safeName}Color`] = colorMap[stream.name] || "#999999";
            totalRevenue += streamRevenue;
          });
          
          point.total = Math.round(totalRevenue * 100) / 100;
          cumulativeTotal += totalRevenue;
          point.cumulativeTotal = Math.round(cumulativeTotal * 100) / 100;
          data.push(point);
        }
      } else {
        const months = timePoints;
        let cumulativeTotal = 0;
        
        for (let month = 1; month <= months; month++) {
          const point: any = { point: `Month ${month}` };
          
          let totalRevenue = 0;
          revenueStreams.forEach(stream => {
            let streamRevenue = stream.value;
            if (month > 1) {
              // Apply growth model
              const { type, rate } = model.assumptions.growthModel;
              if (type === "linear") {
                streamRevenue = stream.value * (1 + rate * (month - 1));
              } else if (type === "exponential") {
                streamRevenue = stream.value * Math.pow(1 + rate, month - 1);
              } else {
                // Default
                streamRevenue = stream.value * Math.pow(1 + rate, month - 1);
              }
            }
            
            const safeName = stream.name.replace(/[^a-zA-Z0-9]/g, "");
            point[safeName] = Math.round(streamRevenue * 100) / 100;
            totalRevenue += streamRevenue;
          });
          
          point.total = Math.round(totalRevenue * 100) / 100;
          cumulativeTotal += totalRevenue;
          point.cumulativeTotal = Math.round(cumulativeTotal * 100) / 100;
          data.push(point);
        }
      }
      
      return data;
    } catch (error) {
      console.error("Error calculating revenue trends:", error);
      return [];
    }
  };

  const trendData = calculateRevenueTrends();
  
  if (!trendData || trendData.length === 0) {
    return (
      <div className="p-4 border border-red-200 rounded-md bg-red-50">
        <p className="text-red-600">
          Unable to generate revenue trends. There might be an issue with the model data.
        </p>
      </div>
    );
  }

  // Prepare line data for each revenue stream
  const revenueStreams = model.assumptions.revenue;
  const chartConfig = {};
  
  revenueStreams.forEach(stream => {
    const safeName = stream.name.replace(/[^a-zA-Z0-9]/g, "");
    chartConfig[safeName] = { label: stream.name };
  });
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Revenue Growth Over Time</h3>
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
            {revenueStreams.map((stream, index) => {
              const safeName = stream.name.replace(/[^a-zA-Z0-9]/g, "");
              const colors = [
                "#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#0088fe", 
                "#00C49F", "#FFBB28", "#FF8042", "#9370DB", "#3366cc"
              ];
              return (
                <Area
                  key={index}
                  type="monotone"
                  dataKey={safeName}
                  name={stream.name}
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
        <h4 className="text-sm font-medium mb-2">Period-by-Period Revenue Details</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-3">{timeUnit}</th>
                {revenueStreams.map((stream, idx) => (
                  <th key={idx} className="text-right py-2 px-3">{stream.name}</th>
                ))}
                <th className="text-right py-2 px-3 font-bold">Total Revenue</th>
                <th className="text-right py-2 px-3 font-bold">Cumulative Revenue</th>
              </tr>
            </thead>
            <tbody>
              {trendData.map((period, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? "bg-gray-50" : ""}>
                  <td className="py-2 px-3">{period.point}</td>
                  {revenueStreams.map((stream, streamIdx) => {
                    const safeName = stream.name.replace(/[^a-zA-Z0-9]/g, "");
                    return (
                      <td key={streamIdx} className="text-right py-2 px-3">
                        ${period[safeName]?.toLocaleString() || "0"}
                      </td>
                    );
                  })}
                  <td className="text-right py-2 px-3 font-bold">
                    ${period.total.toLocaleString()}
                  </td>
                  <td className="text-right py-2 px-3 font-bold text-green-700">
                    ${period.cumulativeTotal.toLocaleString()}
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

export default RevenueTrends;
