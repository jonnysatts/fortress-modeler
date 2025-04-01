import { FinancialModel } from "@/lib/db";

// Import statements (will be commented out progressively)
import { useState, useMemo } from "react";
import { Tooltip } from "recharts";
import { Card } from "@/components/ui/card";
import { calculateTotalRevenue, calculateTotalCosts } from "@/lib/financialCalculations";
import { 
  prepareRevenueDataForWeek,
  prepareCostDataForWeek,
  prepareTypeCategorizedDataForWeek,
  RevenueData,
  CostData,
  TypeCategoryData 
} from "./breakdownCalculations";
import RevenueBreakdownView from "./RevenueBreakdownView";
import CostBreakdownView from "./CostBreakdownView";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Add Select imports

interface CategoryBreakdownProps {
  model: FinancialModel;
  revenueTrendData: any[]; // Add prop for full revenue trend data
  costTrendData: any[]; // Add prop for full cost trend data
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d", "#ffc658", "#8dd1e1"];
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const dataItem = payload[0].payload;
    return (
      <div className="bg-white p-3 border rounded-md shadow-sm">
        <p className="font-medium">{dataItem.name || payload[0].name}</p>
        <p>Value: ${dataItem.value.toLocaleString()}</p>
        {dataItem.percentage !== undefined && (
          <p>Percentage: {dataItem.percentage}%</p>
        )}
        {dataItem.type && (
          <p>Type: {dataItem.type}</p>
        )}
      </div>
    );
  }
  return null;
};

const CategoryBreakdown = ({ model, revenueTrendData, costTrendData }: CategoryBreakdownProps) => {
  const [breakdownView, setBreakdownView] = useState<"revenue" | "costs">("revenue");
  const [selectedWeek, setSelectedWeek] = useState<number>(1); // Default to week 1
  
  const isWeeklyEvent = model.assumptions.metadata?.type === "WeeklyEvent";
  const totalWeeks = model.assumptions.metadata?.weeks || 0;

  console.log(`[CategoryBreakdown] View: ${breakdownView}, Selected Week: ${selectedWeek}`);

  // Find the data point for the selected week
  // Note: Assumes trendData arrays start from Week 1 at index 0
  const selectedRevenuePoint = revenueTrendData?.[selectedWeek - 1] || null;
  const selectedCostPoint = costTrendData?.[selectedWeek - 1] || null;
  
  // Calculate breakdown data for the selected week
  const revenueData = useMemo(() => 
    prepareRevenueDataForWeek(selectedRevenuePoint), 
    [selectedRevenuePoint]
  );
  const costData = useMemo(() => 
    prepareCostDataForWeek(selectedCostPoint, model), // Pass model for base cost info
    [selectedCostPoint, model]
  );
  const typeCategorizedData = useMemo(() => 
    prepareTypeCategorizedDataForWeek(selectedCostPoint, model), // Pass model for base cost info
    [selectedCostPoint, model]
  );

  const weeklyTotals = useMemo(() => {
    if (!isWeeklyEvent) return null;
    const totalRevenue = calculateTotalRevenue(model);
    const totalCosts = calculateTotalCosts(model);
    const profit = totalRevenue - totalCosts;
    const profitMarginPercentage = totalRevenue > 0 ? ((profit / totalRevenue) * 100).toFixed(1) : "0.0";
    return { totalRevenue, totalCosts, profit, profitMargin: profitMarginPercentage };
  }, [model, isWeeklyEvent]);
  
  const getTypeColor = (type: string) => {
    const typeLowerCase = type.toLowerCase();
    if (typeLowerCase === "fixed") return "#FF8042";
    if (typeLowerCase === "variable") return "#8884D8";
    if (typeLowerCase === "recurring") return "#82CA9D";
    return "#CCCCCC";
  };
  
  const tooltipElement = <Tooltip content={<CustomTooltip />} />;
  
  return (
    <div className="space-y-6">
      {/* Title, Toggles, and Week Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
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
        
        {/* Week Selector */} 
        {isWeeklyEvent && totalWeeks > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">View Week:</span>
            <Select 
              value={selectedWeek.toString()} 
              onValueChange={(value) => setSelectedWeek(Number(value))}
            >
              <SelectTrigger className="w-[80px] h-9">
                <SelectValue placeholder="Week" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: totalWeeks }, (_, i) => i + 1).map(weekNum => (
                  <SelectItem key={weekNum} value={weekNum.toString()}>
                    {weekNum}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <h3 className="text-lg font-medium w-full sm:w-auto text-center sm:text-right mt-2 sm:mt-0">
          {breakdownView === "revenue" ? "Revenue" : "Cost"} Breakdown for Week {selectedWeek}
        </h3>
      </div>
      
      {breakdownView === "revenue" && (
        <RevenueBreakdownView 
          data={revenueData} 
          colors={COLORS} 
          tooltip={tooltipElement} 
          selectedWeek={selectedWeek} 
        />
      )}

      {breakdownView === "costs" && (
        <CostBreakdownView 
          costData={costData} 
          typeData={typeCategorizedData} 
          colors={COLORS} 
          tooltip={tooltipElement}
          getTypeColor={getTypeColor}
          selectedWeek={selectedWeek} 
        />
      )}

      {isWeeklyEvent && weeklyTotals && (
        <Card className="p-4">
          <h4 className="text-sm font-medium mb-4">Projected Total Financials</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Total Revenue */}
            <div className="p-4 bg-green-50 border border-green-100 rounded-md">
              <div className="text-sm text-green-700">Total Revenue</div>
              <div className="text-2xl font-bold text-green-800">
                ${weeklyTotals.totalRevenue.toLocaleString()}
              </div>
            </div>
            {/* Total Costs */}
            <div className="p-4 bg-red-50 border border-red-100 rounded-md">
              <div className="text-sm text-red-700">Total Costs</div>
              <div className="text-2xl font-bold text-red-800">
                ${weeklyTotals.totalCosts.toLocaleString()}
              </div>
            </div>
            {/* Total Profit */}
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-md">
              <div className="text-sm text-blue-700">Total Profit</div>
              <div className="text-2xl font-bold text-blue-800">
                ${weeklyTotals.profit.toLocaleString()}
              </div>
            </div>
            {/* Profit Margin */}
            <div className="p-4 bg-purple-50 border border-purple-100 rounded-md">
              <div className="text-sm text-purple-700">Profit Margin</div>
              <div className="text-2xl font-bold text-purple-800">
                {weeklyTotals.profitMargin}%
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default CategoryBreakdown;
