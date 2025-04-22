import React from "react";
import { ForecastPeriodData } from "@/lib/financialCalculations";

interface ForecastDataTableProps {
  data: ForecastPeriodData[];
}

/**
 * ForecastDataTable (with Optional Revenue Split & Smart Cost Columns)
 * Renders a detailed week-by-week breakdown of all forecasted revenue and cost line items.
 * If ticketRevenue, fbRevenue, or merchRevenue are present, display them as extra columns.
 * Hides any cost columns where the sum for all periods is zero.
 */
const ForecastDataTable: React.FC<ForecastDataTableProps> = ({ data }) => {
  if (!data || data.length === 0) return <div className="p-4">No forecast data available.</div>;

  // --- Dynamically detect which revenue columns to show ---
  const showTicket = data.some(p => typeof p.ticketRevenue === 'number');
  const showFB = data.some(p => typeof p.fbRevenue === 'number');
  const showMerch = data.some(p => typeof p.merchRevenue === 'number');
  const revenueKeys = [
    ...(showTicket ? [{ key: 'ticketRevenue', label: 'Ticket Sales' }] : []),
    ...(showFB ? [{ key: 'fbRevenue', label: 'F&B Sales' }] : []),
    ...(showMerch ? [{ key: 'merchRevenue', label: 'Merchandise Sales' }] : [])
  ];

  // --- Collect all unique cost keys, but only keep those with nonzero totals ---
  const allCostKeysRaw = Array.from(
    data.reduce((acc, period) => {
      Object.keys(period.costBreakdown || {}).forEach((k) => acc.add(k));
      return acc;
    }, new Set<string>())
  );
  // Compute total for each cost key
  const costKeyTotals = Object.fromEntries(
    allCostKeysRaw.map(costKey => [costKey, data.reduce((sum, period) => sum + (period.costBreakdown?.[costKey] || 0), 0)])
  );
  // Only show cost columns with nonzero total
  const allCostKeys = allCostKeysRaw.filter(costKey => costKeyTotals[costKey] !== 0);

  // --- Totals Row Calculation ---
  const totals = {
    revenue: 0,
    profit: 0,
    totalCost: 0,
    costBreakdown: {} as Record<string, number>,
    revenueBreakdown: {} as Record<string, number>,
  };
  data.forEach((period) => {
    totals.revenue += period.revenue || 0;
    totals.profit += period.profit || 0;
    totals.totalCost += period.totalCost || 0;
    allCostKeys.forEach((costKey) => {
      totals.costBreakdown[costKey] = (totals.costBreakdown[costKey] || 0) + (period.costBreakdown?.[costKey] || 0);
    });
    revenueKeys.forEach(({ key }) => {
      const val = (period as any)[key] ?? 0;
      totals.revenueBreakdown[key] = (totals.revenueBreakdown[key] || 0) + (val || 0);
    });
  });

  return (
    <div className="overflow-x-auto p-4">
      <table className="min-w-full border text-xs">
        <thead>
          <tr>
            <th className="border px-2 py-1 bg-muted">Period</th>
            <th className="border px-2 py-1 bg-muted">Attendance</th>
            <th className="border px-2 py-1 bg-muted">Ticket Price</th>
            {revenueKeys.map(({ key, label }) => (
              <th key={key} className="border px-2 py-1">{label}</th>
            ))}
            <th className="border px-2 py-1">Total Revenue</th>
            {allCostKeys.map((costKey) => (
              <th key={costKey} className="border px-2 py-1">
                {costKey}
              </th>
            ))}
            <th className="border px-2 py-1">Total Cost</th>
            <th className="border px-2 py-1">Profit</th>
          </tr>
        </thead>
        <tbody>
          {data.map((period) => (
            <tr key={period.period}>
              <td className="border px-2 py-1 font-bold">{period.period}</td>
              <td className="border px-2 py-1">{period.attendance !== undefined ? period.attendance.toLocaleString() : '-'}</td>
              <td className="border px-2 py-1">{typeof period.ticketRevenue === 'number' && period.attendance ? `$${(period.ticketRevenue / period.attendance).toFixed(2)}` : '-'}</td>
              {revenueKeys.map(({ key }) => (
                <td key={key} className="border px-2 py-1">${Math.round((period as any)[key] ?? 0).toLocaleString()}</td>
              ))}
              <td className="border px-2 py-1">${Math.round(period.revenue).toLocaleString()}</td>
              {allCostKeys.map((costKey) => (
                <td key={costKey} className="border px-2 py-1">
                  {period.costBreakdown && period.costBreakdown[costKey] !== undefined
                    ? `$${Math.round(period.costBreakdown[costKey]).toLocaleString()}`
                    : "-"}
                </td>
              ))}
              <td className="border px-2 py-1 font-semibold">${Math.round(period.totalCost || 0).toLocaleString()}</td>
              <td className="border px-2 py-1 font-semibold">${Math.round(period.profit || 0).toLocaleString()}</td>
            </tr>
          ))}
          <tr className="bg-muted font-bold">
            <td className="border px-2 py-1">Total</td>
            <td className="border px-2 py-1">-</td>
            <td className="border px-2 py-1">-</td>
            {revenueKeys.map(({ key }) => (
              <td key={key} className="border px-2 py-1">${Math.round(totals.revenueBreakdown[key] || 0).toLocaleString()}</td>
            ))}
            <td className="border px-2 py-1">${Math.round(totals.revenue).toLocaleString()}</td>
            {allCostKeys.map((costKey) => (
              <td key={costKey} className="border px-2 py-1">
                ${Math.round(totals.costBreakdown[costKey] || 0).toLocaleString()}
              </td>
            ))}
            <td className="border px-2 py-1">${Math.round(totals.totalCost).toLocaleString()}</td>
            <td className="border px-2 py-1">${Math.round(totals.profit).toLocaleString()}</td>
          </tr>
        </tbody>
      </table>
      <div className="text-xs text-muted-foreground mt-2">
        <b>Tip:</b> Use horizontal scroll to see all columns.
      </div>
    </div>
  );
};

export default ForecastDataTable;
