import { FinancialModel } from "@/lib/db";

// Import statements (will be commented out progressively)
import { useState, useMemo, memo } from "react";
import { Tooltip } from "recharts";
import { Card } from "@/components/ui/card";
import { calculateTotalRevenue, calculateTotalCosts } from "@/lib/financial-calculations";
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
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from 'recharts';
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { TrendDataPoint } from "@/types/trends";

interface CategoryBreakdownProps {
  model: FinancialModel;
  revenueTrendData: TrendDataPoint[]; // Add prop for full revenue trend data
  costTrendData: TrendDataPoint[]; // Add prop for full cost trend data
}

// Define consistent colors, adding Marketing Budget
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#a855f7', '#ef4444', '#f97316', '#eab308', '#84cc16', '#14b8a6']; 
const COST_COLOR_MAP: Record<string, string> = {
  "Setup Costs": "#ef4444",
  "Marketing Budget": "#a855f7",
  "F&B COGS": "#f97316",
  "Staff Costs": "#eab308",
  "Management Costs": "#22c55e",
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: {
      name: string;
      value: number;
      percentage: number;
    };
  }>;
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const dataItem = payload[0].payload;
    return (
      <div className="bg-white p-3 border rounded-md shadow-sm">
        <p className="font-medium">{dataItem.name || payload[0].name}</p>
        <p>Value: {formatCurrency(dataItem.value)}</p>
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
  const timeUnit = isWeeklyEvent ? "Week" : "Month"; // Define timeUnit here
  const totalWeeks = model.assumptions.metadata?.weeks || 0;


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
    prepareCostDataForWeek(selectedCostPoint, model), 
    [selectedCostPoint, model]
  );
  const typeCategorizedData = useMemo(() => 
    prepareTypeCategorizedDataForWeek(selectedCostPoint, model), 
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
  
  // Function to get color for cost category, falling back to COLORS array
  const getCostColor = (name: string, index: number): string => {
    return COST_COLOR_MAP[name] || COLORS[index % COLORS.length];
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

      {/* --- Costs View --- */}
      {breakdownView === "costs" && (
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cost Distribution Pie Chart */}
          <Card>
            <CardHeader><CardTitle className="text-base font-semibold">Cost Distribution for {timeUnit} {selectedWeek}</CardTitle></CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={costData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={(entry) => `${entry.percentage}%`}
                  >
                    {costData.map((entry, index) => (
                      <Cell key={`pie-cell-${entry.name}`} fill={getCostColor(entry.name, index)} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend 
                     formatter={(value, entry) => <span style={{ color: entry.color }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          
          {/* Cost Categories Bar Chart */}
          <Card>
            <CardHeader><CardTitle className="text-base font-semibold">Cost Categories By Amount for {timeUnit} {selectedWeek}</CardTitle></CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={costData} layout="vertical" margin={{ left: 100 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickFormatter={formatCurrency} />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="value" name="Amount">
                     {costData.map((entry, index) => (
                         <Cell key={`bar-cell-${entry.name}`} fill={getCostColor(entry.name, index)} />
                     ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          
          {/* Costs By Type Bar Chart */}
          <Card>
            <CardHeader><CardTitle className="text-base font-semibold">Costs By Type for {timeUnit} {selectedWeek}</CardTitle></CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typeCategorizedData} layout="vertical" margin={{ left: 100 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickFormatter={formatCurrency} />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="value" name="Amount">
                     {typeCategorizedData.map((entry, index) => (
                         <Cell key={`type-bar-cell-${entry.name}`} fill={getCostColor(entry.name, index)} />
                     ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          
          {/* Cost Category Details Table */}
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="text-base font-semibold">Cost Category Details for {timeUnit} {selectedWeek}</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Percentage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {costData.map((entry, index) => (
                    <TableRow key={entry.name}>
                      <TableCell>{entry.name}</TableCell>
                      <TableCell>{formatCurrency(entry.value)}</TableCell>
                      <TableCell>{entry.percentage}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {isWeeklyEvent && weeklyTotals && (
        <Card className="p-4">
          <h4 className="text-sm font-medium mb-4">Projected Total Financials</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Total Revenue */}
            <div className="p-4 bg-green-50 border border-green-100 rounded-md">
              <div className="text-sm text-green-700">Total Revenue</div>
              <div className="text-2xl font-bold text-green-800">
                {formatCurrency(weeklyTotals.totalRevenue)}
              </div>
            </div>
            {/* Total Costs */}
            <div className="p-4 bg-red-50 border border-red-100 rounded-md">
              <div className="text-sm text-red-700">Total Costs</div>
              <div className="text-2xl font-bold text-red-800">
                {formatCurrency(weeklyTotals.totalCosts)}
              </div>
            </div>
            {/* Total Profit */}
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-md">
              <div className="text-sm text-blue-700">Total Profit</div>
              <div className="text-2xl font-bold text-blue-800">
                {formatCurrency(weeklyTotals.profit)}
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

export default memo(CategoryBreakdown);
