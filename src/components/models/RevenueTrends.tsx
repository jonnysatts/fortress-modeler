import { useState, useEffect, useMemo } from "react";
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

// Define a type for the trend data points
interface TrendDataPoint {
  point: string; // e.g., "Week 1", "Month 1"
  revenue?: number; // Total revenue for the period
  cumulativeRevenue?: number; // Cumulative revenue
  total?: number; // For monthly models, might use 'total' instead of 'revenue'
  cumulativeTotal?: number; // For monthly models
  attendance?: number; // Optional attendance
  [key: string]: string | number | undefined; // Allow dynamic keys for revenue streams like 'TicketSales', 'FBSales'
}

interface RevenueTrendsProps {
  model: FinancialModel;
  combinedData?: TrendDataPoint[]; // Use specific type
  setCombinedData: (data: TrendDataPoint[]) => void; // Use specific type
}

const RevenueTrends = ({ model, combinedData, setCombinedData }: RevenueTrendsProps) => {
  const [timePoints, setTimePoints] = useState<number>(12);
  const isWeeklyEvent = model.assumptions.metadata?.type === "WeeklyEvent";
  const timeUnit = isWeeklyEvent ? "Week" : "Month";

  const trendData: TrendDataPoint[] = useMemo(() => {
    console.log("[RevenueTrends] Recalculating trendData...");
    try {
      const data: TrendDataPoint[] = []; // Use specific type
      if (!model?.assumptions?.revenue || !model?.assumptions?.metadata) return [];
      
      const isWeeklyEvent = model.assumptions.metadata?.type === "WeeklyEvent";
      const revenueStreams = model.assumptions.revenue;
      
      if (isWeeklyEvent && model.assumptions.metadata) {
        const metadata = model.assumptions.metadata;
        const weeks = Math.min(metadata.weeks || 12, timePoints);
        
        const colorMap: Record<string, string> = {
          "Ticket Sales": "#8884d8",
          "F&B Sales": "#82ca9d",
          "Merchandise Sales": "#ffc658",
          "Online Sales": "#ff8042",
          "Miscellaneous Revenue": "#0088fe",
        };
        
        let cumulativeTotal = 0;
        
        for (let week = 1; week <= weeks; week++) {
          const point: TrendDataPoint = { point: `Week ${week}` }; // Initialize with type
          
          let currentAttendance = metadata.initialWeeklyAttendance || 0;
          if (week > 1 && metadata.growth) { 
            const attendanceGrowthRate = (metadata.growth.attendanceGrowthRate || 0) / 100;
            currentAttendance = (metadata.initialWeeklyAttendance || 0) * Math.pow(1 + attendanceGrowthRate, week - 1);
          }
          
          let totalRevenue = 0;
          revenueStreams.forEach(stream => {
            let streamBaseValue = 0;
            let streamRevenue = 0;
            
            if (stream.name === "F&B Sales") {
              let fbSpendPerCustomer = metadata.perCustomer?.fbSpend || 0;
              if (week > 1 && metadata.growth?.useCustomerSpendGrowth) {
                const fbSpendGrowthRate = (metadata.growth.fbSpendGrowth || 0) / 100;
                fbSpendPerCustomer *= Math.pow(1 + fbSpendGrowthRate, week - 1);
              }
              streamRevenue = currentAttendance * fbSpendPerCustomer;
            } else if (stream.name === "Merchandise Sales") {
              let merchSpendPerCustomer = metadata.perCustomer?.merchandiseSpend || 0;
              if (week > 1 && metadata.growth?.useCustomerSpendGrowth) {
                const merchSpendGrowthRate = (metadata.growth.merchandiseSpendGrowth || 0) / 100;
                merchSpendPerCustomer *= Math.pow(1 + merchSpendGrowthRate, week - 1);
              }
              streamRevenue = currentAttendance * merchSpendPerCustomer;
            } else {
              streamBaseValue = stream.value; 
              streamRevenue = streamBaseValue;
              if (week > 1) {
                let growthRateToApply = 0;
                if (metadata.growth?.useCustomerSpendGrowth) {
                  switch(stream.name) {
                    case "Ticket Sales": growthRateToApply = (metadata.growth.ticketPriceGrowth || 0) / 100; break;
                    case "Online Sales": growthRateToApply = (metadata.growth.onlineSpendGrowth || 0) / 100; break;
                    case "Miscellaneous Revenue": growthRateToApply = (metadata.growth.miscSpendGrowth || 0) / 100; break;
                  }
                  streamRevenue = streamBaseValue * Math.pow(1 + growthRateToApply, week - 1);
                } 
              }
            }
            
            const safeName = stream.name.replace(/[^a-zA-Z0-9]/g, "");
            point[safeName] = Math.ceil(streamRevenue);
            point[`${safeName}Color`] = colorMap[stream.name] || "#999999";
            totalRevenue += streamRevenue;
          });
          
          point.revenue = Math.ceil(totalRevenue);
          cumulativeTotal += totalRevenue;
          point.cumulativeRevenue = Math.ceil(cumulativeTotal);
          point.attendance = Math.round(currentAttendance);
          data.push(point);
        }
      } else {
        if (!model.assumptions.growthModel) return [];
        const months = timePoints;
        let cumulativeTotal = 0;
        
        for (let month = 1; month <= months; month++) {
          const point: TrendDataPoint = { point: `Month ${month}` }; // Initialize with type
          let totalRevenue = 0;
          revenueStreams.forEach(stream => {
            let streamRevenue = stream.value;
            if (month > 1) {
              const { type, rate } = model.assumptions.growthModel;
              if (type === "linear") {
                streamRevenue = stream.value * (1 + rate * (month - 1));
              } else {
                streamRevenue = stream.value * Math.pow(1 + rate, month - 1);
              }
            }
            const safeName = stream.name.replace(/[^a-zA-Z0-9]/g, "");
            point[safeName] = Math.ceil(streamRevenue);
            totalRevenue += streamRevenue;
          });
          
          point.total = Math.ceil(totalRevenue);
          cumulativeTotal += totalRevenue;
          point.cumulativeTotal = Math.ceil(cumulativeTotal);
          data.push(point);
        }
      }
      return data;
    } catch (error) {
      console.error("Error calculating revenue trends:", error);
      return [];
    }
  }, [model, timePoints]);

  useEffect(() => {
    if (setCombinedData && trendData) {
      console.log("[RevenueTrends] Calling setCombinedData");
      setCombinedData(trendData);
    }
  }, [trendData, setCombinedData]);
  
  if (!trendData || trendData.length === 0) {
    return (
      <div className="p-4 border border-red-200 rounded-md bg-red-50">
        <p className="text-red-600">
          Unable to generate revenue trends. There might be an issue with the model data.
        </p>
      </div>
    );
  }

  const revenueStreams = model.assumptions.revenue;
  // Define chartConfig type
  const chartConfig: Record<string, { label: string }> = {}; 
  
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
              tickFormatter={(value) => `$${Math.ceil(value).toLocaleString()}`}
            />
            <Tooltip 
              formatter={(value: number) => [`$${Math.ceil(value).toLocaleString()}`, ""]}
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

      {/* Only render the FinancialMatrix when we're not in combined view */}
      {!combinedData && (
        <FinancialMatrix 
          model={model} 
          trendData={trendData} 
          revenueData={true} 
        />
      )}
    </div>
  );
};

export default RevenueTrends;
