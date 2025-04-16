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
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/use-toast';
import { AlertCircle, ArrowRight, Check, Info, Lightbulb, Save, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { useConfirm } from '@/hooks/useConfirm';
import ScenarioChart from './ScenarioChart';
import ScenarioSummaryTable from './ScenarioSummaryTable';
import MarketingChannelAdjuster from './MarketingChannelAdjuster';
import ParameterSuggestions from './ParameterSuggestions';
import ScenarioControls from './ScenarioControls';
import { calculateRelatedChanges, parameterRelationships } from '@/lib/scenarioRelationships';
import DirectIgnoreButton from './DirectIgnoreButton';
import { useHotkeys } from 'react-hotkeys-hook';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface ScenarioEditorProps {
  scenario: Scenario | null;
  baseModel: FinancialModel | null;
  onSave: (updatedScenario: Scenario) => Promise<void>;
  onCancel: () => void;
  isNew?: boolean;
}

// Helper to check if two objects are deeply equal
const isEqual = (obj1: any, obj2: any): boolean => {
  return JSON.stringify(obj1) === JSON.stringify(obj2);
};

const ScenarioEditor: React.FC<ScenarioEditorProps> = ({
  scenario,
  baseModel,
  onSave,
  onCancel,
  isNew = false
}) => {
  // Place the debug log here:
  console.log('[ScenarioEditor] PROPS:', {
    scenario,
    baseModel,
    onSave,
    onCancel,
    isNew
  });

  // ...rest of your component code
  const [activeTab, setActiveTab] = useState('marketing');
  const [localDeltas, setLocalDeltas] = useState<ScenarioParameterDeltas>({
    marketingSpendPercent: 0,
    marketingSpendByChannel: {},
    pricingPercent: 0,
    attendanceGrowthPercent: 0,
    cogsMultiplier: 0
  });
  const [isDirty, setIsDirty] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [suggestedChanges, setSuggestedChanges] = useState<Partial<ScenarioParameterDeltas>>({});
  const [lastChangedParam, setLastChangedParam] = useState<keyof ScenarioParameterDeltas | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Store original deltas for comparison
  const originalDeltasRef = useRef<ScenarioParameterDeltas | null>(null);

  const navigate = useNavigate();

  // Get forecast data from store
  const {
    calculateScenarioForecast,
    scenarioForecastData,
    baselineForecastData,
    lastUpdated
  } = useStore(state => ({
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
      console.log(`Initializing scenario: ${scenario.name}`, () => {
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
          appError('Error initializing scenario', error);
          toast({
            title: 'Error',
            description: 'Failed to initialize scenario',
            variant: 'destructive',
          });
        }
      });
    }
  }, [scenario, calculateScenarioForecast]);

  // Add effect to properly check for unsaved changes by comparing current deltas with original deltas
  useEffect(() => {
    // Skip if we don't have original deltas yet
    if (!originalDeltasRef.current) {
      console.log('No original deltas reference yet, skipping comparison');
      return;
    }

    // Compare current deltas with original deltas
    const hasChanges = !isEqual(localDeltas, originalDeltasRef.current);

    if (hasChanges !== hasUnsavedChanges) {
      console.log(`Setting hasUnsavedChanges to ${hasChanges}`);
      setHasUnsavedChanges(hasChanges);
    }
  }, [localDeltas, hasUnsavedChanges]);

  // Add hotkey for saving
  useHotkeys('ctrl+s, cmd+s', (event) => {
    event.preventDefault();
    if (hasUnsavedChanges && !isSaving) {
      handleSave();
    }
  }, { enableOnFormTags: true });

  // Add confirmation before leaving if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  // Calculate forecast when deltas change
  useEffect(() => {
    if (scenario && baseModel) {
      // Only recalculate if we have a scenario and base model
      calculateScenarioForecast(baseModel, localDeltas);

      // Mark as dirty if we've made changes
      if (originalDeltasRef.current && !isEqual(localDeltas, originalDeltasRef.current)) {
        if (!isDirty) {
          console.log('Setting isDirty to true due to delta changes');
          setIsDirty(true);
        }
      } else {
        if (isDirty) {
          console.log('Setting isDirty to false as deltas match original');
          setIsDirty(false);
        }
      }
    }
  }, [localDeltas, scenario, baseModel, calculateScenarioForecast, isDirty]);

  // Handle parameter changes
  const handleParamChange = (param: keyof ScenarioParameterDeltas, value: number) => {
    // Update local deltas
    setLocalDeltas(prev => ({
      ...prev,
      [param]: value
    }));

    // Track the last changed parameter for suggestions
    setLastChangedParam(param);

    // Generate suggestions based on parameter relationships
    try {
      // Calculate related changes based on the parameter relationships
      const newSuggestions = calculateRelatedChanges(param, value, localDeltas);

      // If we have suggestions, show them
      if (Object.keys(newSuggestions).length > 0) {
        setSuggestedChanges(newSuggestions);
        setShowSuggestions(true);
      } else {
        // Otherwise clear suggestions
        setSuggestedChanges({});
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error('Error generating suggestions:', error);
      // Clear suggestions on error
      setSuggestedChanges({});
      setShowSuggestions(false);
    }
  };

  // Handle marketing channel budget changes
  const handleChannelBudgetChange = (channelId: string, percentChange: number) => {
    // Update local deltas
    setLocalDeltas(prev => ({
      ...prev,
      marketingSpendByChannel: {
        ...prev.marketingSpendByChannel,
        [channelId]: percentChange
      }
    }));

    // Track the last changed parameter
    setLastChangedParam('marketingSpendByChannel');

    // Clear any existing suggestions
    setSuggestedChanges({});
    setShowSuggestions(false);
  };

  // Handle save button click
  const handleSave = async () => {
    if (!scenario) return;

    try {
      setIsSaving(true);

      // Create updated scenario with new deltas
      const updatedScenario: Scenario = {
        ...scenario,
        parameterDeltas: { ...localDeltas },
        updatedAt: new Date()
      };

      // Call the onSave callback
      await onSave(updatedScenario);

      // Update the original deltas reference
      originalDeltasRef.current = JSON.parse(JSON.stringify(localDeltas));

      // Reset dirty state
      setIsDirty(false);
      setHasUnsavedChanges(false);

      toast({
        title: 'Success',
        description: 'Scenario saved successfully',
      });
    } catch (error) {
      appError('Error saving scenario', error);
      toast({
        title: 'Error',
        description: 'Failed to save scenario',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle cancel button click
  const handleCancel = async () => {
    // If there are unsaved changes, confirm before canceling
    if (hasUnsavedChanges) {
      const confirmed = await confirm({
        title: 'Discard changes?',
        description: 'You have unsaved changes that will be lost if you continue.',
        confirmText: 'Discard changes',
        cancelText: 'Keep editing'
      });

      if (!confirmed) return;
    }

    // Call the onCancel callback
    onCancel();
  };

  // Handle accepting parameter suggestions
  const handleAcceptSuggestions = (changes: Partial<ScenarioParameterDeltas>) => {
    // Apply all suggested changes to local deltas
    setLocalDeltas(prev => ({
      ...prev,
      ...changes
    }));

    // Clear suggestions after applying
    setSuggestedChanges({});
    setShowSuggestions(false);

    // Log the changes
    console.log('Applied suggested changes:', changes);

    // Show toast notification
    toast({
      title: 'Suggestions Applied',
      description: 'Parameter suggestions have been applied',
    });
  };

  // Handle dismissing parameter suggestions
  const handleDismissSuggestions = () => {
    // Just hide the suggestions
    setShowSuggestions(false);
    setSuggestedChanges({});
  };

  // Generate suggestions based on the last changed parameter
  const generateSuggestions = () => {
    if (!lastChangedParam || !baseModel) return;

    try {
      // Calculate related changes based on the parameter relationships
      const newSuggestions = calculateRelatedChanges(
        lastChangedParam,
        localDeltas[lastChangedParam] as number,
        localDeltas
      );

      // If we have suggestions, show them
      if (Object.keys(newSuggestions).length > 0) {
        setSuggestedChanges(newSuggestions);
        setShowSuggestions(true);
      } else {
        // Otherwise clear suggestions
        setSuggestedChanges({});
        setShowSuggestions(false);

        // Show toast notification
        toast({
          title: 'No Suggestions',
          description: 'No parameter suggestions available for this change',
        });
      }
    } catch (error) {
      console.error('Error generating suggestions:', error);
      // Clear suggestions on error
      setSuggestedChanges({});
      setShowSuggestions(false);

      // Show error toast
      toast({
        title: 'Error',
        description: 'Failed to generate parameter suggestions',
        variant: 'destructive',
      });
    }
  };

  // Render the marketing tab content
  const renderMarketingTab = () => {
    if (!baseModel || !baseModel.assumptions.marketing) {
      return (
        <div className="py-4">
          <Alert variant="warning">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No Marketing Data</AlertTitle>
            <AlertDescription>
              The base model does not have any marketing data to adjust.
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    const { marketing } = baseModel.assumptions;

    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <div>
            <div className="font-medium mb-2">
              Overall Marketing Budget Adjustment
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Slider
                  id="marketingSpendPercent"
                  min={-50}
                  max={100}
                  step={1}
                  value={[localDeltas.marketingSpendPercent]}
                  onValueChange={values => handleParamChange('marketingSpendPercent', values[0])}
                  className="flex-1"
                />
              </div>
              <div className="w-12 text-right">
                {localDeltas.marketingSpendPercent}
              </div>
              <div className="w-6 text-left">%</div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Adjust the overall marketing budget by percentage.
            </p>
          </div>
        </div>

        {marketing.allocationMode === 'channels' && marketing.channels.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-medium mb-4">Marketing Channel Adjustments</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Fine-tune individual marketing channel budgets.
            </p>

            <MarketingChannelAdjuster
              channels={marketing.channels}
              channelAdjustments={localDeltas.marketingSpendByChannel}
              onChannelAdjustmentChange={handleChannelBudgetChange}
            />
          </div>
        )}
      </div>
    );
  };

  // Render the pricing tab content
  const renderPricingTab = () => {
    return (
      <div className="space-y-6">
        <div>
          <div className="font-medium mb-2">
            Pricing Adjustment
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Slider
                id="pricingPercent"
                min={-30}
                max={50}
                step={1}
                value={[localDeltas.pricingPercent]}
                onValueChange={values => handleParamChange('pricingPercent', values[0])}
                className="flex-1"
              />
            </div>
            <div className="w-12 text-right">
              {localDeltas.pricingPercent}
            </div>
            <div className="w-6 text-left">%</div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Adjust all pricing by percentage.
          </p>
        </div>
      </div>
    );
  };

  // Render the attendance tab content
  const renderAttendanceTab = () => {
    return (
      <div className="space-y-6">
        <div>
          <div className="font-medium mb-2">
            Attendance Growth Adjustment
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Slider
                id="attendanceGrowthPercent"
                min={-30}
                max={50}
                step={1}
                value={[localDeltas.attendanceGrowthPercent]}
                onValueChange={values => handleParamChange('attendanceGrowthPercent', values[0])}
                className="flex-1"
              />
            </div>
            <div className="w-12 text-right">
              {localDeltas.attendanceGrowthPercent}
            </div>
            <div className="w-6 text-left">%</div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Adjust attendance growth rate by percentage points.
          </p>
        </div>
      </div>
    );
  };

  // Render the costs tab content
  const renderCostsTab = () => {
    return (
      <div className="space-y-6">
        <div>
          <div className="font-medium mb-2">
            Cost of Goods Sold (COGS) Adjustment
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Slider
                id="cogsMultiplier"
                min={-30}
                max={50}
                step={1}
                value={[localDeltas.cogsMultiplier]}
                onValueChange={values => handleParamChange('cogsMultiplier', values[0])}
                className="flex-1"
              />
            </div>
            <div className="w-12 text-right">
              {localDeltas.cogsMultiplier}
            </div>
            <div className="w-6 text-left">%</div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Adjust COGS percentages by percentage points.
          </p>
        </div>
      </div>
    );
  };

// If no scenario is provided, show a placeholder
if (!scenario || !baseModel) {
  return (
    <div className="flex items-center justify-center h-64">
      <p className="text-muted-foreground">Select a scenario to edit</p>
    </div>
  );
}

const { confirm, ConfirmDialog } = useConfirm();

return (
  <>
    <div style={{ background: '#ffeeba', padding: 8, color: '#856404', fontWeight: 'bold', textAlign: 'center' }}>
      [DEBUG] ScenarioEditor is rendering!
    </div>
    <div className="space-y-6">
      <ConfirmDialog />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <TypographyH4>
            {isNew ? 'Create New Scenario' : 'Edit Scenario'}
          </TypographyH4>
          <TypographyMuted>
            {isNew
              ? 'Create a new scenario based on the baseline model'
              : `Editing scenario "${scenario.name}"`}
          </TypographyMuted>
        </div>
        {/* ...the rest of your main UI as you already have it... */}
      </div>
      {/* ...rest of your parameters, cards, tabs, etc... */}
    </div>
  </>
);
};

export default ScenarioEditor;