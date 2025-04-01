
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
  
  // Combined data view - both revenue and cost data in one table
  if (combinedView) {
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
              // Calculate per-period profit/loss
              const periodProfit = period.revenue - period.costs;
              const cumulativeProfit = period.cumulativeRevenue - period.cumulativeCosts;
              
              return (
                <tr key={idx} className={idx % 2 === 0 ? "bg-gray-50" : ""}>
                  <td className="py-2 px-3">{period.point}</td>
                  
                  {/* Revenue columns */}
                  {model.assumptions.revenue.map((stream, streamIdx) => {
                    const safeName = stream.name.replace(/[^a-zA-Z0-9]/g, "");
                    return (
                      <td key={streamIdx} className="text-right py-2 px-3 text-green-600">
                        ${period[safeName]?.toLocaleString() || "0"}
                      </td>
                    );
                  })}
                  <td className="text-right py-2 px-3 font-medium text-green-700 border-r">
                    ${period.revenue.toLocaleString()}
                  </td>
                  <td className="text-right py-2 px-3 font-medium text-green-800">
                    ${period.cumulativeRevenue.toLocaleString()}
                  </td>
                  
                  {/* Cost columns */}
                  {model.assumptions.costs.map((cost, costIdx) => {
                    const safeName = cost.name.replace(/[^a-zA-Z0-9]/g, "");
                    return (
                      <td key={costIdx} className="text-right py-2 px-3 text-red-600">
                        ${period[safeName]?.toLocaleString() || "0"}
                      </td>
                    );
                  })}
                  <td className="text-right py-2 px-3 font-medium text-red-700 border-r">
                    ${period.costs.toLocaleString()}
                  </td>
                  <td className="text-right py-2 px-3 font-medium text-red-800">
                    ${period.cumulativeCosts.toLocaleString()}
                  </td>
                  
                  {/* Profit/Loss column */}
                  <td className={`text-right py-2 px-3 font-medium ${periodProfit >= 0 ? 'text-black' : 'text-red-600'} bg-gray-50`}>
                    ${Math.abs(periodProfit).toLocaleString()}
                    {periodProfit < 0 && ' (Loss)'}
                  </td>
                  <td className={`text-right py-2 px-3 font-bold ${cumulativeProfit >= 0 ? 'text-black' : 'text-red-600'} bg-gray-100`}>
                    ${Math.abs(cumulativeProfit).toLocaleString()}
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
              <td className="py-2 px-3">{period.point}</td>
              {revenueData && model.assumptions.revenue.map((stream, streamIdx) => {
                const safeName = stream.name.replace(/[^a-zA-Z0-9]/g, "");
                return (
                  <td key={streamIdx} className="text-right py-2 px-3">
                    ${period[safeName]?.toLocaleString() || "0"}
                  </td>
                );
              })}
              {costData && model.assumptions.costs.map((cost, costIdx) => {
                const safeName = cost.name.replace(/[^a-zA-Z0-9]/g, "");
                return (
                  <td key={costIdx} className="text-right py-2 px-3">
                    ${period[safeName]?.toLocaleString() || "0"}
                  </td>
                );
              })}
              <td className="text-right py-2 px-3 font-bold">
                ${period.total?.toLocaleString() || (revenueData ? period.revenue?.toLocaleString() : period.costs?.toLocaleString())}
              </td>
              <td className="text-right py-2 px-3 font-bold text-green-700">
                ${period.cumulativeTotal?.toLocaleString() || (revenueData ? period.cumulativeRevenue?.toLocaleString() : period.cumulativeCosts?.toLocaleString())}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default FinancialMatrix;
