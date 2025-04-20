import React from "react";
import useStore from '@/store/useStore';
import ForecastDataTable from './ForecastDataTable';

/**
 * ForecastDataTab
 * A tab for showing the detailed week-by-week forecast data table, including all revenue and cost line items.
 * Plugs into scenarioForecastData from Zustand store.
 */
const ForecastDataTab: React.FC = () => {
  const scenarioForecastData = useStore(state => state.scenarioForecastData);

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-2">Forecast Data Table</h2>
      <p className="text-sm text-muted-foreground mb-4">
        This table shows a detailed week-by-week breakdown of all forecasted revenue and cost line items. Use this view to audit calculations and understand how each assumption plays out over time.
      </p>
      <ForecastDataTable data={scenarioForecastData || []} />
    </div>
  );
};

export default ForecastDataTab;
