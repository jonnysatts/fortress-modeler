
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
} from "recharts";

interface ModelProjectionsProps {
  model: FinancialModel;
}

const ModelProjections = ({ model }: ModelProjectionsProps) => {
  const [projectionMonths, setProjectionMonths] = useState<number>(12);

  // Validate model data to avoid errors
  if (!model || !model.assumptions || !model.assumptions.growthModel) {
    return (
      <div className="p-4 border border-red-200 rounded-md bg-red-50">
        <p className="text-red-600">
          Unable to generate projections. Model data is incomplete or invalid.
        </p>
      </div>
    );
  }

  // Calculate projections based on model assumptions
  const calculateProjections = () => {
    try {
      const data = [];
      const isWeeklyEvent = model.assumptions.metadata?.type === "WeeklyEvent";
      
      // Initial values
      const totalInitialRevenue = model.assumptions.revenue.reduce(
        (sum, item) => sum + item.value,
        0
      );
      const totalInitialCosts = model.assumptions.costs.reduce(
        (sum, item) => sum + item.value,
        0
      );

      // Handle weekly event models with per-customer revenue approach
      if (isWeeklyEvent && model.assumptions.metadata) {
        const metadata = model.assumptions.metadata;
        const weeks = metadata.weeks || 12;
        const timePoints = Math.min(weeks, projectionMonths) + 1; // +1 for starting point
        
        let currentAttendance = metadata.initialWeeklyAttendance;
        let currentPerCustomer = { ...metadata.perCustomer };
        
        for (let week = 0; week <= weeks; week++) {
          if (week > timePoints - 1) break; // Only calculate up to our projection limit
          
          // Calculate attendance for this week
          if (week > 0) {
            currentAttendance = metadata.initialWeeklyAttendance * 
              (1 + (metadata.growth.attendanceGrowthRate / 100) * week);
          }
          
          // Calculate per-customer spending for this week
          if (week > 0 && metadata.growth.useCustomerSpendGrowth) {
            currentPerCustomer = {
              ticketPrice: metadata.perCustomer.ticketPrice * 
                (1 + (metadata.growth.ticketPriceGrowth / 100) * week),
              fbSpend: metadata.perCustomer.fbSpend * 
                (1 + (metadata.growth.fbSpendGrowth / 100) * week),
              merchandiseSpend: metadata.perCustomer.merchandiseSpend * 
                (1 + (metadata.growth.merchandiseSpendGrowth / 100) * week),
              onlineSpend: metadata.perCustomer.onlineSpend * 
                (1 + (metadata.growth.onlineSpendGrowth / 100) * week),
              miscSpend: metadata.perCustomer.miscSpend * 
                (1 + (metadata.growth.miscSpendGrowth / 100) * week),
            };
          }
          
          // Calculate weekly revenue
          const weeklyRevenue = {
            ticketSales: currentAttendance * (currentPerCustomer.ticketPrice || 0),
            fbSales: currentAttendance * (currentPerCustomer.fbSpend || 0),
            merchandiseSales: currentAttendance * (currentPerCustomer.merchandiseSpend || 0),
            onlineSales: currentAttendance * (currentPerCustomer.onlineSpend || 0),
            miscRevenue: currentAttendance * (currentPerCustomer.miscSpend || 0),
          };
          
          const totalRevenue = Object.values(weeklyRevenue).reduce((sum, val) => sum + val, 0);
          
          // Calculate costs
          const fbCOGS = (weeklyRevenue.fbSales * (metadata.costs.fbCOGSPercent || 30)) / 100;
          const staffCosts = (metadata.costs.staffCount || 0) * (metadata.costs.staffCostPerPerson || 0);
          
          // Setup costs handling
          let setupCostsForWeek = 0;
          if (metadata.costs.spreadSetupCosts) {
            setupCostsForWeek = (metadata.costs.setupCosts || 0) / weeks;
          } else if (week === 0) {
            setupCostsForWeek = metadata.costs.setupCosts || 0;
          }
          
          const totalCosts = fbCOGS + staffCosts + (metadata.costs.managementCosts || 0) + setupCostsForWeek;
          
          data.push({
            point: week === 0 ? "Start" : `Week ${week}`,
            revenue: Math.round(totalRevenue * 100) / 100,
            costs: Math.round(totalCosts * 100) / 100,
            profit: Math.round((totalRevenue - totalCosts) * 100) / 100,
            attendance: Math.round(currentAttendance),
          });
        }
      } else {
        // Original logic for non-event models
        // Initialize revenue and costs
        let currentRevenue = totalInitialRevenue;
        let currentCosts = totalInitialCosts;

        for (let month = 0; month <= projectionMonths; month++) {
          // Calculate growth based on model type
          const { type, rate, seasonalFactors } = model.assumptions.growthModel;
          
          if (month > 0) {
            if (type === "linear") {
              // Linear growth: add a fixed amount each period
              currentRevenue = totalInitialRevenue * (1 + rate * month);
            } else if (type === "exponential") {
              // Exponential growth: compound growth
              currentRevenue = totalInitialRevenue * Math.pow(1 + rate, month);
            } else if (type === "seasonal" && seasonalFactors && seasonalFactors.length > 0) {
              // Seasonal growth: apply seasonal factors in rotation
              const seasonIndex = (month - 1) % seasonalFactors.length;
              const seasonFactor = seasonalFactors[seasonIndex];
              currentRevenue = totalInitialRevenue * Math.pow(1 + rate, month) * seasonFactor;
            } else {
              // Default to simple growth
              currentRevenue = totalInitialRevenue * (1 + rate * month);
            }

            // Simple growth for costs (typically doesn't grow as fast as revenue)
            currentCosts = totalInitialCosts * (1 + (rate * 0.7) * month);
          }

          // Calculate profit
          const profit = currentRevenue - currentCosts;

          // Add data point
          data.push({
            point: month === 0 ? "Start" : `Month ${month}`,
            revenue: Math.round(currentRevenue * 100) / 100,
            costs: Math.round(currentCosts * 100) / 100,
            profit: Math.round(profit * 100) / 100,
          });
        }
      }

      return data;
    } catch (error) {
      console.error("Error calculating projections:", error);
      return [];
    }
  };

  const projectionData = calculateProjections();
  
  // If we couldn't calculate projections, show an error
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Financial Projections</h3>
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

      <div className="w-full h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={projectionData}
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
                return [`$${value.toLocaleString()}`, name.charAt(0).toUpperCase() + name.slice(1)];
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="revenue"
              name="Revenue"
              stroke="#4CAF50"
              strokeWidth={2}
              activeDot={{ r: 8 }}
            />
            <Line
              type="monotone"
              dataKey="costs"
              name="Costs"
              stroke="#FF5722"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="profit"
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
                yAxisId="right" // Add this missing yAxisId to match the YAxis
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border rounded-lg p-4 bg-green-50">
          <h4 className="text-sm font-medium text-green-700">Final Revenue</h4>
          <p className="text-2xl font-bold text-green-800">
            ${finalDataPoint.revenue.toLocaleString()}
          </p>
          <p className="text-xs text-green-600">
            {projectionMonths} {timeUnit.toLowerCase()} projection
          </p>
        </div>

        <div className="border rounded-lg p-4 bg-red-50">
          <h4 className="text-sm font-medium text-red-700">Final Costs</h4>
          <p className="text-2xl font-bold text-red-800">
            ${finalDataPoint.costs.toLocaleString()}
          </p>
          <p className="text-xs text-red-600">
            {projectionMonths} {timeUnit.toLowerCase()} projection
          </p>
        </div>

        <div className="border rounded-lg p-4 bg-blue-50">
          <h4 className="text-sm font-medium text-blue-700">Final Profit</h4>
          <p className="text-2xl font-bold text-blue-800">
            ${finalDataPoint.profit.toLocaleString()}
          </p>
          <p className="text-xs text-blue-600">
            {projectionMonths} {timeUnit.toLowerCase()} projection
          </p>
        </div>
      </div>

      {isWeeklyEvent && 'attendance' in finalDataPoint && (
        <div className="border rounded-lg p-4 bg-purple-50">
          <h4 className="text-sm font-medium text-purple-700">Final Attendance</h4>
          <p className="text-2xl font-bold text-purple-800">
            {finalDataPoint.attendance?.toLocaleString() || "N/A"} customers
          </p>
          <p className="text-xs text-purple-600">
            Projected weekly attendance after {projectionMonths} weeks
          </p>
        </div>
      )}
    </div>
  );
};

export default ModelProjections;
