import { useEffect } from 'react';
import useStore from '@/store/useStore';
import { ExportDataType } from '@/store/types';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { MarketingChannelItem } from '@/types/models';

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

      // Get the marketing channels
      const marketingChannels = latestModel.assumptions?.marketing?.channels || [];

      // Get the time unit (Week or Month)
      const isWeeklyEvent = latestModel.assumptions?.metadata?.type === "WeeklyEvent";
      const timeUnit = isWeeklyEvent ? "Week" : "Month";

      // Get the duration
      const duration = isWeeklyEvent
        ? latestModel.assumptions?.metadata?.weeks || 12
        : 12;

      // Process channel data
      const channelData = marketingChannels.map(channel => {
        // Calculate total forecast for this channel
        const totalForecast = channel.weeklyBudget * duration;

        // Calculate total actual spend for this channel
        let totalActual = 0;
        actuals.forEach(actual => {
          if (actual.marketingActuals && actual.marketingActuals[channel.id]) {
            totalActual += actual.marketingActuals[channel.id].actualSpend;
          }
        });

        // Calculate variance
        const variance = totalActual - totalForecast;
        const variancePercent = totalForecast > 0 ? (variance / totalForecast) * 100 : 0;

        // Calculate cost per result if conversions are available
        let conversions = 0;
        let costPerResult = 0;

        actuals.forEach(actual => {
          if (actual.marketingActuals && actual.marketingActuals[channel.id] && actual.marketingActuals[channel.id].conversions) {
            conversions += actual.marketingActuals[channel.id].conversions || 0;
          }
        });

        if (conversions > 0) {
          costPerResult = totalActual / conversions;
        }

        return {
          id: channel.id,
          name: channel.name,
          type: channel.channelType,
          forecast: totalForecast,
          actual: totalActual,
          variance,
          variancePercent,
          conversions,
          costPerResult,
          distribution: channel.distribution || 'spreadEvenly',
          spreadDuration: channel.spreadDuration
        };
      });

      // Calculate summary data
      const totalForecast = marketingChannels.reduce((sum, channel) => sum + (channel.weeklyBudget * duration), 0);

      let totalActual = 0;
      actuals.forEach(actual => {
        if (actual.marketingActuals) {
          Object.values(actual.marketingActuals).forEach(channelActual => {
            totalActual += channelActual.actualSpend;
          });
        }
      });

      // Calculate forecast to date (for periods where we have actuals)
      const periodsWithActuals = actuals.map(a => a.period);
      const forecastToDate = marketingChannels.reduce((sum, channel) => {
        return sum + (channel.weeklyBudget * periodsWithActuals.length);
      }, 0);

      // Process period data
      const periodData = [];

      for (let period = 1; period <= duration; period++) {
        const periodObj: any = {
          period,
          name: `${timeUnit} ${period}`,
          totalForecast: 0,
          channels: {}
        };

        // Add forecast data for each channel
        marketingChannels.forEach(channel => {
          // For now, we'll assume even distribution across periods
          // This would be enhanced based on the distribution setting
          const forecastAmount = channel.weeklyBudget;
          periodObj.totalForecast += forecastAmount;
          periodObj.channels[channel.id] = forecastAmount;
        });

        // Add actual data if available
        const actualForPeriod = actuals.find(a => a.period === period);
        if (actualForPeriod && actualForPeriod.marketingActuals) {
          periodObj.totalActual = 0;
          periodObj.actualChannels = {};

          // Sum up actual spend for each channel
          Object.entries(actualForPeriod.marketingActuals).forEach(([channelId, channelActual]) => {
            periodObj.actualChannels[channelId] = channelActual.actualSpend;
            periodObj.totalActual = (periodObj.totalActual || 0) + channelActual.actualSpend;
          });
        }

        periodData.push(periodObj);
      }

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
          actualToDate: totalActual
        },
        marketingChannels: channelData,
        periods: periodData,
        performanceData: {
          // Add performance metrics for charts
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
        // Format the data for display
        formattedSummary: {
          totalForecast: formatCurrency(totalForecast),
          totalActual: formatCurrency(totalActual),
          percentUtilized: formatPercent(totalForecast > 0 ? (totalActual / totalForecast) * 100 : 0),
          forecastToDate: formatCurrency(forecastToDate),
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
