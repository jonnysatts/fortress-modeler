import React, { useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Scenario } from '@/types/scenarios';
import { FinancialModel } from '@/lib/db';
import useStore from '@/store/useStore';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { TypographyMuted } from '@/components/ui/typography';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

interface ScenarioComparisonProps {
  scenario: Scenario;
  baselineModel: FinancialModel;
}

/**
 * ScenarioComparison Component
 * Displays visual comparison between baseline and scenario
 */
const ScenarioComparison: React.FC<ScenarioComparisonProps> = ({
  scenario,
  baselineModel
}) => {
  const [activeTab, setActiveTab] = React.useState('revenue');
  
  // Get data from store
  const {
    scenarioForecastData,
    baselineForecastData,
    calculateScenarioForecast,
    toggleComparisonMode
  } = useStore(state => ({
    scenarioForecastData: state.scenarioForecastData,
    baselineForecastData: state.baselineForecastData,
    calculateScenarioForecast: state.calculateScenarioForecast,
    toggleComparisonMode: state.toggleComparisonMode
  }));
  
  // Calculate forecast and enable comparison mode when component mounts
  useEffect(() => {
    calculateScenarioForecast();
    toggleComparisonMode(true);
    
    // Disable comparison mode when component unmounts
    return () => {
      toggleComparisonMode(false);
    };
  }, [calculateScenarioForecast, toggleComparisonMode]);
  
  // Prepare data for charts
  const prepareChartData = () => {
    if (!baselineForecastData.length || !scenarioForecastData.length) {
      return [];
    }
    
    return baselineForecastData.map((baselineData, index) => {
      const scenarioData = scenarioForecastData[index] || baselineData;
      
      return {
        name: baselineData.point,
        baselineRevenue: baselineData.revenue,
        scenarioRevenue: scenarioData.revenue,
        baselineCost: baselineData.cost,
        scenarioCost: scenarioData.cost,
        baselineProfit: baselineData.profit,
        scenarioProfit: scenarioData.profit,
        baselineCumulativeRevenue: baselineData.cumulativeRevenue,
        scenarioCumulativeRevenue: scenarioData.cumulativeRevenue,
        baselineCumulativeCost: baselineData.cumulativeCost,
        scenarioCumulativeCost: scenarioData.cumulativeCost,
        baselineCumulativeProfit: baselineData.cumulativeProfit,
        scenarioCumulativeProfit: scenarioData.cumulativeProfit
      };
    });
  };
  
  const chartData = prepareChartData();
  
  // Custom tooltip formatter
  const formatTooltip = (value: number) => {
    return formatCurrency(value);
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Comparison: {scenario.name} vs. Baseline</CardTitle>
          <CardDescription>
            Visual comparison between the scenario and baseline forecast
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="revenue">Revenue</TabsTrigger>
              <TabsTrigger value="costs">Costs</TabsTrigger>
              <TabsTrigger value="profit">Profit</TabsTrigger>
              <TabsTrigger value="cumulative">Cumulative</TabsTrigger>
            </TabsList>
            
            {/* Revenue Tab */}
            <TabsContent value="revenue" className="space-y-6">
              <div className="h-[400px]">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45} 
                        textAnchor="end" 
                        height={70} 
                      />
                      <YAxis tickFormatter={formatTooltip} />
                      <Tooltip formatter={formatTooltip} />
                      <Legend />
                      <Bar 
                        dataKey="baselineRevenue" 
                        name="Baseline Revenue" 
                        fill="#1A2942" 
                        barSize={20} 
                      />
                      <Bar 
                        dataKey="scenarioRevenue" 
                        name="Scenario Revenue" 
                        fill="#10B981" 
                        barSize={20} 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <TypographyMuted>No data available</TypographyMuted>
                  </div>
                )}
              </div>
            </TabsContent>
            
            {/* Costs Tab */}
            <TabsContent value="costs" className="space-y-6">
              <div className="h-[400px]">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45} 
                        textAnchor="end" 
                        height={70} 
                      />
                      <YAxis tickFormatter={formatTooltip} />
                      <Tooltip formatter={formatTooltip} />
                      <Legend />
                      <Bar 
                        dataKey="baselineCost" 
                        name="Baseline Costs" 
                        fill="#1A2942" 
                        barSize={20} 
                      />
                      <Bar 
                        dataKey="scenarioCost" 
                        name="Scenario Costs" 
                        fill="#EF4444" 
                        barSize={20} 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <TypographyMuted>No data available</TypographyMuted>
                  </div>
                )}
              </div>
            </TabsContent>
            
            {/* Profit Tab */}
            <TabsContent value="profit" className="space-y-6">
              <div className="h-[400px]">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45} 
                        textAnchor="end" 
                        height={70} 
                      />
                      <YAxis tickFormatter={formatTooltip} />
                      <Tooltip formatter={formatTooltip} />
                      <Legend />
                      <Bar 
                        dataKey="baselineProfit" 
                        name="Baseline Profit" 
                        fill="#1A2942" 
                        barSize={20} 
                      />
                      <Bar 
                        dataKey="scenarioProfit" 
                        name="Scenario Profit" 
                        fill="#6366F1" 
                        barSize={20} 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <TypographyMuted>No data available</TypographyMuted>
                  </div>
                )}
              </div>
            </TabsContent>
            
            {/* Cumulative Tab */}
            <TabsContent value="cumulative" className="space-y-6">
              <div className="h-[400px]">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45} 
                        textAnchor="end" 
                        height={70} 
                      />
                      <YAxis tickFormatter={formatTooltip} />
                      <Tooltip formatter={formatTooltip} />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="baselineCumulativeRevenue" 
                        name="Baseline Revenue" 
                        stroke="#1A2942" 
                        strokeWidth={2} 
                        dot={{ r: 4 }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="scenarioCumulativeRevenue" 
                        name="Scenario Revenue" 
                        stroke="#10B981" 
                        strokeWidth={2} 
                        dot={{ r: 4 }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="baselineCumulativeCost" 
                        name="Baseline Costs" 
                        stroke="#94A3B8" 
                        strokeWidth={2} 
                        dot={{ r: 4 }} 
                        strokeDasharray="5 5" 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="scenarioCumulativeCost" 
                        name="Scenario Costs" 
                        stroke="#EF4444" 
                        strokeWidth={2} 
                        dot={{ r: 4 }} 
                        strokeDasharray="5 5" 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <TypographyMuted>No data available</TypographyMuted>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {/* Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle>Summary Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-4">Metric</th>
                  <th className="text-right py-2 px-4">Baseline</th>
                  <th className="text-right py-2 px-4">Scenario</th>
                  <th className="text-right py-2 px-4">Difference</th>
                  <th className="text-right py-2 px-4">% Change</th>
                </tr>
              </thead>
              <tbody>
                {chartData.length > 0 && (
                  <>
                    <tr className="border-b">
                      <td className="py-2 px-4 font-medium">Total Revenue</td>
                      <td className="text-right py-2 px-4">
                        {formatCurrency(chartData[chartData.length - 1].baselineCumulativeRevenue)}
                      </td>
                      <td className="text-right py-2 px-4">
                        {formatCurrency(chartData[chartData.length - 1].scenarioCumulativeRevenue)}
                      </td>
                      <td className="text-right py-2 px-4">
                        {formatCurrency(
                          chartData[chartData.length - 1].scenarioCumulativeRevenue - 
                          chartData[chartData.length - 1].baselineCumulativeRevenue
                        )}
                      </td>
                      <td className={`text-right py-2 px-4 ${
                        chartData[chartData.length - 1].scenarioCumulativeRevenue > 
                        chartData[chartData.length - 1].baselineCumulativeRevenue
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}>
                        {(
                          ((chartData[chartData.length - 1].scenarioCumulativeRevenue - 
                            chartData[chartData.length - 1].baselineCumulativeRevenue) / 
                            chartData[chartData.length - 1].baselineCumulativeRevenue) * 100
                        ).toFixed(1)}%
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-4 font-medium">Total Costs</td>
                      <td className="text-right py-2 px-4">
                        {formatCurrency(chartData[chartData.length - 1].baselineCumulativeCost)}
                      </td>
                      <td className="text-right py-2 px-4">
                        {formatCurrency(chartData[chartData.length - 1].scenarioCumulativeCost)}
                      </td>
                      <td className="text-right py-2 px-4">
                        {formatCurrency(
                          chartData[chartData.length - 1].scenarioCumulativeCost - 
                          chartData[chartData.length - 1].baselineCumulativeCost
                        )}
                      </td>
                      <td className={`text-right py-2 px-4 ${
                        chartData[chartData.length - 1].scenarioCumulativeCost < 
                        chartData[chartData.length - 1].baselineCumulativeCost
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}>
                        {(
                          ((chartData[chartData.length - 1].scenarioCumulativeCost - 
                            chartData[chartData.length - 1].baselineCumulativeCost) / 
                            chartData[chartData.length - 1].baselineCumulativeCost) * 100
                        ).toFixed(1)}%
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-4 font-medium">Total Profit</td>
                      <td className="text-right py-2 px-4">
                        {formatCurrency(chartData[chartData.length - 1].baselineCumulativeProfit)}
                      </td>
                      <td className="text-right py-2 px-4">
                        {formatCurrency(chartData[chartData.length - 1].scenarioCumulativeProfit)}
                      </td>
                      <td className="text-right py-2 px-4">
                        {formatCurrency(
                          chartData[chartData.length - 1].scenarioCumulativeProfit - 
                          chartData[chartData.length - 1].baselineCumulativeProfit
                        )}
                      </td>
                      <td className={`text-right py-2 px-4 ${
                        chartData[chartData.length - 1].scenarioCumulativeProfit > 
                        chartData[chartData.length - 1].baselineCumulativeProfit
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}>
                        {chartData[chartData.length - 1].baselineCumulativeProfit !== 0 ? (
                          (
                            ((chartData[chartData.length - 1].scenarioCumulativeProfit - 
                              chartData[chartData.length - 1].baselineCumulativeProfit) / 
                              Math.abs(chartData[chartData.length - 1].baselineCumulativeProfit)) * 100
                          ).toFixed(1) + '%'
                        ) : (
                          'N/A'
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 font-medium">Profit Margin</td>
                      <td className="text-right py-2 px-4">
                        {(
                          (chartData[chartData.length - 1].baselineCumulativeProfit / 
                            chartData[chartData.length - 1].baselineCumulativeRevenue) * 100
                        ).toFixed(1)}%
                      </td>
                      <td className="text-right py-2 px-4">
                        {(
                          (chartData[chartData.length - 1].scenarioCumulativeProfit / 
                            chartData[chartData.length - 1].scenarioCumulativeRevenue) * 100
                        ).toFixed(1)}%
                      </td>
                      <td className="text-right py-2 px-4">
                        {(
                          ((chartData[chartData.length - 1].scenarioCumulativeProfit / 
                            chartData[chartData.length - 1].scenarioCumulativeRevenue) * 100) - 
                          ((chartData[chartData.length - 1].baselineCumulativeProfit / 
                            chartData[chartData.length - 1].baselineCumulativeRevenue) * 100)
                        ).toFixed(1)}%
                      </td>
                      <td className={`text-right py-2 px-4 ${
                        (chartData[chartData.length - 1].scenarioCumulativeProfit / 
                          chartData[chartData.length - 1].scenarioCumulativeRevenue) > 
                        (chartData[chartData.length - 1].baselineCumulativeProfit / 
                          chartData[chartData.length - 1].baselineCumulativeRevenue)
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}>
                        {(
                          (((chartData[chartData.length - 1].scenarioCumulativeProfit / 
                            chartData[chartData.length - 1].scenarioCumulativeRevenue) - 
                            (chartData[chartData.length - 1].baselineCumulativeProfit / 
                            chartData[chartData.length - 1].baselineCumulativeRevenue)) / 
                            (chartData[chartData.length - 1].baselineCumulativeProfit / 
                            chartData[chartData.length - 1].baselineCumulativeRevenue)) * 100
                        ).toFixed(1)}%
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ScenarioComparison;
