
import { useState } from "react";
import { FinancialModel } from "@/lib/db";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Card } from "@/components/ui/card";

interface CategoryBreakdownProps {
  model: FinancialModel;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d", "#ffc658", "#8dd1e1"];

const CategoryBreakdown = ({ model }: CategoryBreakdownProps) => {
  const [breakdownView, setBreakdownView] = useState<"revenue" | "costs">("revenue");
  const isWeeklyEvent = model.assumptions.metadata?.type === "WeeklyEvent";
  
  const prepareRevenueData = () => {
    const revenueStreams = model.assumptions.revenue;
    let totalRevenue = 0;
    
    const data = revenueStreams.map(stream => {
      totalRevenue += stream.value;
      return {
        name: stream.name,
        value: stream.value
      };
    });
    
    // Calculate percentages
    data.forEach(item => {
      item.percentage = Math.round((item.value / totalRevenue) * 100);
    });
    
    // Sort by value descending
    return data.sort((a, b) => b.value - a.value);
  };
  
  const prepareCostData = () => {
    const costs = model.assumptions.costs;
    let totalCost = 0;
    
    const data = costs.map(cost => {
      totalCost += cost.value;
      return {
        name: cost.name,
        value: cost.value,
        type: cost.type
      };
    });
    
    // Calculate percentages
    data.forEach(item => {
      item.percentage = Math.round((item.value / totalCost) * 100);
    });
    
    // Sort by value descending
    return data.sort((a, b) => b.value - a.value);
  };
  
  const prepareTypeCategorizedData = () => {
    const costs = model.assumptions.costs;
    const typeCategories = {
      fixed: { name: "Fixed Costs", value: 0 },
      variable: { name: "Variable Costs", value: 0 },
      recurring: { name: "Recurring Costs", value: 0 }
    };
    
    costs.forEach(cost => {
      const costType = cost.type.toLowerCase();
      if (typeCategories[costType]) {
        typeCategories[costType].value += cost.value;
      }
    });
    
    return Object.values(typeCategories).filter(category => category.value > 0);
  };
  
  const prepareWeeklyTotalData = () => {
    if (!isWeeklyEvent || !model.assumptions.metadata) return null;
    
    const metadata = model.assumptions.metadata;
    const weeks = metadata.weeks || 12;
    const initialRevenue = model.assumptions.revenue.reduce((sum, item) => sum + item.value, 0);
    const initialCosts = model.assumptions.costs.reduce((sum, item) => sum + item.value, 0);
    
    let totalRevenue = 0;
    let totalCosts = 0;
    
    // Calculate totals across all weeks with growth
    for (let week = 0; week < weeks; week++) {
      const revGrowthFactor = Math.pow(1 + model.assumptions.growthModel.rate, week);
      totalRevenue += initialRevenue * revGrowthFactor;
      
      const costGrowthFactor = Math.pow(1 + (model.assumptions.growthModel.rate * 0.7), week);
      totalCosts += initialCosts * costGrowthFactor;
    }
    
    const profit = totalRevenue - totalCosts;
    const profitMarginPercentage = ((profit / totalRevenue) * 100).toFixed(1);
    
    return {
      totalRevenue: Math.round(totalRevenue),
      totalCosts: Math.round(totalCosts),
      profit: Math.round(profit),
      profitMargin: profitMarginPercentage
    };
  };
  
  const breakdownData = breakdownView === "revenue" ? prepareRevenueData() : prepareCostData();
  const typeCategorizedData = breakdownView === "costs" ? prepareTypeCategorizedData() : [];
  const weeklyTotals = prepareWeeklyTotalData();
  
  const getTypeColor = (type: string) => {
    const typeLowerCase = type.toLowerCase();
    
    if (typeLowerCase === "fixed") return "#FF8042";
    if (typeLowerCase === "variable") return "#8884D8";
    if (typeLowerCase === "recurring") return "#82CA9D";
    return "#CCCCCC";
  };
  
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-md shadow-sm">
          <p className="font-medium">{payload[0].name}</p>
          <p>Value: ${payload[0].value.toLocaleString()}</p>
          <p>Percentage: {payload[0].payload.percentage}%</p>
          {payload[0].payload.type && (
            <p>Type: {payload[0].payload.type}</p>
          )}
        </div>
      );
    }
    return null;
  };
  
  return (
    <div className="space-y-6">
      {/* Tab Selection */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <button
            className={`px-4 py-2 border rounded-md ${
              breakdownView === "revenue" ? "bg-blue-50 border-blue-200" : ""
            }`}
            onClick={() => setBreakdownView("revenue")}
          >
            Revenue
          </button>
          <button
            className={`px-4 py-2 border rounded-md ${
              breakdownView === "costs" ? "bg-blue-50 border-blue-200" : ""
            }`}
            onClick={() => setBreakdownView("costs")}
          >
            Costs
          </button>
        </div>
        
        <h3 className="text-lg font-medium">
          {breakdownView === "revenue" ? "Revenue" : "Cost"} Breakdown
        </h3>
      </div>
      
      {/* Main content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <Card className="p-4">
          <h4 className="text-sm font-medium mb-4">
            {breakdownView === "revenue" ? "Revenue Distribution" : "Cost Distribution"}
          </h4>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={breakdownData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  fill="#8884d8"
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                  labelLine={false}
                >
                  {breakdownData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
        
        {/* Bar Chart */}
        <Card className="p-4">
          <h4 className="text-sm font-medium mb-4">
            {breakdownView === "revenue" ? "Revenue Streams" : "Cost Categories"} By Amount
          </h4>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={breakdownData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={(value) => `$${value}`} />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                  width={100}
                />
                <Tooltip
                  formatter={(value) => [`$${value.toLocaleString()}`, ""]}
                />
                <Bar 
                  dataKey="value" 
                  fill="#8884d8"
                  radius={[0, 4, 4, 0]}
                >
                  {breakdownData.map((entry, index) => {
                    const color = breakdownView === "costs" && entry.type 
                      ? getTypeColor(entry.type)
                      : COLORS[index % COLORS.length];
                    
                    return <Cell key={`cell-${index}`} fill={color} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      
      {/* Additional section for costs by type if in costs view */}
      {breakdownView === "costs" && typeCategorizedData.length > 0 && (
        <Card className="p-4">
          <h4 className="text-sm font-medium mb-4">Costs By Type</h4>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={typeCategorizedData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => `$${value}`} />
                <Tooltip
                  formatter={(value) => [`$${value.toLocaleString()}`, ""]}
                />
                <Bar 
                  dataKey="value" 
                  fill="#8884d8"
                  radius={[4, 4, 0, 0]}
                >
                  {typeCategorizedData.map((entry, index) => {
                    const typeKey = entry.name.toLowerCase().includes("fixed")
                      ? "fixed"
                      : entry.name.toLowerCase().includes("variable")
                      ? "variable"
                      : "recurring";
                    
                    return <Cell key={`cell-${index}`} fill={getTypeColor(typeKey)} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
      
      {/* Overall financial summary for weekly events */}
      {isWeeklyEvent && weeklyTotals && (
        <Card className="p-4">
          <h4 className="text-sm font-medium mb-4">Projected Total Financials</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-green-50 border border-green-100 rounded-md">
              <div className="text-sm text-green-700">Total Revenue</div>
              <div className="text-2xl font-bold text-green-800">
                ${weeklyTotals.totalRevenue.toLocaleString()}
              </div>
            </div>
            <div className="p-4 bg-red-50 border border-red-100 rounded-md">
              <div className="text-sm text-red-700">Total Costs</div>
              <div className="text-2xl font-bold text-red-800">
                ${weeklyTotals.totalCosts.toLocaleString()}
              </div>
            </div>
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-md">
              <div className="text-sm text-blue-700">Total Profit</div>
              <div className="text-2xl font-bold text-blue-800">
                ${weeklyTotals.profit.toLocaleString()}
              </div>
            </div>
            <div className="p-4 bg-purple-50 border border-purple-100 rounded-md">
              <div className="text-sm text-purple-700">Profit Margin</div>
              <div className="text-2xl font-bold text-purple-800">
                {weeklyTotals.profitMargin}%
              </div>
            </div>
          </div>
        </Card>
      )}
      
      {/* Data table */}
      <Card className="p-4">
        <h4 className="text-sm font-medium mb-4">
          {breakdownView === "revenue" ? "Revenue Stream Details" : "Cost Category Details"}
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-3">Name</th>
                {breakdownView === "costs" && (
                  <th className="text-left py-2 px-3">Type</th>
                )}
                <th className="text-right py-2 px-3">Amount</th>
                <th className="text-right py-2 px-3">Percentage</th>
              </tr>
            </thead>
            <tbody>
              {breakdownData.map((item, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? "bg-gray-50" : ""}>
                  <td className="py-2 px-3">{item.name}</td>
                  {breakdownView === "costs" && (
                    <td className="py-2 px-3 capitalize">{item.type}</td>
                  )}
                  <td className="text-right py-2 px-3">${item.value.toLocaleString()}</td>
                  <td className="text-right py-2 px-3">{item.percentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default CategoryBreakdown;
