import React, { useState } from 'react';
import { FinancialModel } from '@/lib/db';
import { ActualsPeriodEntry } from '@/types/models';
import { 
  calculateProjectScenarioAnalysis, 
  ProjectScenarioAnalysis,
  ModelScenario 
} from '@/lib/project-aggregation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Target,
  Eye,
  PlusCircle 
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { HelpTooltip, helpContent } from '@/components/ui/HelpTooltip';

interface ScenarioOverviewProps {
  project: any;
  models: FinancialModel[];
  actualsData: ActualsPeriodEntry[];
  onCreateModel: () => void;
  onViewModel: (modelId: string) => void;
}

export const ScenarioOverview: React.FC<ScenarioOverviewProps> = ({
  project,
  models,
  actualsData,
  onCreateModel,
  onViewModel,
}) => {
  const scenarioAnalysis = calculateProjectScenarioAnalysis(models, actualsData);
  const [selectedPrimaryId, setSelectedPrimaryId] = useState(scenarioAnalysis.primaryModelId);

  // Recalculate analysis if primary model changes
  const currentAnalysis = React.useMemo(() => {
    if (selectedPrimaryId !== scenarioAnalysis.primaryModelId) {
      // Find the selected primary scenario and update the analysis
      const updatedAnalysis = { ...scenarioAnalysis };
      updatedAnalysis.primaryModelId = selectedPrimaryId;
      
      const primaryScenario = scenarioAnalysis.scenarios.find(s => s.modelId === selectedPrimaryId);
      if (primaryScenario) {
        updatedAnalysis.aggregateMetrics.revenue.primary = primaryScenario.projectedRevenue;
        updatedAnalysis.aggregateMetrics.costs.primary = primaryScenario.projectedCosts;
        updatedAnalysis.aggregateMetrics.profit.primary = primaryScenario.netProfit;
        updatedAnalysis.aggregateMetrics.profitMargin.primary = primaryScenario.profitMargin;
      }
      
      return updatedAnalysis;
    }
    return scenarioAnalysis;
  }, [scenarioAnalysis, selectedPrimaryId]);

  const getVarianceBadgeVariant = (variance: string) => {
    switch (variance) {
      case 'Low': return 'default';
      case 'Medium': return 'secondary';
      case 'High': return 'destructive';
      default: return 'outline';
    }
  };

  const getScenarioLabelColor = (label: string) => {
    switch (label) {
      case 'Conservative': return 'text-red-600';
      case 'Realistic': return 'text-blue-600';
      case 'Optimistic': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Scenario Summary Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-fortress-blue" />
                <span className="font-semibold text-lg">
                  {currentAnalysis.scenarios.length} Scenarios
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {currentAnalysis.scenarios.map((scenario) => (
                  <div key={scenario.modelId} className="flex items-center space-x-1">
                    <Badge 
                      variant="outline" 
                      className={getScenarioLabelColor(scenario.label)}
                    >
                      {scenario.label}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {formatCurrency(scenario.projectedRevenue)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Badge variant={getVarianceBadgeVariant(currentAnalysis.variance)}>
                Risk: {currentAnalysis.variance}
              </Badge>
              <Button onClick={onCreateModel} size="sm" className="bg-fortress-emerald hover:bg-fortress-emerald/90">
                <PlusCircle className="mr-1 h-4 w-4" />
                Add Scenario
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Primary Model Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-fortress-blue" />
              <span className="font-medium">Primary Scenario:</span>
              <Select value={selectedPrimaryId} onValueChange={setSelectedPrimaryId}>
                <SelectTrigger className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currentAnalysis.scenarios.map((scenario) => (
                    <SelectItem key={scenario.modelId} value={scenario.modelId}>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className={getScenarioLabelColor(scenario.label)}>
                          {scenario.label}
                        </Badge>
                        <span>{scenario.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <HelpTooltip 
                content="Choose which scenario to use for detailed charts and analysis. Other scenarios will still be visible in comparisons."
                side="right"
              />
            </div>
            
            <div className="text-sm text-muted-foreground">
              Variance: {currentAnalysis.variancePercent.toFixed(1)}% across scenarios
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scenario KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ScenarioKPICard
          title="Revenue"
          metrics={currentAnalysis.aggregateMetrics.revenue}
          format="currency"
          trend={currentAnalysis.aggregateMetrics.revenue.primary > currentAnalysis.aggregateMetrics.revenue.average ? 'up' : 'down'}
        />
        <ScenarioKPICard
          title="Costs"
          metrics={currentAnalysis.aggregateMetrics.costs}
          format="currency"
          trend={currentAnalysis.aggregateMetrics.costs.primary < currentAnalysis.aggregateMetrics.costs.average ? 'up' : 'down'}
        />
        <ScenarioKPICard
          title="Net Profit"
          metrics={currentAnalysis.aggregateMetrics.profit}
          format="currency"
          trend={currentAnalysis.aggregateMetrics.profit.primary > 0 ? 'up' : 'down'}
        />
        <ScenarioKPICard
          title="Profit Margin"
          metrics={currentAnalysis.aggregateMetrics.profitMargin}
          format="percentage"
          trend={currentAnalysis.aggregateMetrics.profitMargin.primary > 15 ? 'up' : 'down'}
        />
      </div>

      {/* Risk Factors & Key Differences */}
      {(currentAnalysis.riskFactors.length > 0 || currentAnalysis.keyDifferences.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {currentAnalysis.riskFactors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-orange-600">
                  <AlertTriangle className="mr-2 h-5 w-5" />
                  Risk Factors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {currentAnalysis.riskFactors.map((risk, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
                      <span className="text-sm">{risk}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          
          {currentAnalysis.keyDifferences.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="mr-2 h-5 w-5" />
                  Key Differences
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {currentAnalysis.keyDifferences.map((difference, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                      <span className="text-sm">{difference}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Detailed Analysis Tabs */}
      <Tabs defaultValue="scenarios" className="space-y-4">
        <TabsList>
          <TabsTrigger value="scenarios">All Scenarios</TabsTrigger>
          <TabsTrigger value="primary">Primary Analysis</TabsTrigger>
          <TabsTrigger value="comparison">Comparison</TabsTrigger>
        </TabsList>

        <TabsContent value="scenarios" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Scenario Overview</CardTitle>
              <CardDescription>
                Compare all scenarios at a glance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentAnalysis.scenarios.map((scenario) => (
                  <ScenarioCard
                    key={scenario.modelId}
                    scenario={scenario}
                    isPrimary={scenario.modelId === selectedPrimaryId}
                    onView={() => onViewModel(scenario.modelId)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="primary" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Primary Scenario Analysis</CardTitle>
              <CardDescription>
                Detailed analysis of your selected primary scenario
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  Detailed charts and projections for the primary scenario will be displayed here.
                </p>
                <Button onClick={() => onViewModel(selectedPrimaryId)} variant="outline">
                  <Eye className="mr-2 h-4 w-4" />
                  View Primary Model Details
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-4">
          <ScenarioComparisonTable scenarios={currentAnalysis.scenarios} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Helper Components

interface ScenarioKPICardProps {
  title: string;
  metrics: { min: number; max: number; average: number; primary: number };
  format: 'currency' | 'percentage';
  trend: 'up' | 'down';
}

const ScenarioKPICard: React.FC<ScenarioKPICardProps> = ({ title, metrics, format, trend }) => {
  const formatValue = (value: number) => {
    return format === 'currency' ? formatCurrency(value) : `${value.toFixed(1)}%`;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-bold">{formatValue(metrics.primary)}</span>
            {trend === 'up' ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            Range: {formatValue(metrics.min)} - {formatValue(metrics.max)}
          </div>
          <div className="text-xs text-muted-foreground">
            Average: {formatValue(metrics.average)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface ScenarioCardProps {
  scenario: ModelScenario;
  isPrimary: boolean;
  onView: () => void;
}

const ScenarioCard: React.FC<ScenarioCardProps> = ({ scenario, isPrimary, onView }) => {
  return (
    <Card className={`transition-colors ${isPrimary ? 'border-fortress-blue bg-blue-50/50' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className={`text-xs ${
            scenario.label === 'Conservative' ? 'text-red-600' :
            scenario.label === 'Realistic' ? 'text-blue-600' :
            scenario.label === 'Optimistic' ? 'text-green-600' : 'text-gray-600'
          }`}>
            {scenario.label}
          </Badge>
          {isPrimary && (
            <Badge variant="default" className="text-xs">Primary</Badge>
          )}
        </div>
        <CardTitle className="text-sm">{scenario.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Revenue:</span>
            <span className="font-medium">{formatCurrency(scenario.projectedRevenue)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Profit:</span>
            <span className={`font-medium ${scenario.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(scenario.netProfit)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Margin:</span>
            <span className="font-medium">{scenario.profitMargin.toFixed(1)}%</span>
          </div>
        </div>
        <Button onClick={onView} variant="outline" size="sm" className="w-full mt-3">
          <Eye className="mr-2 h-3 w-3" />
          View Details
        </Button>
      </CardContent>
    </Card>
  );
};

// Scenario Comparison Table Component
interface ScenarioComparisonTableProps {
  scenarios: ModelScenario[];
}

const ScenarioComparisonTable: React.FC<ScenarioComparisonTableProps> = ({ scenarios }) => {
  if (scenarios.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">No scenarios to compare.</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate percentage differences from the average
  const avgRevenue = scenarios.reduce((sum, s) => sum + s.projectedRevenue, 0) / scenarios.length;
  const avgCosts = scenarios.reduce((sum, s) => sum + s.projectedCosts, 0) / scenarios.length;
  const avgProfit = scenarios.reduce((sum, s) => sum + s.netProfit, 0) / scenarios.length;

  const getPercentDiff = (value: number, avg: number) => {
    if (avg === 0) return 0;
    return ((value - avg) / avg) * 100;
  };

  const getMetricColor = (value: number, isPositive: boolean = true) => {
    if (isPositive) {
      return value > 0 ? 'text-green-600' : value < 0 ? 'text-red-600' : '';
    } else {
      return value < 0 ? 'text-green-600' : value > 0 ? 'text-red-600' : '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <BarChart3 className="mr-2 h-5 w-5" />
          Scenario Comparison Analysis
        </CardTitle>
        <CardDescription>
          Detailed comparison of all scenarios with variance from average
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">Metric</th>
                {scenarios.map((scenario) => (
                  <th key={scenario.modelId} className="text-center py-3 px-4 min-w-[150px]">
                    <div className="space-y-1">
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getScenarioLabelColor(scenario.label)}`}
                      >
                        {scenario.label}
                      </Badge>
                      <div className="text-sm font-medium">{scenario.name}</div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Revenue Row */}
              <tr className="border-b hover:bg-muted/50">
                <td className="py-3 px-4 font-medium">Projected Revenue</td>
                {scenarios.map((scenario) => {
                  const diff = getPercentDiff(scenario.projectedRevenue, avgRevenue);
                  return (
                    <td key={scenario.modelId} className="text-center py-3 px-4">
                      <div className="space-y-1">
                        <div className="font-medium">{formatCurrency(scenario.projectedRevenue)}</div>
                        <div className={`text-xs ${getMetricColor(diff)}`}>
                          {diff > 0 ? '+' : ''}{diff.toFixed(1)}% vs avg
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>

              {/* Costs Row */}
              <tr className="border-b hover:bg-muted/50">
                <td className="py-3 px-4 font-medium">Projected Costs</td>
                {scenarios.map((scenario) => {
                  const diff = getPercentDiff(scenario.projectedCosts, avgCosts);
                  return (
                    <td key={scenario.modelId} className="text-center py-3 px-4">
                      <div className="space-y-1">
                        <div className="font-medium">{formatCurrency(scenario.projectedCosts)}</div>
                        <div className={`text-xs ${getMetricColor(diff, false)}`}>
                          {diff > 0 ? '+' : ''}{diff.toFixed(1)}% vs avg
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>

              {/* Net Profit Row */}
              <tr className="border-b hover:bg-muted/50">
                <td className="py-3 px-4 font-medium">Net Profit</td>
                {scenarios.map((scenario) => {
                  const diff = getPercentDiff(scenario.netProfit, avgProfit);
                  return (
                    <td key={scenario.modelId} className="text-center py-3 px-4">
                      <div className="space-y-1">
                        <div className={`font-medium ${scenario.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(scenario.netProfit)}
                        </div>
                        <div className={`text-xs ${getMetricColor(diff)}`}>
                          {diff > 0 ? '+' : ''}{diff.toFixed(1)}% vs avg
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>

              {/* Profit Margin Row */}
              <tr className="border-b hover:bg-muted/50">
                <td className="py-3 px-4 font-medium">Profit Margin</td>
                {scenarios.map((scenario) => (
                  <td key={scenario.modelId} className="text-center py-3 px-4">
                    <div className={`font-medium ${
                      scenario.profitMargin > 20 ? 'text-green-600' : 
                      scenario.profitMargin > 10 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {scenario.profitMargin.toFixed(1)}%
                    </div>
                  </td>
                ))}
              </tr>

              {/* Assumptions Section */}
              <tr className="bg-muted/30">
                <td colSpan={scenarios.length + 1} className="py-2 px-4 font-semibold text-sm">
                  Key Assumptions
                </td>
              </tr>

              {/* Revenue Streams */}
              <tr className="border-b hover:bg-muted/50">
                <td className="py-3 px-4 font-medium">Revenue Streams</td>
                {scenarios.map((scenario) => (
                  <td key={scenario.modelId} className="text-center py-3 px-4">
                    {scenario.assumptions.revenueStreams}
                  </td>
                ))}
              </tr>

              {/* Cost Categories */}
              <tr className="border-b hover:bg-muted/50">
                <td className="py-3 px-4 font-medium">Cost Categories</td>
                {scenarios.map((scenario) => (
                  <td key={scenario.modelId} className="text-center py-3 px-4">
                    {scenario.assumptions.costCategories}
                  </td>
                ))}
              </tr>

              {/* Growth Rate */}
              <tr className="border-b hover:bg-muted/50">
                <td className="py-3 px-4 font-medium">Growth Rate</td>
                {scenarios.map((scenario) => (
                  <td key={scenario.modelId} className="text-center py-3 px-4">
                    {(scenario.assumptions.growthRate * 100).toFixed(1)}%
                  </td>
                ))}
              </tr>

              {/* Marketing Budget */}
              <tr className="border-b hover:bg-muted/50">
                <td className="py-3 px-4 font-medium">Marketing Budget</td>
                {scenarios.map((scenario) => (
                  <td key={scenario.modelId} className="text-center py-3 px-4">
                    {formatCurrency(scenario.assumptions.marketingBudget)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Summary Insights */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-semibold text-sm mb-2">Key Insights</h4>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>• Revenue range: {formatCurrency(Math.min(...scenarios.map(s => s.projectedRevenue)))} to {formatCurrency(Math.max(...scenarios.map(s => s.projectedRevenue)))}</p>
            <p>• Profit range: {formatCurrency(Math.min(...scenarios.map(s => s.netProfit)))} to {formatCurrency(Math.max(...scenarios.map(s => s.netProfit)))}</p>
            <p>• Average profit margin: {(scenarios.reduce((sum, s) => sum + s.profitMargin, 0) / scenarios.length).toFixed(1)}%</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Helper function - needs to be accessible to multiple components
const getScenarioLabelColor = (label: string) => {
  switch (label) {
    case 'Conservative': return 'text-red-600 border-red-600';
    case 'Realistic': return 'text-blue-600 border-blue-600';
    case 'Optimistic': return 'text-green-600 border-green-600';
    default: return 'text-gray-600 border-gray-600';
  }
};