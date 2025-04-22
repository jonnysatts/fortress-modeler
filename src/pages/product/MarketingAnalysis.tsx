import React, { useState, useEffect, useCallback } from 'react';
import MarketingAnalysisExport from '@/components/product/MarketingAnalysisExport';
import { useParams } from 'react-router-dom';
import { FinancialModel, ActualsPeriodEntry } from '@/lib/db';
import useStore from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TypographyH4, TypographyMuted } from '@/components/ui/typography';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Info, Download, PieChart, BarChart3 } from 'lucide-react';
import { formatCurrency, formatPercent } from '@/lib/utils';
import ChartContainer from '@/components/common/ChartContainer';
import ContentCard from '@/components/common/ContentCard';
import ScrollableTable from '@/components/common/ScrollableTable';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell
} from 'recharts';
import { MarketingChannelItem, MarketingChannelActual } from '@/types/models';
import { dataColors } from '@/lib/colors';

// Define a type for the marketing channel data with actuals
interface MarketingChannelData extends MarketingChannelItem {
  totalForecast?: number;  // Total forecast for the entire duration
  forecastToDate?: number; // Forecast up to the latest period with actuals
  actualSpend?: number;
  variance?: number;
  variancePercent?: number;
  conversions?: number;
  costPerResult?: number;
}

// Define a type for the period data
interface MarketingPeriodData {
  period: number;
  name: string;
  totalForecast: number;
  totalActual?: number;
  channels: Record<string, number>; // Forecast amounts by channel ID
  actualChannels?: Record<string, number>; // Actual amounts by channel ID
}

const MarketingAnalysis: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();

  // Use the modular store with specific selectors
  const {
    currentProject,
    loadModels,
    loadActuals,
    error,
    loading,
    registerExportFunction
  } = useStore(state => ({
    currentProject: state.currentProject,
    loadModels: state.loadModels,
    loadActuals: state.loadActualsForProject,
    error: state.error,
    loading: state.loading,
    registerExportFunction: state.registerExportFunction
  }));

  const [models, setModels] = useState<FinancialModel[]>([]);
  const [actuals, setActuals] = useState<ActualsPeriodEntry[]>([]);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [channelData, setChannelData] = useState<MarketingChannelData[]>([]);
  const [periodData, setPeriodData] = useState<MarketingPeriodData[]>([]);
  const [summaryData, setSummaryData] = useState({
    totalForecast: 0,
    totalActual: 0,
    percentUtilized: 0,
    forecastToDate: 0,
    actualToDate: 0
  });

  // Load data
  const loadData = useCallback(async () => {
    if (projectId) {
      try {
        const projectIdNum = parseInt(projectId);
        const loadedModels = await loadModels(projectIdNum);
        const loadedActuals = await loadActuals(projectIdNum);

        setModels(loadedModels);
        setActuals(loadedActuals);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    }
  }, [projectId, loadModels, loadActuals]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Get the latest model
  const latestModel = models.length > 0 ? models[0] : null;

  // Check if detailed channels mode is enabled
  const isDetailedChannelsMode = latestModel?.assumptions?.marketing?.allocationMode === 'channels';

  // Get the marketing channels
  const marketingChannels = latestModel?.assumptions?.marketing?.channels || [];

  // Get the time unit (Week or Month)
  const isWeeklyEvent = latestModel?.assumptions?.metadata?.type === "WeeklyEvent";
  const timeUnit = isWeeklyEvent ? "Week" : "Month";

  // Get the duration
  const duration = isWeeklyEvent
    ? latestModel?.assumptions?.metadata?.weeks || 12
    : 12;

  // Process data when models or actuals change
  useEffect(() => {
    if (!latestModel || !isDetailedChannelsMode) return;

    // Process channel data
    const channels = marketingChannels.map(channel => {
      // [AUDIT] All marketing channel calculations below must use the output of the calculation engine (baselineForecastData or scenarioForecastData).
      // Remove any per-channel calculation logic that duplicates the engine. Only summarize or format the engine output.
      // [TODO: If any such logic found, refactor to use engine output.]
      return {
        ...channel,
        totalForecast: channel.baselineForecastData?.total || 0,
        forecastToDate: channel.baselineForecastData?.toDate || 0,
        actualSpend: channel.actualSpend || 0,
        variance: channel.actualSpend - channel.baselineForecastData?.toDate || 0,
        variancePercent: channel.baselineForecastData?.toDate > 0 ? ((channel.actualSpend - channel.baselineForecastData?.toDate) / channel.baselineForecastData?.toDate) * 100 : 0,
        conversions: channel.conversions || 0,
        costPerResult: channel.conversions > 0 ? channel.actualSpend / channel.conversions : 0
      };
    });

    setChannelData(channels);

    // Process period data
    const periods: MarketingPeriodData[] = [];

    for (let period = 1; period <= duration; period++) {
      const periodObj: MarketingPeriodData = {
        period,
        name: `${timeUnit} ${period}`,
        totalForecast: 0,
        channels: {}
      };

      // Add forecast data for each channel
      marketingChannels.forEach(channel => {
        periodObj.channels[channel.id] = channel.baselineForecastData?.periods[period - 1] || 0;
        periodObj.totalForecast += periodObj.channels[channel.id];
      });

      // Add actual data if available
      const actualForPeriod = actuals.find(a => a.period === period);
      if (actualForPeriod && actualForPeriod.marketingActuals) {
        periodObj.totalActual = 0;
        periodObj.actualChannels = {};

        // Sum up actual spend for each channel
        Object.entries(actualForPeriod.marketingActuals).forEach(([channelId, channelActual]) => {
          if (periodObj.actualChannels) {
            periodObj.actualChannels[channelId] = channelActual.actualSpend;
            periodObj.totalActual = (periodObj.totalActual || 0) + channelActual.actualSpend;
          }
        });
      }

      periods.push(periodObj);
    }

    setPeriodData(periods);

    // Calculate summary data
    const totalForecast = marketingChannels.reduce((sum, channel) => sum + channel.baselineForecastData?.total || 0, 0);

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
    const forecastToDate = marketingChannels.reduce((sum, channel) => sum + (channel.baselineForecastData?.toDate || 0), 0);

    setSummaryData({
      totalForecast,
      totalActual,
      percentUtilized: totalForecast > 0 ? (totalActual / totalForecast) * 100 : 0,
      forecastToDate,
      actualToDate: totalActual
    });

  }, [latestModel, actuals, duration, isDetailedChannelsMode, marketingChannels, timeUnit]);

  // Generate colors for pie chart - using the category colors from our design system
  const COLORS = dataColors.category;

  // Prepare data for pie chart
  const pieChartData = channelData.map((channel, index) => ({
    name: channel.name,
    value: channel.totalForecast,
    color: COLORS[index % COLORS.length]
  }));

  // Register export function
  useEffect(() => {
    // Create export data function
    const exportMarketingAnalysis = () => {
      return {
        projectName: currentProject?.name,
        projectId: projectId,
        summary: summaryData,
        formattedChannels: channelData.map(channel => ({
          name: channel.name,
          forecast: formatCurrency(channel.totalForecast || 0),
          actual: formatCurrency(channel.actualSpend || 0),
          variance: formatCurrency(channel.variance || 0),
          variancePercent: formatPercent(channel.variancePercent || 0)
        })),
        periodData: periodData
      };
    };

    // Register the export function
    registerExportFunction('Marketing Analysis', exportMarketingAnalysis);

    // Clean up when component unmounts
    return () => {
      useStore.getState().unregisterExportFunction('Marketing Analysis');
    };
  }, [currentProject, projectId, summaryData, channelData, periodData, registerExportFunction]);

  // Handle export
  const handleExport = (format: 'csv' | 'pdf') => {
    if (projectId) {
      useStore.getState().triggerExport('Marketing Analysis', format === 'pdf' ? 'pdf' : 'json');
    }
  };

  if (loading.isLoading) {
    return <div className="py-8 text-center">Loading marketing data...</div>;
  }

  // Show error state if there's an error
  if (error.isError) {
    return (
      <div className="py-8 text-center">
        <div className="flex items-center justify-center">
          <Info className="h-12 w-12 text-red-500 mx-auto mb-4" />
        </div>
        <TypographyH4>Error Loading Data</TypographyH4>
        <TypographyMuted className="mt-2">
          {error.message || 'An error occurred while loading the marketing data.'}
        </TypographyMuted>
      </div>
    );
  }

  if (!isDetailedChannelsMode) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <TypographyH4>Marketing Analysis</TypographyH4>
            <TypographyMuted>Analyze your marketing spend by channel</TypographyMuted>
          </div>
        </div>

        <ContentCard>
          <div className="flex items-center p-4 bg-amber-50 border border-amber-200 rounded-md">
            <Info className="h-5 w-5 text-amber-500 mr-3 flex-shrink-0" />
            <div>
              <p className="text-amber-700 font-medium">Detailed Channels Mode Not Enabled</p>
              <p className="text-amber-600 text-sm mt-1">
                To use Marketing Analysis, you need to enable "Detailed Channels" mode in the Forecast Builder.
                This will allow you to track and analyze your marketing spend by channel.
              </p>
              <Button
                variant="outline"
                className="mt-3 bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100"
                onClick={() => window.location.href = `/projects/${projectId}/forecast-builder`}
              >
                Go to Forecast Builder
              </Button>
            </div>
          </div>
        </ContentCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {projectId && <MarketingAnalysisExport projectId={parseInt(projectId)} />}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <TypographyH4>Marketing Analysis</TypographyH4>
          <TypographyMuted>Analyze your marketing spend by channel</TypographyMuted>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleExport('csv')}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => handleExport('pdf')}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Top-Level Summary Panel */}
      <ContentCard>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Total Budget</h3>
            <p className="text-2xl font-bold">{formatCurrency(summaryData.totalForecast)}</p>
            <div className="text-xs text-muted-foreground mt-1">Full campaign</div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Budget to Date</h3>
            <p className="text-2xl font-bold">{formatCurrency(summaryData.forecastToDate)}</p>
            <div className="text-xs text-muted-foreground mt-1">
              {actuals.length > 0 ? `Through ${timeUnit} ${Math.max(...actuals.map(a => a.period))}` : ''}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Actual Spend</h3>
            <p className="text-2xl font-bold">{formatCurrency(summaryData.totalActual)}</p>
            <div className="flex items-center mt-1">
              <span className={`text-sm ${summaryData.totalActual <= summaryData.forecastToDate ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercent(summaryData.forecastToDate > 0 ? (summaryData.totalActual / summaryData.forecastToDate) * 100 : 0)} of budget to date
              </span>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Budget Utilization</h3>
            <p className="text-2xl font-bold">{formatPercent(summaryData.forecastToDate > 0 ? (summaryData.totalActual / summaryData.forecastToDate) * 100 : 0)}</p>
            <Progress value={summaryData.forecastToDate > 0 ? (summaryData.totalActual / summaryData.forecastToDate) * 100 : 0} className="h-2 mt-2" />
          </div>
        </div>
      </ContentCard>

      {/* Tabs for different views */}
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="channels">Channel Breakdown</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Stacked Bar Chart */}
            <ChartContainer
              title="Marketing Spend by Channel"
              description="Forecast vs. Actual spend by channel"
              height={400}
              allowDownload={true}
              downloadData={periodData}
              downloadFilename="marketing-spend-by-channel.csv"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={periodData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={dataColors.grid} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    tickLine={{ stroke: dataColors.grid }}
                    axisLine={{ stroke: dataColors.grid }}
                  />
                  <YAxis
                    tickFormatter={(value) => formatCurrency(value)}
                    tick={{ fontSize: 11 }}
                    tickLine={{ stroke: dataColors.grid }}
                    axisLine={{ stroke: dataColors.grid }}
                    width={60}
                  />
                  <Tooltip
                    formatter={(value) => formatCurrency(value as number)}
                    contentStyle={{
                      backgroundColor: dataColors.tooltip.background,
                      borderColor: dataColors.tooltip.border,
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                      padding: '8px 12px',
                    }}
                    labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                  />
                  {marketingChannels.map((channel, index) => (
                    <Bar
                      key={channel.id}
                      dataKey={`channels.${channel.id}`}
                      name={channel.name}
                      stackId="forecast"
                      fill={COLORS[index % COLORS.length]}
                      fillOpacity={0.9}
                      radius={[0, 0, 0, 0]}
                      animationDuration={1000}
                      animationEasing="ease-out"
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>

            {/* Pie Chart */}
            <ChartContainer
              title="Budget Allocation"
              description="Percentage of budget allocated to each channel"
              height={400}
              allowDownload={true}
              downloadData={pieChartData}
              downloadFilename="marketing-budget-allocation.csv"
            >
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={2}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    labelStyle={{ fontSize: 11, fill: '#333', fontWeight: 500 }}
                    animationDuration={1500}
                    animationEasing="ease-out"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        stroke={dataColors.tooltip.background}
                        strokeWidth={1}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatCurrency(value as number)}
                    contentStyle={{
                      backgroundColor: dataColors.tooltip.background,
                      borderColor: dataColors.tooltip.border,
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                      padding: '8px 12px',
                    }}
                    labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </TabsContent>

        {/* Channel Breakdown Tab */}
        <TabsContent value="channels" className="space-y-6">
          <ContentCard>
            <ScrollableTable minWidth="800px">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b bg-muted/40 sticky top-0 z-10">
                    <th className="py-2 px-4 text-left">Channel</th>
                    <th className="py-2 px-4 text-right">Total Budget</th>
                    <th className="py-2 px-4 text-right">Budget to Date</th>
                    <th className="py-2 px-4 text-right">Actual Spend</th>
                    <th className="py-2 px-4 text-right">Variance ($)</th>
                    <th className="py-2 px-4 text-right">Variance (%)</th>
                    <th className="py-2 px-4 text-center">Distribution</th>
                    {/* Optional column for cost per result */}
                    <th className="py-2 px-4 text-right">Cost Per Result</th>
                  </tr>
                </thead>
                <tbody>
                  {channelData.map((channel) => (
                    <tr key={channel.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-4">
                        <div className="font-medium">{channel.name}</div>
                        <div className="text-xs text-muted-foreground">{channel.channelType}</div>
                      </td>
                      <td className="py-2 px-4 text-right">
                        {formatCurrency(channel.totalForecast || 0)}
                      </td>
                      <td className="py-2 px-4 text-right">
                        {formatCurrency(channel.forecastToDate || 0)}
                        <div className="text-xs text-muted-foreground">
                          {actuals.length > 0 ? `Through ${timeUnit} ${Math.max(...actuals.map(a => a.period))}` : ''}
                        </div>
                      </td>
                      <td className="py-2 px-4 text-right">
                        {channel.actualSpend !== undefined
                          ? formatCurrency(channel.actualSpend)
                          : '-'}
                      </td>
                      <td className="py-2 px-4 text-right">
                        {channel.variance !== undefined ? (
                          <span className={channel.variance >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {formatCurrency(channel.variance)}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="py-2 px-4 text-right">
                        {channel.variancePercent !== undefined ? (
                          <span className={channel.variancePercent >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {formatPercent(channel.variancePercent)}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="py-2 px-4 text-center">
                        <Badge variant="outline">
                          {channel.distribution || 'Spread Evenly'}
                        </Badge>
                      </td>
                      <td className="py-2 px-4 text-right">
                        {channel.costPerResult && channel.costPerResult > 0
                          ? formatCurrency(channel.costPerResult)
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollableTable>
          </ContentCard>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-6">
          <ChartContainer
            title="Marketing Spend Timeline"
            description="Forecast vs. Actual spend over time"
            height={500}
            allowDownload={true}
            downloadData={periodData}
            downloadFilename="marketing-spend-timeline.csv"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={periodData}>
                <CartesianGrid strokeDasharray="3 3" stroke={dataColors.grid} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  tickLine={{ stroke: dataColors.grid }}
                  axisLine={{ stroke: dataColors.grid }}
                />
                <YAxis
                  tickFormatter={(value) => formatCurrency(value)}
                  tick={{ fontSize: 11 }}
                  tickLine={{ stroke: dataColors.grid }}
                  axisLine={{ stroke: dataColors.grid }}
                  width={60}
                />
                <Tooltip
                  formatter={(value) => formatCurrency(value as number)}
                  contentStyle={{
                    backgroundColor: dataColors.tooltip.background,
                    borderColor: dataColors.tooltip.border,
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                    padding: '8px 12px',
                  }}
                  labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                />
                <Bar
                  dataKey="totalForecast"
                  name="Forecast"
                  fill={dataColors.forecast}
                  radius={[4, 4, 0, 0]}
                  animationDuration={1200}
                  animationEasing="ease-out"
                  barSize={30}
                />
                <Bar
                  dataKey="totalActual"
                  name="Actual"
                  fill={dataColors.actual}
                  radius={[4, 4, 0, 0]}
                  animationDuration={1200}
                  animationEasing="ease-out"
                  barSize={30}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MarketingAnalysis;
