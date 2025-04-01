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
  shouldSpreadSetupCosts?: boolean;
}

const ModelProjections = ({ model, shouldSpreadSetupCosts }: ModelProjectionsProps) => {
  const [projectionMonths, setProjectionMonths] = useState<number>(12);
  const [showCumulative, setShowCumulative] = useState<boolean>(true);

  if (!model || !model.assumptions || !model.assumptions.growthModel) {
    return (
      <div className="p-4 border border-red-200 rounded-md bg-red-50">
        <p className="text-red-600">
          Unable to generate projections. Model data is incomplete or invalid.
        </p>
      </div>
    );
  }

  const calculateProjections = () => {
    try {
      const data = [];
      const isWeeklyEvent = model.assumptions.metadata?.type === "WeeklyEvent";
      
      const totalInitialRevenue = model.assumptions.revenue.reduce(
        (sum, item) => sum + item.value,
        0
      );
      const totalInitialCosts = model.assumptions.costs.reduce(
        (sum, item) => sum + item.value,
        0
      );

      if (isWeeklyEvent && model.assumptions.metadata) {
        const metadata = model.assumptions.metadata;
        const weeks = metadata.weeks || 12;
        const timePoints = Math.min(weeks, projectionMonths) + 1; // +1 for starting point
        
        // Find the setup cost item from the main costs array
        const setupCostItem = model.assumptions.costs.find(cost => cost.name === "Setup Costs");
        const setupCostValue = setupCostItem?.value || 0;
        const isSetupCostFixed = setupCostItem?.type === 'fixed';
        
        let totalCumulativeRevenue = 0;
        let totalCumulativeCosts = 0;
        let totalCumulativeProfit = 0;
        let totalAttendance = 0;
        
        for (let week = 0; week <= weeks; week++) {
          if (week > timePoints - 1) break;
          
          // Calculate attendance with compounding growth rate
          let currentAttendance = metadata.initialWeeklyAttendance;
          if (week > 0) {
            // Use compound growth formula: initialValue * (1 + rate)^time
            const growthRate = metadata.growth.attendanceGrowthRate / 100;
            currentAttendance = metadata.initialWeeklyAttendance * 
              Math.pow(1 + growthRate, week);
          }
          
          // Round and add to total attendance
          const roundedAttendance = Math.round(currentAttendance);
          totalAttendance += roundedAttendance;
          
          // Handle per-customer metrics with proper growth rates
          let currentPerCustomer = { ...metadata.perCustomer };
          if (week > 0 && metadata.growth.useCustomerSpendGrowth) {
            const ticketGrowthRate = metadata.growth.ticketPriceGrowth / 100;
            const fbSpendGrowthRate = metadata.growth.fbSpendGrowth / 100;
            const merchGrowthRate = metadata.growth.merchandiseSpendGrowth / 100;
            const onlineGrowthRate = metadata.growth.onlineSpendGrowth / 100;
            const miscGrowthRate = metadata.growth.miscSpendGrowth / 100;
            
            // Apply compound growth to each revenue stream
            currentPerCustomer = {
              ticketPrice: metadata.perCustomer.ticketPrice * 
                Math.pow(1 + ticketGrowthRate, week),
              fbSpend: metadata.perCustomer.fbSpend * 
                Math.pow(1 + fbSpendGrowthRate, week),
              merchandiseSpend: metadata.perCustomer.merchandiseSpend * 
                Math.pow(1 + merchGrowthRate, week),
              onlineSpend: metadata.perCustomer.onlineSpend * 
                Math.pow(1 + onlineGrowthRate, week),
              miscSpend: metadata.perCustomer.miscSpend * 
                Math.pow(1 + miscGrowthRate, week),
            };
          }
          
          // Calculate revenue based on attendance and per-customer values
          const weeklyRevenue = {
            ticketSales: roundedAttendance * (currentPerCustomer.ticketPrice || 0),
            fbSales: roundedAttendance * (currentPerCustomer.fbSpend || 0),
            merchandiseSales: roundedAttendance * (currentPerCustomer.merchandiseSpend || 0),
            onlineSales: roundedAttendance * (currentPerCustomer.onlineSpend || 0),
            miscRevenue: roundedAttendance * (currentPerCustomer.miscSpend || 0),
          };
          
          const totalWeeklyRevenue = Object.values(weeklyRevenue).reduce((sum, val) => sum + val, 0);
          
          // Calculate costs that depend on revenue
          const fbCOGS = (weeklyRevenue.fbSales * (metadata.costs.fbCOGSPercent || 30)) / 100;
          const staffCosts = (metadata.costs.staffCount || 0) * (metadata.costs.staffCostPerPerson || 0);
          
          // Calculate setup costs for the week based on its type ('fixed' or 'recurring')
          let setupCostsForWeek = 0;
          if (setupCostItem) { // Check if setup cost item exists
            if (isSetupCostFixed) {
              // Fixed costs only apply to week 1 (not week 0, the starting point)
              setupCostsForWeek = week === 1 ? setupCostValue : 0;
            } else { // Assumed recurring (spread)
              // Spread costs apply to weeks > 0
              if (week > 0 && weeks > 0) {
                setupCostsForWeek = setupCostValue / weeks;
              }
            }
          }
          
          // Removed direct dependency on metadata.costs.setupCosts and shouldSpreadSetupCosts prop here
          // const totalWeeklyCosts = fbCOGS + staffCosts + (metadata.costs.managementCosts || 0) + setupCostsForWeek;
          const managementCosts = metadata.costs?.managementCosts || 0; // Get management costs from metadata
          const totalWeeklyCosts = fbCOGS + staffCosts + managementCosts + setupCostsForWeek;

          const weeklyProfit = totalWeeklyRevenue - totalWeeklyCosts;
          
          totalCumulativeRevenue += totalWeeklyRevenue;
          totalCumulativeCosts += totalWeeklyCosts;
          totalCumulativeProfit += weeklyProfit;
          
          data.push({
            point: week === 0 ? "Start" : `Week ${week}`,
            revenue: Math.round(totalWeeklyRevenue * 100) / 100,
            costs: Math.round(totalWeeklyCosts * 100) / 100,
            profit: Math.round(weeklyProfit * 100) / 100,
            attendance: roundedAttendance,
            cumulativeRevenue: Math.round(totalCumulativeRevenue * 100) / 100,
            cumulativeCosts: Math.round(totalCumulativeCosts * 100) / 100,
            cumulativeProfit: Math.round(totalCumulativeProfit * 100) / 100,
            totalAttendance: Math.round(totalAttendance),
          });
        }
      } else {
        let currentRevenue = totalInitialRevenue;
        let currentCosts = totalInitialCosts;
        let cumulativeRevenue = 0;
        let cumulativeCosts = 0;
        let cumulativeProfit = 0;

        for (let month = 0; month <= projectionMonths; month++) {
          const { type, rate, seasonalFactors } = model.assumptions.growthModel;
          
          if (month > 0) {
            if (type === "linear") {
              // For linear models, apply the compound growth rate correctly
              currentRevenue = totalInitialRevenue * Math.pow(1 + rate, month);
            } else if (type === "exponential") {
              currentRevenue = totalInitialRevenue * Math.pow(1 + rate, month);
            } else if (type === "seasonal" && seasonalFactors && seasonalFactors.length > 0) {
              const seasonIndex = (month - 1) % seasonalFactors.length;
              const seasonFactor = seasonalFactors[seasonIndex];
              currentRevenue = totalInitialRevenue * Math.pow(1 + rate, month) * seasonFactor;
            } else {
              // Default to compound growth
              currentRevenue = totalInitialRevenue * Math.pow(1 + rate, month);
            }

            // Apply compounding growth to costs as well, using 70% of the rate
            currentCosts = totalInitialCosts * Math.pow(1 + (rate * 0.7), month);
          }

          const profit = currentRevenue - currentCosts;
          
          cumulativeRevenue += currentRevenue;
          cumulativeCosts += currentCosts;
          cumulativeProfit += profit;

          data.push({
            point: month === 0 ? "Start" : `Month ${month}`,
            revenue: Math.round(currentRevenue * 100) / 100,
            costs: Math.round(currentCosts * 100) / 100,
            profit: Math.round(profit * 100) / 100,
            cumulativeRevenue: Math.round(cumulativeRevenue * 100) / 100,
            cumulativeCosts: Math.round(cumulativeCosts * 100) / 100,
            cumulativeProfit: Math.round(cumulativeProfit * 100) / 100,
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
  
  const displayData = showCumulative ? 
    projectionData.map(point => ({
      ...point,
      displayRevenue: point.cumulativeRevenue,
      displayCosts: point.cumulativeCosts,
      displayProfit: point.cumulativeProfit
    })) :
    projectionData.map(point => ({
      ...point,
      displayRevenue: point.revenue,
      displayCosts: point.costs,
      displayProfit: point.profit
    }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-medium">Financial Projections</h3>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm">Display:</span>
            <select
              className="border rounded px-2 py-1"
              value={showCumulative ? "cumulative" : "period"}
              onChange={(e) => setShowCumulative(e.target.value === "cumulative")}
            >
              <option value="cumulative">Cumulative Totals</option>
              <option value="period">Per {isWeeklyEvent ? "Week" : "Month"}</option>
            </select>
          </div>
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
      </div>

      <div className="w-full h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={displayData}
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
                if (name === "displayRevenue") return [`$${value.toLocaleString()}`, "Revenue"];
                if (name === "displayCosts") return [`$${value.toLocaleString()}`, "Costs"];
                if (name === "displayProfit") return [`$${value.toLocaleString()}`, "Profit"];
                return [`$${value.toLocaleString()}`, name.charAt(0).toUpperCase() + name.slice(1)];
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="displayRevenue"
              name="Revenue"
              stroke="#4CAF50"
              strokeWidth={2}
              activeDot={{ r: 8 }}
            />
            <Line
              type="monotone"
              dataKey="displayCosts"
              name="Costs"
              stroke="#FF5722"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="displayProfit"
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
                yAxisId="right"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border rounded-lg p-4 bg-green-50">
          <h4 className="text-sm font-medium text-green-700">
            {showCumulative ? "Total Revenue" : `Revenue (${timeUnit} ${projectionMonths})`}
          </h4>
          <p className="text-2xl font-bold text-green-800">
            ${showCumulative 
              ? finalDataPoint.cumulativeRevenue.toLocaleString()
              : finalDataPoint.revenue.toLocaleString()}
          </p>
          <p className="text-xs text-green-600">
            {showCumulative ? "Cumulative across all " : "Last "} 
            {projectionMonths} {timeUnit.toLowerCase()}{showCumulative ? "s" : ""}
          </p>
        </div>

        <div className="border rounded-lg p-4 bg-red-50">
          <h4 className="text-sm font-medium text-red-700">
            {showCumulative ? "Total Costs" : `Costs (${timeUnit} ${projectionMonths})`}
          </h4>
          <p className="text-2xl font-bold text-red-800">
            ${showCumulative 
              ? finalDataPoint.cumulativeCosts.toLocaleString()
              : finalDataPoint.costs.toLocaleString()}
          </p>
          <p className="text-xs text-red-600">
            {showCumulative ? "Cumulative across all " : "Last "}
            {projectionMonths} {timeUnit.toLowerCase()}{showCumulative ? "s" : ""}
          </p>
        </div>

        <div className="border rounded-lg p-4 bg-blue-50">
          <h4 className="text-sm font-medium text-blue-700">
            {showCumulative ? "Total Profit" : `Profit (${timeUnit} ${projectionMonths})`}
          </h4>
          <p className="text-2xl font-bold text-blue-800">
            ${showCumulative
              ? finalDataPoint.cumulativeProfit.toLocaleString()
              : finalDataPoint.profit.toLocaleString()}
          </p>
          <p className="text-xs text-blue-600">
            {showCumulative ? "Cumulative across all " : "Last "}
            {projectionMonths} {timeUnit.toLowerCase()}{showCumulative ? "s" : ""}
          </p>
        </div>
      </div>

      {isWeeklyEvent && 'totalAttendance' in (projectionData[projectionData.length - 1] || {}) && (
        <div className="border rounded-lg p-4 bg-purple-50">
          <h4 className="text-sm font-medium text-purple-700">Total Attendance</h4>
          <p className="text-2xl font-bold text-purple-800">
            {projectionData[projectionData.length - 1].totalAttendance?.toLocaleString() || "N/A"} customers
          </p>
          <p className="text-xs text-purple-600">
            Total projected customers over {projectionMonths} weeks
          </p>
        </div>
      )}
    </div>
  );
};

export default ModelProjections;
