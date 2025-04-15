/**
 * Scenario Comparison Component
 * 
 * This component provides a detailed comparison between baseline and scenario.
 */

import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Scenario } from '../types/scenarioTypes';
import { FinancialModel } from '@/lib/db';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useScenarioCalculation } from '../hooks';

interface ScenarioComparisonProps {
  scenario: Scenario;
  baselineModel: FinancialModel;
  baselineForecastData: any[];
  scenarioForecastData: any[];
}

const ScenarioComparison: React.FC<ScenarioComparisonProps> = ({
  scenario,
  baselineModel,
  baselineForecastData,
  scenarioForecastData
}) => {
  // Use the scenario calculation hook
  const { summaryMetrics, comparisonMetrics, chartData } = useScenarioCalculation({
    baselineData: baselineForecastData,
    scenarioData: scenarioForecastData
  });

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-md shadow-md">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Helper function to determine the color class based on the value
  const getColorClass = (value: number, isPositive: boolean = true) => {
    if (Math.abs(value) < 0.01) return 'text-gray-500';
    return isPositive 
      ? (value > 0 ? 'text-green-600' : 'text-red-600')
      : (value > 0 ? 'text-red-600' : 'text-green-600');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Scenario Comparison: {scenario.name}</CardTitle>
          <CardDescription>
            Comparing baseline model with scenario adjustments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="revenue">
            <TabsList className="mb-4">
              <TabsTrigger value="revenue">Revenue</TabsTrigger>
              <TabsTrigger value="profit">Profit</TabsTrigger>
              <TabsTrigger value="costs">Costs</TabsTrigger>
              <TabsTrigger value="summary">Summary</TabsTrigger>
            </TabsList>
            
            <TabsContent value="revenue">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => formatCurrency(value)} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="baselineRevenue" name="Baseline Revenue" fill="#8884d8" />
                    <Bar dataKey="scenarioRevenue" name="Scenario Revenue" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted/50 rounded-md">
                  <div className="text-sm font-medium mb-2">Revenue Impact</div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Baseline Revenue:</span>
                      <span className="text-sm">{formatCurrency(baselineForecastData[baselineForecastData.length - 1]?.cumulativeRevenue || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Scenario Revenue:</span>
                      <span className="text-sm">{formatCurrency(scenarioForecastData[scenarioForecastData.length - 1]?.cumulativeRevenue || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Difference:</span>
                      <span className={`text-sm ${getColorClass(comparisonMetrics.revenueDelta)}`}>
                        {formatCurrency(comparisonMetrics.revenueDelta)}
                        {' '}
                        ({comparisonMetrics.revenueDeltaPercent > 0 ? '+' : ''}
                        {formatPercent(comparisonMetrics.revenueDeltaPercent / 100)})
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-muted/50 rounded-md">
                  <div className="text-sm font-medium mb-2">Parameter Changes</div>
                  <div className="space-y-2">
                    {scenario.parameterDeltas.pricingPercent !== 0 && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Pricing:</span>
                        <span className="text-sm">
                          {scenario.parameterDeltas.pricingPercent > 0 ? '+' : ''}
                          {scenario.parameterDeltas.pricingPercent}%
                        </span>
                      </div>
                    )}
                    {scenario.parameterDeltas.attendanceGrowthPercent !== 0 && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Attendance Growth:</span>
                        <span className="text-sm">
                          {scenario.parameterDeltas.attendanceGrowthPercent > 0 ? '+' : ''}
                          {scenario.parameterDeltas.attendanceGrowthPercent} points
                        </span>
                      </div>
                    )}
                    {scenario.parameterDeltas.marketingSpendPercent !== 0 && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Marketing Budget:</span>
                        <span className="text-sm">
                          {scenario.parameterDeltas.marketingSpendPercent > 0 ? '+' : ''}
                          {scenario.parameterDeltas.marketingSpendPercent}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="profit">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => formatCurrency(value)} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="baselineProfit" name="Baseline Profit" fill="#ffc658" />
                    <Bar dataKey="scenarioProfit" name="Scenario Profit" fill="#ff8042" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted/50 rounded-md">
                  <div className="text-sm font-medium mb-2">Profit Impact</div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Baseline Profit:</span>
                      <span className="text-sm">{formatCurrency(baselineForecastData[baselineForecastData.length - 1]?.cumulativeProfit || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Scenario Profit:</span>
                      <span className="text-sm">{formatCurrency(scenarioForecastData[scenarioForecastData.length - 1]?.cumulativeProfit || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Difference:</span>
                      <span className={`text-sm ${getColorClass(comparisonMetrics.profitDelta)}`}>
                        {formatCurrency(comparisonMetrics.profitDelta)}
                        {' '}
                        ({comparisonMetrics.profitDeltaPercent > 0 ? '+' : ''}
                        {formatPercent(comparisonMetrics.profitDeltaPercent / 100)})
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-muted/50 rounded-md">
                  <div className="text-sm font-medium mb-2">Margin Impact</div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Baseline Profit Margin:</span>
                      <span className="text-sm">{formatPercent(summaryMetrics.profitMargin / 100)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Scenario Profit Margin:</span>
                      <span className="text-sm">{formatPercent((summaryMetrics.profitMargin + comparisonMetrics.marginDelta) / 100)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Difference:</span>
                      <span className={`text-sm ${getColorClass(comparisonMetrics.marginDelta)}`}>
                        {comparisonMetrics.marginDelta > 0 ? '+' : ''}
                        {comparisonMetrics.marginDelta.toFixed(1)} points
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="costs">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => formatCurrency(value)} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="baselineCost" name="Baseline Costs" fill="#8884d8" />
                    <Bar dataKey="scenarioCost" name="Scenario Costs" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted/50 rounded-md">
                  <div className="text-sm font-medium mb-2">Cost Impact</div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Baseline Costs:</span>
                      <span className="text-sm">{formatCurrency(baselineForecastData[baselineForecastData.length - 1]?.cumulativeCost || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Scenario Costs:</span>
                      <span className="text-sm">{formatCurrency(scenarioForecastData[scenarioForecastData.length - 1]?.cumulativeCost || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Difference:</span>
                      <span className={`text-sm ${getColorClass(comparisonMetrics.costsDelta, false)}`}>
                        {formatCurrency(comparisonMetrics.costsDelta)}
                        {' '}
                        ({comparisonMetrics.costsDeltaPercent > 0 ? '+' : ''}
                        {formatPercent(comparisonMetrics.costsDeltaPercent / 100)})
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-muted/50 rounded-md">
                  <div className="text-sm font-medium mb-2">Parameter Changes</div>
                  <div className="space-y-2">
                    {scenario.parameterDeltas.cogsMultiplier !== 0 && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">COGS Multiplier:</span>
                        <span className="text-sm">
                          {scenario.parameterDeltas.cogsMultiplier > 0 ? '+' : ''}
                          {scenario.parameterDeltas.cogsMultiplier}%
                        </span>
                      </div>
                    )}
                    {scenario.parameterDeltas.marketingSpendPercent !== 0 && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Marketing Budget:</span>
                        <span className="text-sm">
                          {scenario.parameterDeltas.marketingSpendPercent > 0 ? '+' : ''}
                          {scenario.parameterDeltas.marketingSpendPercent}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="summary">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="font-medium">Scenario Parameters</div>
                  <div className="space-y-2">
                    <div className="flex justify-between p-2 bg-muted/30 rounded">
                      <span className="text-sm">Marketing Budget:</span>
                      <span className="text-sm font-medium">
                        {scenario.parameterDeltas.marketingSpendPercent > 0 ? '+' : ''}
                        {scenario.parameterDeltas.marketingSpendPercent}%
                      </span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted/30 rounded">
                      <span className="text-sm">Pricing:</span>
                      <span className="text-sm font-medium">
                        {scenario.parameterDeltas.pricingPercent > 0 ? '+' : ''}
                        {scenario.parameterDeltas.pricingPercent}%
                      </span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted/30 rounded">
                      <span className="text-sm">Attendance Growth:</span>
                      <span className="text-sm font-medium">
                        {scenario.parameterDeltas.attendanceGrowthPercent > 0 ? '+' : ''}
                        {scenario.parameterDeltas.attendanceGrowthPercent} points
                      </span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted/30 rounded">
                      <span className="text-sm">COGS Multiplier:</span>
                      <span className="text-sm font-medium">
                        {scenario.parameterDeltas.cogsMultiplier > 0 ? '+' : ''}
                        {scenario.parameterDeltas.cogsMultiplier}%
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="font-medium">Financial Impact</div>
                  <div className="space-y-2">
                    <div className="flex justify-between p-2 bg-muted/30 rounded">
                      <span className="text-sm">Revenue:</span>
                      <span className={`text-sm font-medium ${getColorClass(comparisonMetrics.revenueDelta)}`}>
                        {formatCurrency(comparisonMetrics.revenueDelta)}
                        {' '}
                        ({comparisonMetrics.revenueDeltaPercent > 0 ? '+' : ''}
                        {formatPercent(comparisonMetrics.revenueDeltaPercent / 100)})
                      </span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted/30 rounded">
                      <span className="text-sm">Costs:</span>
                      <span className={`text-sm font-medium ${getColorClass(comparisonMetrics.costsDelta, false)}`}>
                        {formatCurrency(comparisonMetrics.costsDelta)}
                        {' '}
                        ({comparisonMetrics.costsDeltaPercent > 0 ? '+' : ''}
                        {formatPercent(comparisonMetrics.costsDeltaPercent / 100)})
                      </span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted/30 rounded">
                      <span className="text-sm">Profit:</span>
                      <span className={`text-sm font-medium ${getColorClass(comparisonMetrics.profitDelta)}`}>
                        {formatCurrency(comparisonMetrics.profitDelta)}
                        {' '}
                        ({comparisonMetrics.profitDeltaPercent > 0 ? '+' : ''}
                        {formatPercent(comparisonMetrics.profitDeltaPercent / 100)})
                      </span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted/30 rounded">
                      <span className="text-sm">Profit Margin:</span>
                      <span className={`text-sm font-medium ${getColorClass(comparisonMetrics.marginDelta)}`}>
                        {comparisonMetrics.marginDelta > 0 ? '+' : ''}
                        {comparisonMetrics.marginDelta.toFixed(1)} points
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ScenarioComparison;
