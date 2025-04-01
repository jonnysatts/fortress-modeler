import { useState } from "react";
import { FinancialModel } from "@/lib/db";

interface FinancialMatrixProps {
  model: FinancialModel;
  trendData: any[];
  revenueData?: boolean;
  costData?: boolean;
  combinedView?: boolean;
  shouldSpreadSetupCosts?: boolean;
}

const FinancialMatrix = ({ 
  model, 
  trendData,
  revenueData = false,
  costData = false,
  combinedView = false,
  shouldSpreadSetupCosts = false
}: FinancialMatrixProps) => {
  const isWeeklyEvent = model.assumptions.metadata?.type === "WeeklyEvent";
  const timeUnit = isWeeklyEvent ? "Week" : "Month";
  
  if (!trendData || trendData.length === 0) {
    return (
      <div className="p-4 border border-gray-200 rounded-md bg-gray-50">
        <p className="text-gray-600">
          No data available to display. Please wait while data is being loaded...
        </p>
      </div>
    );
  }
  
  console.log("FinancialMatrix received data:", trendData[0]);
  console.log("Should spread setup costs:", shouldSpreadSetupCosts);
  
  const findSetupCost = () => {
    return model.assumptions.costs.find(cost => cost.name === "Setup Costs");
  };

  if (combinedView) {
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

    const setupCost = findSetupCost();
    const setupCostValue = setupCost ? setupCost.value : 0;
    const weeks = model.assumptions.metadata?.weeks || 12;
    
    return (
      <div className="overflow-x-auto mt-4">
        <h4 className="text-sm font-medium mb-2">Period-by-Period Financial Matrix</h4>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-3">{timeUnit}</th>
              
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
              const periodRevenue = period.revenue || 0;
              const periodCosts = period.costs || 0;
              const cumulativeRevenue = period.cumulativeRevenue || 0;
              const cumulativeCosts = period.cumulativeCosts || 0;
              
              const periodProfit = periodRevenue - periodCosts;
              const cumulativeProfit = cumulativeRevenue - cumulativeCosts;

              const setupCostDisplay = (() => {
                if (!setupCost) return 0;
                
                if (shouldSpreadSetupCosts) {
                  return setupCostValue / weeks;
                } else {
                  return idx === 0 ? setupCostValue : 0;
                }
              })();
              
              return (
                <tr key={idx} className={idx % 2 === 0 ? "bg-gray-50" : ""}>
                  <td className="py-2 px-3">{period.point || `Period ${idx+1}`}</td>
                  
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
                  
                  {model.assumptions.costs.map((cost, costIdx) => {
                    const safeName = cost.name.replace(/[^a-zA-Z0-9]/g, "");
                    
                    let displayValue = period[safeName] || 0;
                    if (cost.name === "Setup Costs") {
                      displayValue = setupCostDisplay;
                    }
                    
                    return (
                      <td key={costIdx} className="text-right py-2 px-3 text-red-600">
                        ${Math.ceil(displayValue).toLocaleString()}
                      </td>
                    );
                  })}
                  <td className="text-right py-2 px-3 font-medium text-red-700 border-r">
                    ${Math.ceil(periodCosts).toLocaleString()}
                  </td>
                  <td className="text-right py-2 px-3 font-medium text-red-800">
                    ${Math.ceil(cumulativeCosts).toLocaleString()}
                  </td>
                  
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
            <th className="text-right py-2 px-3 font-bold text-red-700">
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
              <td className="text-right py-2 px-3 font-bold text-red-700">
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
