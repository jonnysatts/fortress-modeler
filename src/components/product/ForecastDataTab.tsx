import React from "react";
import useStore from '@/store/useStore';
import ForecastDataTable from '../scenarios/ForecastDataTable';

/**
 * ForecastDataTab (Product-level)
 * Shows a detailed week-by-week breakdown of all forecasted revenue and cost line items for the main model (from Forecast Builder).
 */
const ForecastDataTab: React.FC = () => {
  const baselineForecastData = useStore(state => state.baselineForecastData);

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-2">Forecast Data Table</h2>
      <p className="text-sm text-muted-foreground mb-4">
        This table shows a detailed week-by-week breakdown of all forecasted revenue and cost line items for the main model. Use this view to audit calculations and understand how each assumption plays out over time.
      </p>
      <ForecastDataTable data={baselineForecastData || []} />
    </div>
  );
};

export default ForecastDataTab;
