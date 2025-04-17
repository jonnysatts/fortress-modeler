import React, { useEffect, useState, useRef } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { TypographyH4, TypographyMuted } from '@/components/ui/typography';
import { Lightbulb } from 'lucide-react';
import useStore from '@/store/useStore';
import { Scenario, ScenarioParameterDeltas } from '@/types/scenarios';
import { FinancialModel } from '@/lib/db';
import { toast } from '@/components/ui/use-toast';
import { useConfirm } from '@/hooks/useConfirm';
import ScenarioChart from './ScenarioChart';
import ScenarioSummaryTable from './ScenarioSummaryTable';
import { calculateRelatedChanges } from '@/lib/scenarioRelationships';

interface ScenarioEditorProps {
  scenario: Scenario | null;
  baseModel: FinancialModel | null;
  onSave: (updatedScenario: Scenario) => Promise<void>;
  onCancel: () => void;
  isNew?: boolean;
}

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
  const [isCalculating, setIsCalculating] = useState(false);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastCalcParamsRef = useRef<{
    baseModel: FinancialModel | null;
    deltas: ScenarioParameterDeltas | null;
  }>({ baseModel: null, deltas: null });
  const originalDeltasRef = useRef<ScenarioParameterDeltas | null>(null);

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

  // Initialize local deltas from scenario
  useEffect(() => {
    if (scenario) {
      try {
        const defaultDeltas: ScenarioParameterDeltas = {
          marketingSpendPercent: 0,
          marketingSpendByChannel: {},
          pricingPercent: 0,
          attendanceGrowthPercent: 0,
          cogsMultiplier: 0
        };
        const deltaCopy = {
          ...defaultDeltas,
          ...JSON.parse(JSON.stringify(scenario.parameterDeltas || {}))
        };
        originalDeltasRef.current = JSON.parse(JSON.stringify(deltaCopy));
        setLocalDeltas(deltaCopy);
        setIsDirty(false);
        setHasUnsavedChanges(false);
        setSuggestedChanges({});
        setLastChangedParam(null);
        calculateScenarioForecast(deltaCopy);
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to initialize scenario',
          variant: 'destructive',
        });
      }
    }
  }, [scenario, baseModel, calculateScenarioForecast]);

  // Effect to check for unsaved changes
  useEffect(() => {
    if (!originalDeltasRef.current) return;
    const hasChanges = !isEqual(localDeltas, originalDeltasRef.current);
    if (hasChanges !== hasUnsavedChanges) {
      setHasUnsavedChanges(hasChanges);
    }
  }, [localDeltas, hasUnsavedChanges]);

  // Confirmation before leaving if there are unsaved changes
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

  // Debounced forecast calculation
  useEffect(() => {
    if (!scenario || !baseModel) return;
    if (
      lastCalcParamsRef.current.baseModel === baseModel &&
      JSON.stringify(lastCalcParamsRef.current.deltas) === JSON.stringify(localDeltas)
    ) return;
    setIsCalculating(true);
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    debounceTimeoutRef.current = setTimeout(() => {
      calculateScenarioForecast(localDeltas);
      lastCalcParamsRef.current = { baseModel, deltas: localDeltas };
    }, 150);
    return () => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    };
  }, [localDeltas, scenario, baseModel, calculateScenarioForecast]);

  // Turn off loading once forecast updates
  useEffect(() => {
    if (isCalculating) setIsCalculating(false);
  }, [scenarioForecastData, lastUpdated]);

  // Handle parameter changes
  const handleParamChange = (param: keyof ScenarioParameterDeltas, value: number) => {
    setLocalDeltas(prev => ({
      ...prev,
      [param]: value
    }));
    setLastChangedParam(param);
    try {
      const newSuggestions = calculateRelatedChanges(param, value, localDeltas);
      if (Object.keys(newSuggestions).length > 0) {
        setSuggestedChanges(newSuggestions);
        setShowSuggestions(true);
      } else {
        setSuggestedChanges({});
        setShowSuggestions(false);
      }
    } catch {
      setSuggestedChanges({});
      setShowSuggestions(false);
    }
  };

  // Handle save button click
  const handleSave = async () => {
    if (!scenario) return;
    try {
      setIsSaving(true);
      const updatedScenario: Scenario = {
        ...scenario,
        parameterDeltas: { ...localDeltas },
        updatedAt: new Date()
      };
      await onSave(updatedScenario);
      originalDeltasRef.current = JSON.parse(JSON.stringify(localDeltas));
      setIsDirty(false);
      setHasUnsavedChanges(false);
      toast({
        title: 'Success',
        description: 'Scenario saved successfully',
      });
    } catch {
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
  const { confirm, ConfirmDialog } = useConfirm();
  const handleCancel = async () => {
    if (hasUnsavedChanges) {
      const confirmed = await confirm({
        title: 'Discard changes?',
        description: 'You have unsaved changes that will be lost if you continue.',
        confirmText: 'Discard changes',
        cancelText: 'Keep editing'
      });
      if (!confirmed) return;
    }
    onCancel();
  };

  // Handle accepting parameter suggestions
  const handleAcceptSuggestions = (changes: Partial<ScenarioParameterDeltas>) => {
    setLocalDeltas(prev => ({
      ...prev,
      ...changes
    }));
    setSuggestedChanges({});
    setShowSuggestions(false);
    toast({
      title: 'Suggestions Applied',
      description: 'Parameter suggestions have been applied',
    });
  };

  // Handle dismissing parameter suggestions
  const handleDismissSuggestions = () => {
    setShowSuggestions(false);
    setSuggestedChanges({});
  };

  // If no scenario is provided, show a placeholder
  if (!scenario || !baseModel) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Select a scenario to edit</p>
      </div>
    );
  }

  const parameterCardClass =
    "shadow-md rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 flex flex-col gap-2 transition-shadow hover:shadow-lg";

  const sectionDivider = (
    <div className="my-6 border-b border-dashed border-zinc-300 dark:border-zinc-700" />
  );

  const chartOverlay = isCalculating ? (
    <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-zinc-900/80 z-10 rounded-lg">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
    </div>
  ) : null;

  return (
    <>
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
        </div>

        {/* --- Scenario Parameter Controls --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Marketing Spend Slider */}
          <Card className={parameterCardClass}>
            <CardHeader>
              <CardTitle>Marketing Spend</CardTitle>
              <CardDescription>Adjust overall marketing budget (%)</CardDescription>
            </CardHeader>
            <CardContent>
              <Slider
                min={-50}
                max={100}
                step={1}
                value={[localDeltas.marketingSpendPercent]}
                onValueChange={([v]) => handleParamChange('marketingSpendPercent', v)}
              />
              <div className="mt-2 text-right">{localDeltas.marketingSpendPercent}%</div>
            </CardContent>
          </Card>

          {/* Pricing Slider */}
          <Card className={parameterCardClass}>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
              <CardDescription>Adjust all pricing (%)</CardDescription>
            </CardHeader>
            <CardContent>
              <Slider
                min={-30}
                max={50}
                step={1}
                value={[localDeltas.pricingPercent]}
                onValueChange={([v]) => handleParamChange('pricingPercent', v)}
              />
              <div className="mt-2 text-right">{localDeltas.pricingPercent}%</div>
            </CardContent>
          </Card>

          {/* Attendance Growth Slider */}
          <Card className={parameterCardClass}>
            <CardHeader>
              <CardTitle>Attendance Growth</CardTitle>
              <CardDescription>Adjust attendance growth (%)</CardDescription>
            </CardHeader>
            <CardContent>
              <Slider
                min={-30}
                max={50}
                step={1}
                value={[localDeltas.attendanceGrowthPercent]}
                onValueChange={([v]) => handleParamChange('attendanceGrowthPercent', v)}
              />
              <div className="mt-2 text-right">{localDeltas.attendanceGrowthPercent}%</div>
            </CardContent>
          </Card>

          {/* COGS Slider */}
          <Card className={parameterCardClass}>
            <CardHeader>
              <CardTitle>COGS</CardTitle>
              <CardDescription>Adjust cost of goods sold (%)</CardDescription>
            </CardHeader>
            <CardContent>
              <Slider
                min={-30}
                max={50}
                step={1}
                value={[localDeltas.cogsMultiplier]}
                onValueChange={([v]) => handleParamChange('cogsMultiplier', v)}
              />
              <div className="mt-2 text-right">{localDeltas.cogsMultiplier}%</div>
            </CardContent>
          </Card>
        </div>

        {/* Section Divider */}
        {sectionDivider}

        {/* --- Suggestions Section --- */}
        {showSuggestions && (
          <div className="my-4 p-4 bg-blue-50 border border-blue-200 rounded">
            <div className="mb-2 font-semibold flex items-center">
              <Lightbulb className="h-4 w-4 mr-2 text-blue-500" />
              <span className="ml-1">Advice: Consider these related changes</span>
            </div>
            <ul className="mb-2">
              {Object.entries(suggestedChanges).map(([key, val]) => (
                <li key={key} className="flex items-center justify-between py-1">
                  <span>
                    <strong>{key}:</strong> {String(val)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => handleAcceptSuggestions(suggestedChanges)}>
                Accept All Advice
              </Button>
              <Button size="sm" variant="outline" onClick={handleDismissSuggestions}>
                Ignore
              </Button>
            </div>
          </div>
        )}

        {/* Chart Area with Overlay */}
        <div className="relative">
          {chartOverlay}
          <ScenarioChart
            baselineData={baselineForecastData}
            scenarioData={scenarioForecastData}
            isCalculating={isCalculating}
          />
        </div>

        {/* Section Divider */}
        {sectionDivider}

        <ScenarioSummaryTable
          baselineData={baselineForecastData}
          scenarioData={scenarioForecastData}
          isCalculating={isCalculating}
        />

        <div className="flex gap-3 justify-end mt-6">
          <Button
            variant="default"
            className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded shadow"
            loading={isSaving}
            onClick={handleSave}
            disabled={!hasUnsavedChanges || isSaving}
          >
            Save Scenario
          </Button>
          <Button
            variant="outline"
            className="border-amber-300 text-amber-600 hover:bg-amber-50 px-6 py-2 rounded"
            onClick={handleCancel}
            disabled={isSaving}
          >
            Cancel
          </Button>
        </div>
      </div>
    </>
  );
};

export default ScenarioEditor;