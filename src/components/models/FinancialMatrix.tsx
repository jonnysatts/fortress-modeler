
import { useState } from "react";
import { FinancialModel } from "@/lib/db";

interface FinancialMatrixProps {
  model: FinancialModel;
  trendData: any[];
  revenueData?: boolean;
  costData?: boolean;
  combinedView?: boolean;
}

const FinancialMatrix = ({ 
  model, 
  trendData,
  revenueData = false,
  costData = false,
  combinedView = false
}: FinancialMatrixProps) => {
  const isWeeklyEvent = model.assumptions.metadata?.type === "WeeklyEvent";
  const timeUnit = isWeeklyEvent ? "Week" : "Month";
  
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
  
  // Debug the incoming data
  console.log("FinancialMatrix received data:", trendData[0]);
  
  // Combined data view - both revenue and cost data in one table
  if (combinedView) {
    // Validate that we have the required properties
    const hasRequiredData = trendData.every(period => 
      typeof period.revenue !== 'undefined' && 
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
    
    return (
      <div className="overflow-x-auto mt-4">
        <h4 className="text-sm font-medium mb-2">Period-by-Period Financial Matrix</h4>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-3">{timeUnit}</th>
              
              {/* Revenue columns */}
              {model.assumptions.revenue.map((stream, idx) => (
                <th key={`rev-${idx}`} className="text-right py-2 px-3 text-green-700">
                  {stream.name}
                </th>
              ))}
              <th className="text-right py-2 px-3 font-bold text-green-800 border-r">
                Total Revenue
              </th>
              <th className="text-right py-2 px-3 font-bold text-green-800">
                Cum. Revenue
              </th>
              
              {/* Cost columns */}
              {model.assumptions.costs.map((cost, idx) => (
                <th key={`cost-${idx}`} className="text-right py-2 px-3 text-red-700">
                  {cost.name}
                </th>
              ))}
              <th className="text-right py-2 px-3 font-bold text-red-800 border-r">
                Total Costs
              </th>
              <th className="text-right py-2 px-3 font-bold text-red-800">
                Cum. Costs
              </th>
              
              {/* Profit/Loss column */}
              <th className="text-right py-2 px-3 font-bold bg-gray-50">
                Profit/Loss
              </th>
              <th className="text-right py-2 px-3 font-bold bg-gray-100">
                Cum. P/L
              </th>
            </tr>
          </thead>
          <tbody>
            {trendData.map((period, idx) => {
              // Calculate per-period profit/loss with fallbacks for missing data
              const periodRevenue = period.revenue || 0;
              const periodCosts = period.costs || 0;
              const cumulativeRevenue = period.cumulativeRevenue || 0;
              const cumulativeCosts = period.cumulativeCosts || 0;
              
              const periodProfit = periodRevenue - periodCosts;
              const cumulativeProfit = cumulativeRevenue - cumulativeCosts;
              
              return (
                <tr key={idx} className={idx % 2 === 0 ? "bg-gray-50" : ""}>
                  <td className="py-2 px-3">{period.point || `Period ${idx+1}`}</td>
                  
                  {/* Revenue columns */}
                  {model.assumptions.revenue.map((stream, streamIdx) => {
                    const safeName = stream.name.replace(/[^a-zA-Z0-9]/g, "");
                    return (
                      <td key={streamIdx} className="text-right py-2 px-3 text-green-600">
                        ${Math.ceil(period[safeName] || 0).toLocaleString()}
                      </td>
                    );
                  })}
                  <td className="text-right py-2 px-3 font-medium text-green-700 border-r">
                    ${Math.ceil(periodRevenue).toLocaleString()}
                  </td>
                  <td className="text-right py-2 px-3 font-medium text-green-800">
                    ${Math.ceil(cumulativeRevenue).toLocaleString()}
                  </td>
                  
                  {/* Cost columns */}
                  {model.assumptions.costs.map((cost, costIdx) => {
                    const safeName = cost.name.replace(/[^a-zA-Z0-9]/g, "");
                    return (
                      <td key={costIdx} className="text-right py-2 px-3 text-red-600">
                        ${Math.ceil(period[safeName] || 0).toLocaleString()}
                      </td>
                    );
                  })}
                  <td className="text-right py-2 px-3 font-medium text-red-700 border-r">
                    ${Math.ceil(periodCosts).toLocaleString()}
                  </td>
                  <td className="text-right py-2 px-3 font-medium text-red-800">
                    ${Math.ceil(cumulativeCosts).toLocaleString()}
                  </td>
                  
                  {/* Profit/Loss column */}
                  <td className={`text-right py-2 px-3 font-medium ${periodProfit >= 0 ? 'text-black' : 'text-red-600'} bg-gray-50`}>
                    ${Math.ceil(Math.abs(periodProfit)).toLocaleString()}
                    {periodProfit < 0 && ' (Loss)'}
                  </td>
                  <td className={`text-right py-2 px-3 font-bold ${cumulativeProfit >= 0 ? 'text-black' : 'text-red-600'} bg-gray-100`}>
                    ${Math.ceil(Math.abs(cumulativeProfit)).toLocaleString()}
                    {cumulativeProfit < 0 && ' (Loss)'}
                  </td>
                </tr>
              );
            })}
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
                    ${Math.ceil(period[safeName] || 0).toLocaleString()}
                  </td>
                );
              })}
              {costData && model.assumptions.costs.map((cost, costIdx) => {
                const safeName = cost.name.replace(/[^a-zA-Z0-9]/g, "");
                return (
                  <td key={costIdx} className="text-right py-2 px-3">
                    ${Math.ceil(period[safeName] || 0).toLocaleString()}
                  </td>
                );
              })}
              <td className="text-right py-2 px-3 font-bold">
                ${Math.ceil(period.total || period.revenue || period.costs || 0).toLocaleString()}
              </td>
              <td className="text-right py-2 px-3 font-bold text-green-700">
                ${Math.ceil(period.cumulativeTotal || period.cumulativeRevenue || period.cumulativeCosts || 0).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default FinancialMatrix;
