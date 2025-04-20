import { useEffect } from 'react';
import useStore from '@/store/useStore';
import { ExportDataType } from '@/store/types';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { MarketingChannelItem } from '@/types/models';
import { generateForecastTimeSeries } from '@/lib/financialCalculations';

interface MarketingAnalysisExportProps {
  projectId: number;
}

const MarketingAnalysisExport: React.FC<MarketingAnalysisExportProps> = ({ projectId }) => {
  // Use the modular store with specific selectors
  const {
    registerExportFunction,
    unregisterExportFunction,
    loadModels,
    loadActuals
  } = useStore(state => ({
    registerExportFunction: state.registerExportFunction,
    unregisterExportFunction: state.unregisterExportFunction,
    loadModels: state.loadModels,
    loadActuals: state.loadActualsForProject
  }));

  useEffect(() => {
    // Register the export function
    registerExportFunction('Marketing Analysis', async () => {
      // Load the data
      const models = await loadModels(projectId);
      const actuals = await loadActuals(projectId);

      // Get the latest model
      const latestModel = models.length > 0 ? models[0] : null;

      if (!latestModel) {
        return { error: 'No model found for this project' };
      }

      // Check if detailed channels mode is enabled
      const isDetailedChannelsMode = latestModel.assumptions?.marketing?.allocationMode === 'channels';

      if (!isDetailedChannelsMode) {
        return { error: 'Detailed Channels mode is not enabled for this project' };
      }

      // Generate forecast time series using the shared calculation logic
      const forecastPeriods = generateForecastTimeSeries(latestModel);

      // Compute summary metrics
      const totalForecast = forecastPeriods.reduce((sum, period) => sum + (period.marketingTotal || 0), 0);
      const totalActual = forecastPeriods.reduce((sum, period) => sum + (period.marketingActual || 0), 0);
      const profit = forecastPeriods.reduce((sum, period) => sum + (period.profit || 0), 0);
      const totalRevenue = forecastPeriods.reduce((sum, period) => sum + (period.revenue || 0), 0);
      const totalCost = forecastPeriods.reduce((sum, period) => sum + (period.cost || 0), 0);
      const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

      // For channels, aggregate per channel over all periods
      const marketingChannels = latestModel.assumptions?.marketing?.channels || [];
      const channelData = marketingChannels.map(channel => {
        // Sum forecast and actuals for this channel across all periods
        let forecast = 0;
        let actual = 0;
        let conversions = 0;
        forecastPeriods.forEach(period => {
          if (period.marketingChannels && period.marketingChannels[channel.id]) {
            forecast += period.marketingChannels[channel.id].forecast || 0;
            actual += period.marketingChannels[channel.id].actual || 0;
            conversions += period.marketingChannels[channel.id].conversions || 0;
          }
        });
        const variance = actual - forecast;
        const variancePercent = forecast > 0 ? (variance / forecast) * 100 : 0;
        const costPerResult = conversions > 0 ? actual / conversions : 0;
        return {
          id: channel.id,
          name: channel.name,
          type: channel.channelType,
          forecast,
          actual,
          variance,
          variancePercent,
          conversions,
          costPerResult,
          distribution: channel.distribution || 'spreadEvenly',
          spreadDuration: channel.spreadDuration
        };
      });

      // Prepare period data for export (align with forecastPeriods)
      const periodData = forecastPeriods.map((period, idx) => ({
        period: idx + 1,
        name: period.name || `Week ${idx + 1}`,
        totalForecast: period.marketingTotal || 0,
        totalActual: period.marketingActual || 0,
        channels: period.marketingChannels
          ? Object.fromEntries(Object.entries(period.marketingChannels).map(([id, d]) => [id, d.forecast || 0]))
          : {},
        actualChannels: period.marketingChannels
          ? Object.fromEntries(Object.entries(period.marketingChannels).map(([id, d]) => [id, d.actual || 0]))
          : {},
        revenue: period.revenue || 0,
        cost: period.cost || 0,
        profit: period.profit || 0
      }));

      // Compute forecast to date (for periods where we have actuals)
      const periodsWithActuals = periodData.filter(p => p.totalActual > 0).map(p => p.period);
      const forecastToDate = periodData
        .filter(p => periodsWithActuals.includes(p.period))
        .reduce((sum, p) => sum + (p.totalForecast || 0), 0);

      // Prepare the export data
      const exportData: ExportDataType = {
        title: 'Marketing Analysis',
        projectName: latestModel.name,
        exportDate: new Date(),
        summary: {
          totalForecast,
          totalActual,
          percentUtilized: totalForecast > 0 ? (totalActual / totalForecast) * 100 : 0,
          forecastToDate,
          profit,
          profitMargin,
          actualToDate: totalActual
        },
        marketingChannels: channelData,
        periods: periodData,
        performanceData: {
          channelPerformance: channelData.map(channel => ({
            name: channel.name,
            forecast: channel.forecast,
            actual: channel.actual,
            variance: channel.variance
          })),
          periodPerformance: periodData.map(period => ({
            name: period.name,
            forecast: period.totalForecast,
            actual: period.totalActual || 0
          }))
        },
        formattedSummary: {
          totalForecast: formatCurrency(totalForecast),
          totalActual: formatCurrency(totalActual),
          percentUtilized: formatPercent(totalForecast > 0 ? (totalActual / totalForecast) * 100 : 0),
          forecastToDate: formatCurrency(forecastToDate),
          profit: formatCurrency(profit),
          profitMargin: formatPercent(profitMargin),
          actualToDate: formatCurrency(totalActual)
        },
        formattedChannels: channelData.map(channel => ({
          ...channel,
          forecast: formatCurrency(channel.forecast),
          actual: formatCurrency(channel.actual),
          variance: formatCurrency(channel.variance),
          variancePercent: formatPercent(channel.variancePercent),
          costPerResult: channel.costPerResult > 0 ? formatCurrency(channel.costPerResult) : 'N/A'
        }))
      };

      return exportData;
    });

    // Cleanup on unmount
    return () => {
      unregisterExportFunction('Marketing Analysis');
    };
  }, [projectId, registerExportFunction, unregisterExportFunction, loadModels, loadActuals]);

  // This component doesn't render anything
  return null;
};

export default MarketingAnalysisExport;
