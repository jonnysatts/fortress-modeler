import { useState, useMemo, memo } from "react";
import { FinancialModel } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";
import { TrendDataPoint } from "@/types/trends";

interface FinancialMatrixProps {
  model: FinancialModel;
  trendData: TrendDataPoint[];
  revenueData?: boolean;
  costData?: boolean;
  combinedView?: boolean;
}

const FinancialMatrix = ({ 
  model, 
  trendData,
  revenueData = false,
  costData = false,
  combinedView = false,
}: FinancialMatrixProps) => {
  const isWeeklyEvent = model.assumptions.metadata?.type === "WeeklyEvent";
  const timeUnit = isWeeklyEvent ? "Week" : "Month";
  
  // Determine headers dynamically based on data keys present - MOVED BEFORE EARLY RETURNS
  const revenueKeys = useMemo(() => {
      if (!trendData || trendData.length === 0) return model.assumptions.revenue.map(r => r.name.replace(/[^a-zA-Z0-9]/g, ""));
      // Get keys from the first data point, excluding known non-revenue keys
      const firstPointKeys = Object.keys(trendData[0]);
      const knownCostKeys = new Set(model.assumptions.costs.map(c => c.name.replace(/[^a-zA-Z0-9]/g, "")));
      knownCostKeys.add('MarketingBudget').add('costs').add('cumulativeCosts').add('profit').add('cumulativeProfit').add('point').add('attendance');
      return firstPointKeys.filter(key => !knownCostKeys.has(key) && !key.endsWith('Color') && key !== 'revenue' && key !== 'cumulativeRevenue');
  }, [trendData, model.assumptions.revenue, model.assumptions.costs]);
  
  const costKeys = useMemo(() => {
      if (!trendData || trendData.length === 0) return model.assumptions.costs.map(c => c.name.replace(/[^a-zA-Z0-9]/g, ""));
      // Get keys from the first data point, filter for likely cost keys
      const firstPointKeys = Object.keys(trendData[0]);
      const knownRevenueKeys = new Set(model.assumptions.revenue.map(r => r.name.replace(/[^a-zA-Z0-9]/g, "")));
      knownRevenueKeys.add('revenue').add('cumulativeRevenue').add('profit').add('cumulativeProfit').add('point').add('attendance');
      // Include MarketingBudget if present
      const potentialCostKeys = firstPointKeys.filter(key => !knownRevenueKeys.has(key) && !key.endsWith('Color') && key !== 'costs' && key !== 'cumulativeCosts');
      // Basic check: include if it's in original costs OR it's MarketingBudget
      const costAssumptionKeys = new Set(model.assumptions.costs.map(c => c.name.replace(/[^a-zA-Z0-9]/g, "")));
      const finalKeys = potentialCostKeys.filter(key => costAssumptionKeys.has(key) || key === 'MarketingBudget');
      
      // Sort these keys like in CostTrends
       const costRenderOrder = ["SetupCosts", "MarketingBudget", "FBCOGS", "StaffCosts", "ManagementCosts"];
       finalKeys.sort((a, b) => {
           let indexA = costRenderOrder.indexOf(a); let indexB = costRenderOrder.indexOf(b);
           if (indexA === -1) indexA = costRenderOrder.length; if (indexB === -1) indexB = costRenderOrder.length;
           return indexA - indexB;
       });
       
      return finalKeys;
  }, [trendData, model.assumptions.costs, model.assumptions.revenue]);
  
  // Check if data is valid and not empty
  if (!trendData || trendData.length === 0) {
    return (
      <div className="p-4 border border-gray-200 rounded-md bg-gray-50">
        <p className="text-gray-600">
          No data available to display. Please wait while data is being loaded...
        </p>
      </div>
    );
  }
  
  // Helper function to find a setup cost in the model
  const findSetupCost = () => {
    return model.assumptions.costs.find(cost => cost.name === "Setup Costs");
  };

  const calculatePeriodData = (week: number) => {
    try {
      if (!model?.assumptions?.metadata) return null;
      
      const metadata = model.assumptions.metadata;
      const initialAttendance = metadata.initialWeeklyAttendance;
      const perCustomer = metadata.perCustomer;
      
      // Calculate attendance for this week
      const attendanceGrowthRate = metadata.growth.attendanceGrowthRate / 100;
      const currentAttendance = Math.round(
        initialAttendance * Math.pow(1 + attendanceGrowthRate, week - 1)
      );

      // Calculate per-customer values with growth if enabled
      let currentPerCustomer = { ...perCustomer };
      if (metadata.growth.useCustomerSpendGrowth) {
        currentPerCustomer = {
          ticketPrice: perCustomer.ticketPrice * 
            Math.pow(1 + (metadata.growth.ticketPriceGrowth / 100), week - 1),
          fbSpend: perCustomer.fbSpend * 
            Math.pow(1 + (metadata.growth.fbSpendGrowth / 100), week - 1),
          merchandiseSpend: perCustomer.merchandiseSpend * 
            Math.pow(1 + (metadata.growth.merchandiseSpendGrowth / 100), week - 1),
          onlineSpend: perCustomer.onlineSpend * 
            Math.pow(1 + (metadata.growth.onlineSpendGrowth / 100), week - 1),
          miscSpend: perCustomer.miscSpend * 
            Math.pow(1 + (metadata.growth.miscSpendGrowth / 100), week - 1),
        };
      }

      // Calculate revenue streams
      const ticketSales = currentAttendance * (currentPerCustomer.ticketPrice || 0);
      const fbSales = currentAttendance * (currentPerCustomer.fbSpend || 0);
      const merchandiseSales = currentAttendance * (currentPerCustomer.merchandiseSpend || 0);
      const onlineSales = currentAttendance * (currentPerCustomer.onlineSpend || 0);
      const miscRevenue = currentAttendance * (currentPerCustomer.miscSpend || 0);

      const totalRevenue = ticketSales + fbSales + merchandiseSales + onlineSales + miscRevenue;

      // Calculate costs
      const setupCosts = model.assumptions.costs.find(cost => cost.name === "Setup Costs")?.value || 0;
      const fbCOGS = (fbSales * (metadata.costs.fbCOGSPercent || 30)) / 100;
      const staffCosts = (metadata.costs.staffCount || 0) * (metadata.costs.staffCostPerPerson || 0);
      const managementCosts = metadata.costs.managementCosts || 0;

      // Only apply setup costs in week 1
      const weeklySetupCosts = week === 1 ? setupCosts : 0;
      const totalCosts = weeklySetupCosts + fbCOGS + staffCosts + managementCosts;

      return {
        week,
        attendance: currentAttendance,
        revenue: {
          ticketSales: Math.round(ticketSales),
          fbSales: Math.round(fbSales),
          merchandiseSales: Math.round(merchandiseSales),
          onlineSales: Math.round(onlineSales),
          miscRevenue: Math.round(miscRevenue),
          total: Math.round(totalRevenue)
        },
        costs: {
          setupCosts: Math.round(weeklySetupCosts),
          fbCOGS: Math.round(fbCOGS),
          staffCosts: Math.round(staffCosts),
          managementCosts: Math.round(managementCosts),
          total: Math.round(totalCosts)
        }
      };
    } catch (error) {
      console.error("Error calculating period data:", error);
      return null;
    }
  };

  // Calculate all periods data
  const calculateAllPeriodsData = () => {
    const weeks = model?.assumptions?.metadata?.weeks || 12;
    let cumulativeRevenue = 0;
    let cumulativeCosts = 0;
    
    return Array.from({ length: weeks }, (_, i) => {
      const week = i + 1;
      const periodData = calculatePeriodData(week);
      
      if (!periodData) return null;
      
      cumulativeRevenue += periodData.revenue.total;
      cumulativeCosts += periodData.costs.total;
      
      return {
        ...periodData,
        cumulativeRevenue,
        cumulativeCosts,
        cumulativeProfit: cumulativeRevenue - cumulativeCosts
      };
    }).filter(Boolean);
  };


  // Combined data view - both revenue and cost data in one table
  if (combinedView) {
    // Validate that we have the required properties
    const hasRequiredData = trendData.every(period => 
      typeof period.revenue !== 'undefined' || 
      typeof period.costs !== 'undefined'
    );

    if (!hasRequiredData) {
      return (
        <div className="p-4 border border-yellow-200 rounded-md bg-yellow-50">
          <p className="text-yellow-600">
            Incomplete financial data. Please ensure both revenue and cost data are available.
          </p>
        </div>
      );
    }

    // Find setup cost for processing
    const setupCost = findSetupCost();
    
    return (
      <div className="overflow-x-auto mt-4">
        <h4 className="text-sm font-medium mb-2">Period-by-Period Financial Matrix</h4>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-3">{timeUnit}</th>
              
              {/* Revenue columns - Use dynamic keys */}
              {revenueKeys.map((key) => (
                <th key={`rev-h-${key}`} className="text-right py-2 px-3 text-green-700">
                  {key.replace(/([A-Z])/g, ' $1').trim()} {/* Format name */}
                </th>
              ))}
              <th className="text-right py-2 px-3 font-bold text-green-800 border-l border-r">
                Total Revenue
              </th>
              <th className="text-right py-2 px-3 font-bold text-green-800">
                Cum. Revenue
              </th>
              
              {/* Attendance Header */}
              <th className="text-right py-2 px-3 font-bold text-blue-800 border-l">
                Attendance 
              </th>

              {/* Cost columns - Use dynamic keys */}
              {costKeys.map((key) => (
                <th key={`cost-h-${key}`} className="text-right py-2 px-3 text-red-700 border-l">
                  {key === 'MarketingBudget' ? 'Marketing Budget' : key.replace(/([A-Z])/g, ' $1').trim()} {/* Format name */}
                </th>
              ))}
              <th className="text-right py-2 px-3 font-bold text-red-800 border-l border-r">
                Total Costs
              </th>
              <th className="text-right py-2 px-3 font-bold text-red-800">
                Cum. Costs
              </th>
              
              {/* Profit/Loss */}
              <th className="text-right py-2 px-3 font-bold bg-gray-50 border-l">
                Profit/Loss
              </th>
              <th className="text-right py-2 px-3 font-bold bg-gray-100">
                Cum. P/L
              </th>
            </tr>
          </thead>
          <tbody>
            {trendData.map((row, index) => (
              <tr key={index} className="border-b last:border-b-0">
                <td className="py-2 px-3">{row.point}</td>
                
                {/* Revenue data cells - Use dynamic keys */}
                {revenueKeys.map((key) => (
                  <td key={`rev-d-${key}-${index}`} className="py-2 px-3 text-right">{formatCurrency(row[key] || 0)}</td>
                ))}
                <td className="py-2 px-3 text-right font-medium text-green-800 border-l border-r">{formatCurrency(row.revenue || 0)}</td>
                <td className="py-2 px-3 text-right font-medium text-green-800">{formatCurrency(row.cumulativeRevenue || 0)}</td>
                
                {/* Attendance data cell */}
                <td className="py-2 px-3 text-right font-medium text-blue-800 border-l">{(row.attendance !== undefined && row.attendance !== null) ? Math.round(row.attendance).toLocaleString() : 'N/A'}</td>

                {/* Cost data cells - Use dynamic keys */}
                {costKeys.map((key) => (
                  <td key={`cost-d-${key}-${index}`} className="py-2 px-3 text-right border-l">{formatCurrency(row[key] || 0)}</td>
                ))}
                <td className="py-2 px-3 text-right font-medium text-red-800 border-l border-r">{formatCurrency(row.costs || 0)}</td>
                <td className="py-2 px-3 text-right font-medium text-red-800">{formatCurrency(row.cumulativeCosts || 0)}</td>
                
                {/* Profit/Loss data cells */}
                <td className={`py-2 px-3 text-right font-medium bg-gray-50 border-l ${row.profit < 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(row.profit || 0)}</td>
                <td className={`py-2 px-3 text-right font-medium bg-gray-100 ${row.cumulativeProfit < 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(row.cumulativeProfit || 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  
  // Single data view - either revenue or cost
  return (
    <div className="overflow-x-auto mt-4">
      <h4 className="text-sm font-medium mb-2">
        Period-by-Period {revenueData ? "Revenue" : "Cost"} Details
      </h4>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 px-3">{timeUnit}</th>
            {revenueData && model.assumptions.revenue.map((stream, idx) => (
              <th key={idx} className="text-right py-2 px-3">{stream.name}</th>
            ))}
            {costData && model.assumptions.costs.map((cost, idx) => (
              <th key={idx} className="text-right py-2 px-3">{cost.name}</th>
            ))}
            <th className="text-right py-2 px-3 font-bold">
              Total {revenueData ? "Revenue" : "Costs"}
            </th>
            <th className="text-right py-2 px-3 font-bold">
              Cumulative {revenueData ? "Revenue" : "Costs"}
            </th>
          </tr>
        </thead>
        <tbody>
          {trendData.map((period, idx) => (
            <tr key={idx} className={idx % 2 === 0 ? "bg-gray-50" : ""}>
              <td className="py-2 px-3">{period.point || `Period ${idx+1}`}</td>
              {revenueData && model.assumptions.revenue.map((stream, streamIdx) => {
                const safeName = stream.name.replace(/[^a-zA-Z0-9]/g, "");
                return (
                  <td key={streamIdx} className="text-right py-2 px-3">
                    {formatCurrency(period[safeName] || 0)}
                  </td>
                );
              })}
              {costData && model.assumptions.costs.map((cost, costIdx) => {
                const safeName = cost.name.replace(/[^a-zA-Z0-9]/g, "");
                return (
                  <td key={costIdx} className="text-right py-2 px-3">
                    {formatCurrency(period[safeName] || 0)}
                  </td>
                );
              })}
              <td className="text-right py-2 px-3 font-bold">
                {formatCurrency(period.total || period.revenue || period.costs || 0)}
              </td>
              <td className="text-right py-2 px-3 font-bold text-green-700">
                {formatCurrency(period.cumulativeTotal || period.cumulativeRevenue || period.cumulativeCosts || 0)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default memo(FinancialMatrix);
