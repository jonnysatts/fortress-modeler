import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Scenario, ScenarioParameterDeltas } from '@/types/scenarios';
import { FinancialModel } from '@/lib/db';
import useStore from '@/store/useStore';
import { ForecastPeriodData } from '@/lib/financialCalculations';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { TypographyH4, TypographyMuted } from '@/components/ui/typography';
import { toast } from '@/components/ui/use-toast';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  RefreshCcw,
  Save,
  Undo2
} from 'lucide-react';
import ScenarioSummaryMetrics from './ScenarioSummaryMetrics';
import { calculateRelatedChanges, parameterRelationships } from '@/lib/scenarioRelationships';
import ParameterSuggestions from './ParameterSuggestions';
import ScenarioControls from './ScenarioControls';

interface ScenarioEditorProps {
  scenario: Scenario;
  baselineModel: FinancialModel;
}

/**
 * ScenarioEditor Component
 * Allows editing of scenario parameters and shows real-time impact
 */
const ScenarioEditor: React.FC<ScenarioEditorProps> = ({
  scenario,
  baselineModel
}) => {
  const [activeTab, setActiveTab] = useState('marketing');
  const [localDeltas, setLocalDeltas] = useState<ScenarioParameterDeltas>({
    marketingSpendPercent: 0,
    marketingSpendByChannel: {},
    pricingPercent: 0,
    attendanceGrowthPercent: 0,
    cogsMultiplier: 0
  });
  const [isDirty, setIsDirty] = useState(false);
  const [suggestedChanges, setSuggestedChanges] = useState<Partial<ScenarioParameterDeltas>>({});
  const [lastChangedParam, setLastChangedParam] = useState<keyof ScenarioParameterDeltas | null>(null);

  // Get data and actions from store
  const {
    updateScenario,
    updateScenarioDeltas,
    resetScenarioDeltas,
    calculateScenarioForecast,
    scenarioForecastData,
    baselineForecastData,
    lastUpdated
  } = useStore(state => ({
    updateScenario: state.updateScenario,
    updateScenarioDeltas: state.updateScenarioDeltas,
    resetScenarioDeltas: state.resetScenarioDeltas,
    calculateScenarioForecast: state.calculateScenarioForecast,
    scenarioForecastData: state.scenarioForecastData,
    baselineForecastData: state.baselineForecastData,
    lastUpdated: state.lastUpdated
  }));

  // Initialize local deltas from scenario
  useEffect(() => {
    if (scenario) {
      setLocalDeltas(scenario.parameterDeltas);
      setIsDirty(false);
    }
  }, [scenario]);

  // Log changes to localDeltas
  useEffect(() => {
    console.log('Local deltas changed:', localDeltas);
    // Force recalculation when local deltas change
    calculateScenarioForecast();
  }, [localDeltas, calculateScenarioForecast]);

  // Calculate forecast when component mounts
  useEffect(() => {
    calculateScenarioForecast();
  }, [calculateScenarioForecast]);

  // Apply a parameter change directly without suggestions
  const applyParameterChange = (
    paramName: keyof ScenarioParameterDeltas,
    value: number
  ) => {
    // Update local state
    setLocalDeltas(prev => ({
      ...prev,
      [paramName]: value
    }));

    // Mark as dirty
    setIsDirty(true);

    // Update store (for real-time preview)
    const deltaUpdate: Partial<ScenarioParameterDeltas> = { [paramName]: value };
    console.log(`Directly applying parameter ${paramName} to ${value}`);
    updateScenarioDeltas(deltaUpdate);

    // Force immediate recalculation
    calculateScenarioForecast();
  };

  // Handle parameter change with suggestions
  const handleParameterChange = (
    paramName: keyof ScenarioParameterDeltas,
    value: number
  ) => {
    // First apply the parameter change directly
    applyParameterChange(paramName, value);

    // Then calculate related parameter changes for suggestions
    const related = calculateRelatedChanges(paramName, value, localDeltas);

    if (Object.keys(related).length > 0) {
      setSuggestedChanges(related);
      setLastChangedParam(paramName);
    } else {
      setSuggestedChanges({});
      setLastChangedParam(null);
    }
  };

  // Handle channel-specific marketing spend change
  const handleChannelSpendChange = (channelId: string, value: number) => {
    console.log(`Updating marketing channel ${channelId} to ${value}`);

    // Update local state
    const updatedChannels = {
      ...localDeltas.marketingSpendByChannel,
      [channelId]: value
    };

    // Create a proper delta update
    const deltaUpdate: Partial<ScenarioParameterDeltas> = {
      marketingSpendByChannel: updatedChannels
    };

    // Update local state
    setLocalDeltas(prev => ({
      ...prev,
      marketingSpendByChannel: updatedChannels
    }));

    // Mark as dirty
    setIsDirty(true);

    // Update store and force recalculation
    updateScenarioDeltas(deltaUpdate);
    calculateScenarioForecast();

    // Force another recalculation after a short delay
    setTimeout(() => {
      console.log('Forcing additional recalculation after channel update');
      calculateScenarioForecast();
    }, 50);
  };

  // Handle save
  const handleSave = async () => {
    try {
      console.log('Saving scenario with deltas:', localDeltas);

      // Update scenario with new deltas
      await updateScenario({
        ...scenario,
        parameterDeltas: localDeltas
      });

      // Force recalculation
      calculateScenarioForecast();

      // Mark as clean
      setIsDirty(false);

      // Show success message
      toast({
        title: 'Success',
        description: 'Scenario changes saved successfully',
      });
    } catch (error) {
      console.error('Error saving scenario:', error);

      // Show error message
      toast({
        title: 'Error',
        description: 'Failed to save scenario changes',
        variant: 'destructive',
      });
    }
  };

  // Handle reset
  const handleReset = () => {
    try {
      console.log('Resetting scenario deltas');

      // Reset deltas in the store
      resetScenarioDeltas();

      // Reset local state
      const resetDeltas = {
        marketingSpendPercent: 0,
        marketingSpendByChannel: {},
        pricingPercent: 0,
        attendanceGrowthPercent: 0,
        cogsMultiplier: 0
      };

      setLocalDeltas(resetDeltas);
      setIsDirty(false);
      setSuggestedChanges({});
      setLastChangedParam(null);

      // Force recalculation
      calculateScenarioForecast();

      // Force another recalculation after a short delay
      setTimeout(() => {
        console.log('Forcing additional recalculation after reset');
        calculateScenarioForecast();
      }, 50);

      // Show success message
      toast({
        title: 'Reset Complete',
        description: 'Scenario parameters have been reset to baseline values',
      });
    } catch (error) {
      console.error('Error resetting scenario:', error);

      // Show error message
      toast({
        title: 'Error',
        description: 'Failed to reset scenario parameters',
        variant: 'destructive',
      });
    }
  };

  // Handle accepting suggested changes
  const handleAcceptSuggestions = (changes: Partial<ScenarioParameterDeltas>) => {
    console.log('Accepting suggested changes:', changes);

    // Apply each change individually to ensure they're all processed
    Object.entries(changes).forEach(([param, value]) => {
      if (typeof value === 'number') {
        console.log(`Applying suggested change: ${param} = ${value}`);
        applyParameterChange(param as keyof ScenarioParameterDeltas, value);
      }
    });

    // Clear suggestions
    setSuggestedChanges({});
    setLastChangedParam(null);

    // Force another recalculation after a short delay
    setTimeout(() => {
      console.log('Forcing additional recalculation after accept');
      calculateScenarioForecast();
    }, 50);
  };

  // Handle dismissing suggested changes
  const handleDismissSuggestions = () => {
    try {
      // Store the last changed parameter before clearing suggestions
      const param = lastChangedParam;
      const value = param ? localDeltas[param] : null;

      console.log('Dismissing suggestions, keeping original change:', { param, value });

      // Clear suggestions
      setSuggestedChanges({});
      setLastChangedParam(null);

      // Re-apply the original parameter change to ensure it's reflected
      if (param && value !== null) {
        console.log(`Re-applying original parameter ${param} with value ${value}`);

        // Create a proper delta update
        const deltaUpdate: Partial<ScenarioParameterDeltas> = { [param]: value as number };

        // Update store directly
        updateScenarioDeltas(deltaUpdate);

        // Force immediate recalculation
        calculateScenarioForecast();

        // Force another recalculation after a short delay
        setTimeout(() => {
          console.log('Forcing additional recalculation after dismiss');
          calculateScenarioForecast();
        }, 100);

        // Force a third recalculation after a longer delay
        setTimeout(() => {
          console.log('Forcing final recalculation after dismiss');
          calculateScenarioForecast();
        }, 300);
      }
    } catch (error) {
      console.error('Error dismissing suggestions:', error);
    }
  };

  // Extract marketing channels from baseline model
  const marketingChannels = baselineModel.assumptions.marketing?.channels || [];

  // Calculate summary metrics
  const calculateSummaryMetrics = (data: ForecastPeriodData[]) => {
    if (!data || data.length === 0) return null;

    const totalRevenue = data[data.length - 1].cumulativeRevenue;
    const totalCosts = data[data.length - 1].cumulativeCost;
    const totalProfit = totalRevenue - totalCosts;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    // Find breakeven point
    let breakEvenPeriod = { index: null as number | null, label: 'Not reached' };
    for (let i = 0; i < data.length; i++) {
      if (data[i].cumulativeRevenue >= data[i].cumulativeCost) {
        breakEvenPeriod = { index: i + 1, label: data[i].point };
        break;
      }
    }

    // Calculate averages
    const averageWeeklyRevenue = totalRevenue / data.length;
    const averageWeeklyCosts = totalCosts / data.length;
    const averageWeeklyProfit = totalProfit / data.length;

    return {
      totalRevenue,
      totalCosts,
      totalProfit,
      profitMargin,
      breakEvenPeriod,
      averageWeeklyRevenue,
      averageWeeklyCosts,
      averageWeeklyProfit
    };
  };

  // Calculate metrics
  const [baselineMetrics, setBaselineMetrics] = useState<any>(null);
  const [scenarioMetrics, setScenarioMetrics] = useState<any>(null);

  // Recalculate metrics when forecast data changes
  useEffect(() => {
    if (baselineForecastData && baselineForecastData.length > 0) {
      setBaselineMetrics(calculateSummaryMetrics(baselineForecastData));
    }

    if (scenarioForecastData && scenarioForecastData.length > 0) {
      setScenarioMetrics(calculateSummaryMetrics(scenarioForecastData));
    }

    console.log('Metrics recalculated:', {
      baselineData: baselineForecastData?.length,
      scenarioData: scenarioForecastData?.length,
      lastUpdated,
      marketingSpend: localDeltas.marketingSpendPercent
    });
  }, [baselineForecastData, scenarioForecastData, lastUpdated, localDeltas]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>{scenario.name}</CardTitle>
              <CardDescription>
                {scenario.description || 'No description provided'}
              </CardDescription>
            </div>
            <ScenarioControls
              scenario={scenario}
              localDeltas={localDeltas}
              isDirty={isDirty}
              onReset={handleReset}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Parameter Controls */}
            <div>
              {/* Show parameter suggestions if available */}
              {Object.keys(suggestedChanges).length > 0 && lastChangedParam && (
                <ParameterSuggestions
                  sourceParam={lastChangedParam}
                  sourceValue={localDeltas[lastChangedParam] as number}
                  suggestedChanges={suggestedChanges}
                  relationships={parameterRelationships[lastChangedParam] || []}
                  onAccept={handleAcceptSuggestions}
                  onDismiss={handleDismissSuggestions}
                />
              )}

              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="marketing">Marketing</TabsTrigger>
                  <TabsTrigger value="pricing">Pricing</TabsTrigger>
                  <TabsTrigger value="attendance">Attendance</TabsTrigger>
                  <TabsTrigger value="costs">Costs</TabsTrigger>
                </TabsList>

                {/* Marketing Tab */}
                <TabsContent value="marketing" className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-base">
                        Overall Marketing Budget {localDeltas.marketingSpendPercent > 0 ? '+' : ''}{localDeltas.marketingSpendPercent}%
                      </Label>
                      <div className="flex items-center space-x-4">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleParameterChange('marketingSpendPercent', Math.max(-100, localDeltas.marketingSpendPercent - 5))}
                        >
                          <ArrowDownIcon className="h-4 w-4" />
                        </Button>
                        <Slider
                          value={[localDeltas.marketingSpendPercent]}
                          min={-100}
                          max={100}
                          step={1}
                          onValueChange={(value) => handleParameterChange('marketingSpendPercent', value[0])}
                          className="flex-1"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleParameterChange('marketingSpendPercent', Math.min(100, localDeltas.marketingSpendPercent + 5))}
                        >
                          <ArrowUpIcon className="h-4 w-4" />
                        </Button>
                        <Input
                          type="number"
                          value={localDeltas.marketingSpendPercent}
                          onChange={(e) => handleParameterChange('marketingSpendPercent', Number(e.target.value))}
                          className="w-20"
                          min={-100}
                          max={100}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Adjust the overall marketing budget across all channels
                      </p>
                    </div>

                    {marketingChannels.length > 0 && (
                      <div className="mt-6">
                        <Label className="text-base mb-2 block">Channel-Specific Adjustments</Label>
                        {marketingChannels.map((channel) => {
                          const channelDelta = localDeltas.marketingSpendByChannel[channel.id] || 0;
                          return (
                            <div key={channel.id} className="mb-4">
                              <Label className="text-sm">
                                {channel.name} {channelDelta > 0 ? '+' : ''}{channelDelta}%
                              </Label>
                              <div className="flex items-center space-x-4">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleChannelSpendChange(channel.id, Math.max(-100, channelDelta - 5))}
                                >
                                  <ArrowDownIcon className="h-4 w-4" />
                                </Button>
                                <Slider
                                  value={[channelDelta]}
                                  min={-100}
                                  max={100}
                                  step={1}
                                  onValueChange={(value) => handleChannelSpendChange(channel.id, value[0])}
                                  className="flex-1"
                                />
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleChannelSpendChange(channel.id, Math.min(100, channelDelta + 5))}
                                >
                                  <ArrowUpIcon className="h-4 w-4" />
                                </Button>
                                <Input
                                  type="number"
                                  value={channelDelta}
                                  onChange={(e) => handleChannelSpendChange(channel.id, Number(e.target.value))}
                                  className="w-20"
                                  min={-100}
                                  max={100}
                                />
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                Base budget: {formatCurrency(channel.weeklyBudget)}/week
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Pricing Tab */}
                <TabsContent value="pricing" className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-base">
                        Average Ticket Price {localDeltas.pricingPercent > 0 ? '+' : ''}{localDeltas.pricingPercent}%
                      </Label>
                      <div className="flex items-center space-x-4">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleParameterChange('pricingPercent', Math.max(-50, localDeltas.pricingPercent - 5))}
                        >
                          <ArrowDownIcon className="h-4 w-4" />
                        </Button>
                        <Slider
                          value={[localDeltas.pricingPercent]}
                          min={-50}
                          max={100}
                          step={1}
                          onValueChange={(value) => handleParameterChange('pricingPercent', value[0])}
                          className="flex-1"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleParameterChange('pricingPercent', Math.min(100, localDeltas.pricingPercent + 5))}
                        >
                          <ArrowUpIcon className="h-4 w-4" />
                        </Button>
                        <Input
                          type="number"
                          value={localDeltas.pricingPercent}
                          onChange={(e) => handleParameterChange('pricingPercent', Number(e.target.value))}
                          className="w-20"
                          min={-50}
                          max={100}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Adjust the average ticket price for the product
                      </p>
                    </div>
                  </div>
                </TabsContent>

                {/* Attendance Tab */}
                <TabsContent value="attendance" className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-base">
                        Attendance Growth Rate {localDeltas.attendanceGrowthPercent > 0 ? '+' : ''}{localDeltas.attendanceGrowthPercent}%
                      </Label>
                      <div className="flex items-center space-x-4">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleParameterChange('attendanceGrowthPercent', Math.max(-20, localDeltas.attendanceGrowthPercent - 1))}
                        >
                          <ArrowDownIcon className="h-4 w-4" />
                        </Button>
                        <Slider
                          value={[localDeltas.attendanceGrowthPercent]}
                          min={-20}
                          max={20}
                          step={0.5}
                          onValueChange={(value) => handleParameterChange('attendanceGrowthPercent', value[0])}
                          className="flex-1"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleParameterChange('attendanceGrowthPercent', Math.min(20, localDeltas.attendanceGrowthPercent + 1))}
                        >
                          <ArrowUpIcon className="h-4 w-4" />
                        </Button>
                        <Input
                          type="number"
                          value={localDeltas.attendanceGrowthPercent}
                          onChange={(e) => handleParameterChange('attendanceGrowthPercent', Number(e.target.value))}
                          className="w-20"
                          min={-20}
                          max={20}
                          step={0.5}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Adjust the weekly attendance growth rate
                      </p>
                    </div>
                  </div>
                </TabsContent>

                {/* Costs Tab */}
                <TabsContent value="costs" className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-base">
                        COGS Multiplier {localDeltas.cogsMultiplier > 0 ? '+' : ''}{localDeltas.cogsMultiplier}%
                      </Label>
                      <div className="flex items-center space-x-4">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleParameterChange('cogsMultiplier', Math.max(-50, localDeltas.cogsMultiplier - 5))}
                        >
                          <ArrowDownIcon className="h-4 w-4" />
                        </Button>
                        <Slider
                          value={[localDeltas.cogsMultiplier]}
                          min={-50}
                          max={100}
                          step={1}
                          onValueChange={(value) => handleParameterChange('cogsMultiplier', value[0])}
                          className="flex-1"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleParameterChange('cogsMultiplier', Math.min(100, localDeltas.cogsMultiplier + 5))}
                        >
                          <ArrowUpIcon className="h-4 w-4" />
                        </Button>
                        <Input
                          type="number"
                          value={localDeltas.cogsMultiplier}
                          onChange={(e) => handleParameterChange('cogsMultiplier', Number(e.target.value))}
                          className="w-20"
                          min={-50}
                          max={100}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Adjust the cost of goods sold percentage
                      </p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Scenario Impact Preview */}
            <div>
              {baselineMetrics && scenarioMetrics ? (
                <ScenarioSummaryMetrics
                  baselineMetrics={baselineMetrics}
                  scenarioMetrics={scenarioMetrics}
                />
              ) : (
                <div className="py-8 text-center">
                  <TypographyMuted>
                    Calculating scenario impact...
                  </TypographyMuted>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ScenarioEditor;
