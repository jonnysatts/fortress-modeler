import React, { useEffect, useState, useRef } from 'react';
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
  
  // Add a ref to track the original deltas for comparison
  const originalDeltasRef = useRef<ScenarioParameterDeltas | null>(null);
  
  // Add a flag to track if the user has made changes since the last save
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

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

  // Add debug logging for isDirty changes
  useEffect(() => {
    console.log(`isDirty state changed to: ${isDirty}`);
  }, [isDirty]);
  
  // Initialize local deltas from scenario
  useEffect(() => {
    if (scenario) {
      console.log('Initializing scenario:', scenario.name);
      
      try {
        // Create a fresh default deltas object
        const defaultDeltas: ScenarioParameterDeltas = {
          marketingSpendPercent: 0,
          marketingSpendByChannel: {},
          pricingPercent: 0,
          attendanceGrowthPercent: 0,
          cogsMultiplier: 0
        };
        
        // Create deep copies to ensure we have independent copies
        // Use the scenario deltas or defaults if not present
        const deltaCopy = {
          ...defaultDeltas,
          ...JSON.parse(JSON.stringify(scenario.parameterDeltas || {}))
        };
        
        console.log('Original deltas from scenario:', JSON.stringify(deltaCopy));
        
        // Store the original deltas for comparison
        originalDeltasRef.current = JSON.parse(JSON.stringify(deltaCopy));
        
        // Set the local deltas from the scenario
        setLocalDeltas(deltaCopy);
        
        // Reset dirty state and unsaved changes flag
        setIsDirty(false);
        setHasUnsavedChanges(false);
        
        // Clear any suggestions
        setSuggestedChanges({});
        setLastChangedParam(null);
        
        console.log(`Initialized scenario: ${scenario.name}, isDirty and hasUnsavedChanges set to false`);
        console.log(`Original deltas stored in ref:`, JSON.stringify(originalDeltasRef.current));
        
        // Force recalculation with the new scenario
        calculateScenarioForecast();
      } catch (error) {
        console.error('Error initializing scenario:', error);
        toast({
          title: 'Error',
          description: 'Failed to initialize scenario',
          variant: 'destructive',
        });
      }
    }
  }, [scenario, calculateScenarioForecast]);

  // Add effect to properly check for unsaved changes by comparing current deltas with original deltas
  useEffect(() => {
    // Skip if we don't have original deltas yet
    if (!originalDeltasRef.current) {
      console.log('No original deltas reference yet, skipping comparison');
      return;
    }
    
    try {
      // Deep compare current deltas with original deltas
      const origStr = JSON.stringify(originalDeltasRef.current);
      const currStr = JSON.stringify(localDeltas);
      
      // Log comparisons at appropriate moments
      if (origStr !== currStr) {
        console.log(`Deltas comparison detected a difference:`);
        console.log(`Original:`, origStr);
        console.log(`Current: `, currStr);
        
        // IMPORTANT: Only set to true on changes, never auto-reset to false here
        // This prevents the flickering buttons issue
        if (!isDirty) {
          console.log(`Setting isDirty = true because deltas changed`);
          setIsDirty(true);
          setHasUnsavedChanges(true);
        }
      } else {
        console.log(`Deltas match, no unsaved changes`);
        if (isDirty) {
          console.log(`NOTE: isDirty is true but deltas match - not resetting to prevent UI flickering`);
        }
      }
    } catch (error) {
      console.error('Error comparing deltas:', error);
    }
  }, [localDeltas, isDirty, hasUnsavedChanges]);

  // Only reset dirty state when explicitly saved
  const resetDirtyState = () => {
    console.log('Explicitly resetting dirty state');
    setIsDirty(false);
    setHasUnsavedChanges(false);
    
    // Store current deltas as the new baseline for comparison
    originalDeltasRef.current = JSON.parse(JSON.stringify(localDeltas));
    console.log('Set new baseline for comparison, originalDeltasRef updated:', JSON.stringify(originalDeltasRef.current));
  };

  // Handle save
  const handleSave = async () => {
    try {
      console.log('Saving scenario with deltas:', localDeltas);

      // Update scenario with new deltas
      await updateScenario({
        ...scenario,
        parameterDeltas: { ...localDeltas },
        updatedAt: new Date()
      });

      // Update the original deltas reference after saving - ensure it's a deep copy
      originalDeltasRef.current = JSON.parse(JSON.stringify(localDeltas));
      console.log('Updated originalDeltasRef after save:', JSON.stringify(originalDeltasRef.current));

      // Force recalculation
      calculateScenarioForecast();

      // Explicitly reset dirty state
      resetDirtyState();
      
      console.log('Scenario saved successfully, isDirty and hasUnsavedChanges set to false');

      // Show success message
      toast({
        title: 'Success',
        description: 'Scenario changes saved successfully',
      });
      
      // Dispatch a custom event to notify other components
      const event = new CustomEvent('scenario:saved', { 
        detail: { scenarioId: scenario.id } 
      });
      document.dispatchEvent(event);
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

  // Add event listener for parameter ignored events
  useEffect(() => {
    const handleParameterIgnored = (event: Event) => {
      const customEvent = event as CustomEvent<{param: keyof ScenarioParameterDeltas, value: number}>;
      const { param, value } = customEvent.detail;
      
      console.log('ScenarioEditor: Received parameter ignored event:', { param, value });
      
      // Update local state to match the original parameter change
      setLocalDeltas(prev => ({
        ...prev,
        [param]: value
      }));
      
      // Mark as dirty since we've made a change
      setIsDirty(true);
      setHasUnsavedChanges(true);
      
      // Force recalculation to ensure UI updates
      calculateScenarioForecast();
    };
    
    const handleScenarioSaved = (event: Event) => {
      const customEvent = event as CustomEvent<{scenarioId: number}>;
      const { scenarioId } = customEvent.detail;
      
      console.log('ScenarioEditor: Received scenario saved event:', { scenarioId });
      
      // Reset dirty state since changes are now saved
      setIsDirty(false);
    };
    
    const handleScenarioReset = (event: Event) => {
      const customEvent = event as CustomEvent<{scenarioId: number}>;
      const { scenarioId } = customEvent.detail;
      
      console.log('ScenarioEditor: Received scenario reset event:', { scenarioId });
      
      // Reset dirty state since we've reverted to original
      setIsDirty(false);
    };
    
    // Add event listeners
    document.addEventListener('scenario:parameter:ignored', handleParameterIgnored);
    document.addEventListener('scenario:saved', handleScenarioSaved);
    document.addEventListener('scenario:reset', handleScenarioReset);
    
    // Clean up on unmount
    return () => {
      document.removeEventListener('scenario:parameter:ignored', handleParameterIgnored);
      document.removeEventListener('scenario:saved', handleScenarioSaved);
      document.removeEventListener('scenario:reset', handleScenarioReset);
    };
  }, [calculateScenarioForecast]);

  // Log changes to localDeltas
  useEffect(() => {
    console.log('Local deltas changed:', localDeltas);
    // Force recalculation when local deltas change
    calculateScenarioForecast();
  }, [localDeltas, calculateScenarioForecast]);

  // Add debugging for suggestions state
  useEffect(() => {
    console.log('Suggestion state changed:', {
      hasSuggestions: Object.keys(suggestedChanges).length > 0,
      suggestedChanges,
      lastChangedParam,
      shouldRender: Object.keys(suggestedChanges).length > 0 && lastChangedParam !== null
    });
  }, [suggestedChanges, lastChangedParam]);

  // Calculate forecast when component mounts
  useEffect(() => {
    calculateScenarioForecast();
  }, [calculateScenarioForecast]);

  // Apply a parameter change directly without suggestions
  const applyParameterChange = (
    paramName: keyof ScenarioParameterDeltas,
    value: number
  ) => {
    console.log(`Directly applying parameter ${paramName} to ${value}`);
    
    // Important: force immediate store update without waiting for local state
    // This ensures the forecast calculations happen immediately
    const deltaUpdate: Partial<ScenarioParameterDeltas> = { [paramName]: value };
    
    // Update the store before anything else
    updateScenarioDeltas(deltaUpdate);
    
    // Explicitly force recalculation immediately
    calculateScenarioForecast();
    
    // Fire a custom event to notify any components that need to update
    // This can help with components that might not be directly connected to the store
    const event = new CustomEvent('scenario:parameter:changed', {
      detail: { parameter: paramName, value, timestamp: Date.now() }
    });
    document.dispatchEvent(event);

    // Update local state after a very tiny delay
    // This ensures UI components have time to react to store changes first
    setTimeout(() => {
      setLocalDeltas(prev => {
        const updated = {
          ...prev,
          [paramName]: value
        };
        console.log('Updated local deltas:', updated);
        return updated;
      });
  
      // Force isDirty to true when any parameter changes
      setIsDirty(true);
      setHasUnsavedChanges(true);
      
      console.log(`Set isDirty=true and hasUnsavedChanges=true for parameter ${paramName}`);
    }, 10); // Super tiny delay so store updates happen first

    // For debugging - always force suggestions for marketing changes
    if (paramName === 'marketingSpendPercent' && value !== 0) {
      console.log('FORCING SUGGESTIONS for marketing change');
      // Create a forced suggestion for attendance growth
      const suggestedAttendance = value * 0.2; // Simple relationship
      setSuggestedChanges({ attendanceGrowthPercent: suggestedAttendance });
      setLastChangedParam('marketingSpendPercent');
    }
  };

  // Handle parameter change with suggestions
  const handleParameterChange = (
    paramName: keyof ScenarioParameterDeltas,
    value: number
  ) => {
    console.log(`Parameter change initiated: ${paramName} = ${value}`);
    
    // First clear any existing suggestions to prevent UI flicker
    setSuggestedChanges({});
    setLastChangedParam(null);
    
    // Apply the parameter change directly
    applyParameterChange(paramName, value);

    // Then calculate related parameter changes for suggestions
    const related = calculateRelatedChanges(paramName, value, localDeltas);
    console.log(`Related changes calculated:`, related);

    // Set a slight delay to avoid UI flicker when showing suggestions
    setTimeout(() => {
      if (Object.keys(related).length > 0) {
        console.log(`Setting suggested changes for ${paramName}`);
        setSuggestedChanges(related);
        setLastChangedParam(paramName);
      }
    }, 50);
    
    // Explicitly ensure the dirty state is set
    setIsDirty(true);
    setHasUnsavedChanges(true);
  };

  // Handle channel-specific marketing spend change
  const handleChannelSpendChange = (channelId: string, value: number) => {
    console.log(`Updating marketing channel ${channelId} to ${value} and forcing isDirty=true`);

    // Create a proper delta update
    const updatedChannels = {
      ...localDeltas.marketingSpendByChannel,
      [channelId]: value
    };
    
    const deltaUpdate: Partial<ScenarioParameterDeltas> = {
      marketingSpendByChannel: updatedChannels
    };

    // Update store FIRST and force recalculation BEFORE updating local state
    updateScenarioDeltas(deltaUpdate);
    calculateScenarioForecast();

    // Update local state AFTER store update to ensure UI consistency
    setLocalDeltas(prev => ({
      ...prev,
      marketingSpendByChannel: updatedChannels
    }));

    // Force isDirty to true when any channel spend changes
    setIsDirty(true);
    setHasUnsavedChanges(true);
  };

  // Handle reset
  const handleReset = () => {
    try {
      console.log('Resetting all scenario parameters to baseline');

      // Define the reset deltas - all values at baseline (0)
      const resetDeltas: ScenarioParameterDeltas = {
        marketingSpendPercent: 0,
        marketingSpendByChannel: {},
        pricingPercent: 0,
        attendanceGrowthPercent: 0,
        cogsMultiplier: 0
      };

      // First update local state for immediate UI feedback
      setLocalDeltas(resetDeltas);
      
      // Clear any suggestions
      setSuggestedChanges({});
      setLastChangedParam(null);

      // Update the original deltas reference
      originalDeltasRef.current = JSON.parse(JSON.stringify(resetDeltas));

      // Then explicitly update the store with zeroed parameters
      // This ensures the store and local state are in sync
      updateScenarioDeltas(resetDeltas);
      
      // Explicitly force recalculation to update all dependent UI
      calculateScenarioForecast();

      // Reset dirty state
      resetDirtyState();
      
      console.log('Reset completed - all parameters at baseline');
      
      // Dispatch a custom event to notify other components
      const event = new CustomEvent('scenario:reset', { 
        detail: { scenarioId: scenario.id } 
      });
      document.dispatchEvent(event);
      
      // Show success message
      toast({
        title: 'Reset Complete',
        description: 'Scenario reset to baseline values',
      });
    } catch (error) {
      console.error('Error resetting scenario:', error);
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

    // Create a single update for all changes
    const combinedUpdates: Partial<ScenarioParameterDeltas> = {};
    
    // Build the combined update object
    Object.entries(changes).forEach(([param, value]) => {
      if (typeof value === 'number') {
        console.log(`Including suggested change: ${param} = ${value}`);
        // Use type assertion to handle complex types in ScenarioParameterDeltas
        (combinedUpdates as any)[param] = value;
      }
    });
    
    // Update store first
    updateScenarioDeltas(combinedUpdates);
    
    // Force immediate recalculation
    calculateScenarioForecast();
    
    // Update local state with all changes
    setLocalDeltas(prev => ({
      ...prev,
      ...combinedUpdates
    }));
    
    // Force dirty state
    setIsDirty(true);
    setHasUnsavedChanges(true);

    // Clear suggestions
    setSuggestedChanges({});
    setLastChangedParam(null);
  };

  // Handle dismissing suggested changes
  const handleDismissSuggestions = () => {
    try {
      // Store the last changed parameter before clearing suggestions
      const param = lastChangedParam;
      const value = param ? localDeltas[param] : null;

      console.log('Dismissing suggestions, preserving parameter:', { param, value });

      // Clear suggestions UI
      setSuggestedChanges({});
      setLastChangedParam(null);

      // Ensure the parameter value is explicitly set
      if (param && value !== null) {
        // Explicitly set the value in the store to ensure it's preserved
        const deltaUpdate = { [param]: value as number };
        updateScenarioDeltas(deltaUpdate);
        
        // Ensure local state matches
        setLocalDeltas(prev => ({
          ...prev,
          [param]: value
        }));
        
        // Mark as dirty to enable Save button
        setIsDirty(true);
        setHasUnsavedChanges(true);
        
        // Force recalculation
        calculateScenarioForecast();
        
        // Notify user
        toast({
          title: 'Parameter Applied',
          description: `Applied ${param} change of ${typeof value === 'number' && value > 0 ? '+' : ''}${value}%`,
        });
      }
    } catch (error) {
      console.error('Error dismissing suggestions:', error);
      toast({
        title: 'Error',
        description: 'Failed to apply parameter change',
        variant: 'destructive',
      });
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

  // Add state for forcing re-renders
  const [, forceUpdate] = useState({});
  
  // Add effect to force re-render when lastUpdated changes
  useEffect(() => {
    if (lastUpdated) {
      console.log(`Store updated at ${new Date(lastUpdated).toISOString()}, forcing UI refresh`);
      
      // Force a re-render
      forceUpdate({});
      
      // Force component to react to changes in forecast data
      if (scenarioForecastData?.length > 0) {
        console.log('Forecast data updated, entries:', scenarioForecastData.length);
      }
    }
  }, [lastUpdated, scenarioForecastData, forceUpdate]);

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
              isDirty={isDirty || hasUnsavedChanges}
              onReset={handleReset}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Parameter Controls */}
            <div>
              {/* Parameter Suggestions UI */}
              <div 
                className="min-h-[80px] mb-4 transition-all duration-300" 
                id="suggestions-container"
              >
                {Object.keys(suggestedChanges).length > 0 && lastChangedParam ? (
                  <ParameterSuggestions
                    sourceParam={lastChangedParam}
                    sourceValue={localDeltas[lastChangedParam] as number}
                    suggestedChanges={suggestedChanges}
                    relationships={parameterRelationships[lastChangedParam] || []}
                    onAccept={handleAcceptSuggestions}
                    onDismiss={handleDismissSuggestions}
                  />
                ) : (
                  <div className="hidden">No suggestions available</div>
                )}
              </div>

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
