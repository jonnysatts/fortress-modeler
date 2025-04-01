
import { useState } from "react";
import { FinancialModel } from "@/lib/db";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

interface CategoryBreakdownProps {
  model: FinancialModel;
}

const CategoryBreakdown = ({ model }: CategoryBreakdownProps) => {
  const [period, setPeriod] = useState<"first" | "last" | "total">("total");
  const [breakdownType, setBreakdownType] = useState<"revenue" | "costs">("revenue");
  const isWeeklyEvent = model.assumptions.metadata?.type === "WeeklyEvent";

  const generateBreakdownData = () => {
    try {
      const data = {
        revenue: {
          first: [] as any[],
          last: [] as any[],
          total: [] as any[]
        },
        costs: {
          first: [] as any[],
          last: [] as any[],
          total: [] as any[],
        }
      };
      
      const weeks = isWeeklyEvent && model.assumptions.metadata 
        ? model.assumptions.metadata.weeks || 12
        : 12;
      
      // Calculate Revenue Breakdown
      const revenueStreams = model.assumptions.revenue;
      
      // First period (initial values)
      const totalInitialRevenue = revenueStreams.reduce((sum, item) => sum + item.value, 0);
      revenueStreams.forEach(stream => {
        const percentage = totalInitialRevenue > 0 ? (stream.value / totalInitialRevenue) * 100 : 0;
        data.revenue.first.push({
          name: stream.name,
          value: Math.round(stream.value * 100) / 100,
          percentage: Math.round(percentage * 10) / 10
        });
      });
      
      // Last period with growth
      let totalLastPeriodRevenue = 0;
      const lastPeriodRevenue: any[] = [];
      
      revenueStreams.forEach(stream => {
        let value = stream.value;
        if (isWeeklyEvent) {
          // Apply weekly compound growth
          value = stream.value * Math.pow(1 + model.assumptions.growthModel.rate, weeks - 1);
        } else {
          // Apply monthly compound growth
          value = stream.value * Math.pow(1 + model.assumptions.growthModel.rate, 11); // 12 months - 1
        }
        
        totalLastPeriodRevenue += value;
        lastPeriodRevenue.push({
          name: stream.name,
          value: Math.round(value * 100) / 100
        });
      });
      
      // Calculate percentages for last period
      lastPeriodRevenue.forEach(item => {
        const percentage = totalLastPeriodRevenue > 0 ? (item.value / totalLastPeriodRevenue) * 100 : 0;
        data.revenue.last.push({
          ...item,
          percentage: Math.round(percentage * 10) / 10
        });
      });
      
      // Total revenue across all periods
      const totalRevenue: Record<string, number> = {};
      let grandTotalRevenue = 0;
      
      revenueStreams.forEach(stream => {
        let streamTotal = 0;
        
        for (let period = 0; period < weeks; period++) {
          let periodRevenue = stream.value;
          
          // Apply growth for periods after the first
          if (period > 0) {
            periodRevenue = stream.value * Math.pow(1 + model.assumptions.growthModel.rate, period);
          }
          
          streamTotal += periodRevenue;
        }
        
        totalRevenue[stream.name] = streamTotal;
        grandTotalRevenue += streamTotal;
      });
      
      // Calculate percentages for total
      Object.entries(totalRevenue).forEach(([name, value]) => {
        const percentage = grandTotalRevenue > 0 ? (value / grandTotalRevenue) * 100 : 0;
        data.revenue.total.push({
          name,
          value: Math.round(value * 100) / 100,
          percentage: Math.round(percentage * 10) / 10
        });
      });
      
      // Calculate Cost Breakdown using similar approach
      const costItems = model.assumptions.costs;
      
      // First period (initial values)
      const totalInitialCost = costItems.reduce((sum, item) => sum + item.value, 0);
      costItems.forEach(cost => {
        const percentage = totalInitialCost > 0 ? (cost.value / totalInitialCost) * 100 : 0;
        data.costs.first.push({
          name: cost.name,
          value: Math.round(cost.value * 100) / 100,
          percentage: Math.round(percentage * 10) / 10,
          category: cost.category
        });
      });
      
      // Last period with growth
      let totalLastPeriodCost = 0;
      const lastPeriodCost: any[] = [];
      
      costItems.forEach(cost => {
        let value = cost.value;
        
        // Special handling for costs
        if (cost.name === "Setup Costs" && isWeeklyEvent && 
            model.assumptions.metadata?.costs?.spreadSetupCosts) {
          // If setup costs are spread, use the weekly amount
          value = cost.value / weeks;
        } else if (cost.name === "Setup Costs" && isWeeklyEvent && !model.assumptions.metadata?.costs?.spreadSetupCosts) {
          // If setup costs are not spread and we're looking at the last week, it should be 0
          value = 0;
        } else if (cost.type === "Variable" && isWeeklyEvent) {
          // Variable costs scale with attendance
          const initialAttendance = model.assumptions.metadata?.initialWeeklyAttendance || 0;
          const growthRate = model.assumptions.metadata?.growth?.attendanceGrowthRate 
            ? model.assumptions.metadata.growth.attendanceGrowthRate / 100 
            : model.assumptions.growthModel.rate;
          const lastWeekAttendance = initialAttendance * Math.pow(1 + growthRate, weeks - 1);
          const attendanceRatio = lastWeekAttendance / initialAttendance;
          value = cost.value * attendanceRatio;
        } else {
          // Fixed costs grow at 70% of the revenue rate
          value = cost.value * Math.pow(1 + (model.assumptions.growthModel.rate * 0.7), weeks - 1);
        }
        
        totalLastPeriodCost += value;
        lastPeriodCost.push({
          name: cost.name,
          value: Math.round(value * 100) / 100,
          category: cost.category
        });
      });
      
      // Calculate percentages for last period costs
      lastPeriodCost.forEach(item => {
        const percentage = totalLastPeriodCost > 0 ? (item.value / totalLastPeriodCost) * 100 : 0;
        data.costs.last.push({
          ...item,
          percentage: Math.round(percentage * 10) / 10
        });
      });
      
      // Total costs across all periods
      const totalCosts: Record<string, number> = {};
      const totalCostsByCategory: Record<string, number> = {};
      let grandTotalCost = 0;
      
      costItems.forEach(cost => {
        let costTotal = 0;
        
        for (let period = 0; period < weeks; period++) {
          let periodCost = cost.value;
          
          // Special handling for different cost types
          if (cost.name === "Setup Costs" && isWeeklyEvent) {
            if (model.assumptions.metadata?.costs?.spreadSetupCosts) {
              // If spread, divide by total weeks
              periodCost = cost.value / weeks;
            } else if (period > 0) {
              // If not spread and not first period, cost is 0
              periodCost = 0;
            }
          } else if (cost.type === "Variable" && isWeeklyEvent && period > 0) {
            // Variable costs scale with attendance
            const initialAttendance = model.assumptions.metadata?.initialWeeklyAttendance || 0;
            const growthRate = model.assumptions.metadata?.growth?.attendanceGrowthRate 
              ? model.assumptions.metadata.growth.attendanceGrowthRate / 100 
              : model.assumptions.growthModel.rate;
            const periodAttendance = initialAttendance * Math.pow(1 + growthRate, period);
            const attendanceRatio = periodAttendance / initialAttendance;
            periodCost = cost.value * attendanceRatio;
          } else if (period > 0) {
            // Apply growth for periods after the first (fixed costs)
            periodCost = cost.value * Math.pow(1 + (model.assumptions.growthModel.rate * 0.7), period);
          }
          
          costTotal += periodCost;
        }
        
        totalCosts[cost.name] = costTotal;
        
        // Track by category
        if (cost.category) {
          totalCostsByCategory[cost.category] = (totalCostsByCategory[cost.category] || 0) + costTotal;
        }
        
        grandTotalCost += costTotal;
      });
      
      // Calculate percentages for total costs
      Object.entries(totalCosts).forEach(([name, value]) => {
        const cost = costItems.find(c => c.name === name);
        const category = cost?.category || "Other";
        const percentage = grandTotalCost > 0 ? (value / grandTotalCost) * 100 : 0;
        
        data.costs.total.push({
          name,
          value: Math.round(value * 100) / 100,
          percentage: Math.round(percentage * 10) / 10,
          category
        });
      });
      
      return data;
    } catch (error) {
      console.error("Error generating breakdown data:", error);
      return {
        revenue: { first: [], last: [], total: [] },
        costs: { first: [], last: [], total: [] }
      };
    }
  };

  const breakdownData = generateBreakdownData();
  const currentData = breakdownData[breakdownType][period];
  
  if (!currentData || currentData.length === 0) {
    return (
      <div className="p-4 border border-red-200 rounded-md bg-red-50">
        <p className="text-red-600">
          Unable to generate breakdown data. There might be an issue with the model.
        </p>
      </div>
    );
  }

  // Colors for pie chart
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
  
  // For cost breakdown by category
  let categoryData: any[] = [];
  if (breakdownType === 'costs') {
    // Group by category
    const categoryMap: Record<string, number> = {};
    currentData.forEach((item: any) => {
      if (item.category) {
        categoryMap[item.category] = (categoryMap[item.category] || 0) + item.value;
      }
    });
    
    // Convert to array format
    categoryData = Object.entries(categoryMap).map(([category, value]) => {
      const totalValue = currentData.reduce((sum: number, item: any) => sum + item.value, 0);
      const percentage = totalValue > 0 ? (value / totalValue) * 100 : 0;
      return {
        name: category,
        value: Math.round(value * 100) / 100,
        percentage: Math.round(percentage * 10) / 10
      };
    });
  }

  // Description based on period
  const periodDescriptions = {
    first: isWeeklyEvent ? "First Week" : "First Month",
    last: isWeeklyEvent ? "Last Week" : "Last Month",
    total: isWeeklyEvent 
      ? `Total (All ${model.assumptions.metadata?.weeks || 12} Weeks)` 
      : "Total (All 12 Months)"
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div>
            <span className="text-sm mr-2">View:</span>
            <select
              className="border rounded px-2 py-1"
              value={breakdownType}
              onChange={(e) => setBreakdownType(e.target.value as "revenue" | "costs")}
            >
              <option value="revenue">Revenue</option>
              <option value="costs">Costs</option>
            </select>
          </div>
          <div>
            <span className="text-sm mr-2">Period:</span>
            <select
              className="border rounded px-2 py-1"
              value={period}
              onChange={(e) => setPeriod(e.target.value as "first" | "last" | "total")}
            >
              <option value="first">{isWeeklyEvent ? "First Week" : "First Month"}</option>
              <option value="last">{isWeeklyEvent ? "Last Week" : "Last Month"}</option>
              <option value="total">Total (All Periods)</option>
            </select>
          </div>
        </div>
        
        <h3 className="text-lg font-medium">
          {breakdownType === "revenue" ? "Revenue" : "Cost"} Breakdown - {periodDescriptions[period]}
        </h3>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={breakdownType === "costs" && period === "total" ? categoryData : currentData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={150}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
                label={({ name, percentage }) => `${name}: ${percentage}%`}
              >
                {(breakdownType === "costs" && period === "total" ? categoryData : currentData).map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => [`$${value.toLocaleString()}`, ""]}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        {/* Bar Chart */}
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={currentData}
              margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                type="number" 
                tickFormatter={(value) => `$${value.toLocaleString()}`}
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                tick={{ fontSize: 12 }}
                width={80}
              />
              <Tooltip 
                formatter={(value: number) => [`$${value.toLocaleString()}`, ""]}
              />
              <Legend />
              <Bar 
                dataKey="value" 
                name={breakdownType === "revenue" ? "Revenue" : "Cost"} 
                fill="#8884d8"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Tabular Data */}
      <div className="mt-4">
        <h4 className="text-sm font-medium mb-2">Detailed {breakdownType === "revenue" ? "Revenue" : "Cost"} Breakdown</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-3">Name</th>
                {breakdownType === "costs" && <th className="text-left py-2 px-3">Category</th>}
                <th className="text-right py-2 px-3">Value</th>
                <th className="text-right py-2 px-3">Percentage</th>
              </tr>
            </thead>
            <tbody>
              {currentData.map((item: any, idx: number) => (
                <tr key={idx} className={idx % 2 === 0 ? "bg-gray-50" : ""}>
                  <td className="py-2 px-3">{item.name}</td>
                  {breakdownType === "costs" && <td className="py-2 px-3">{item.category || "N/A"}</td>}
                  <td className="text-right py-2 px-3">${item.value.toLocaleString()}</td>
                  <td className="text-right py-2 px-3">{item.percentage}%</td>
                </tr>
              ))}
              <tr className="border-t font-bold">
                <td className="py-2 px-3">Total</td>
                {breakdownType === "costs" && <td className="py-2 px-3"></td>}
                <td className="text-right py-2 px-3">
                  ${currentData.reduce((sum: number, item: any) => sum + item.value, 0).toLocaleString()}
                </td>
                <td className="text-right py-2 px-3">100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CategoryBreakdown;
