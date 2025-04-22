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
import ForecastDataTab from './ForecastDataTab';
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
    cogsMultiplier: 0,
    ticketPriceDelta: 0,
    ticketPriceDeltaType: 'percent',
    fbSpendDelta: 0,
    fbSpendDeltaType: 'percent',
    merchSpendDelta: 0,
    merchSpendDeltaType: 'percent'
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
    attendanceGrowthMode: 'replace' | 'add' | null;
    cogsMode: 'multiply' | 'add' | null;
  }>({ baseModel: null, deltas: null, attendanceGrowthMode: null, cogsMode: null });
  const originalDeltasRef = useRef<ScenarioParameterDeltas | null>(null);

  // --- NEW: Calculation mode toggles for Attendance Growth and COGS ---
  const [attendanceGrowthMode, setAttendanceGrowthMode] = useState<'replace' | 'add'>('replace');
  const [cogsMode, setCogsMode] = useState<'multiply' | 'add'>('multiply');

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
          cogsMultiplier: 0,
          ticketPriceDelta: 0,
          ticketPriceDeltaType: 'percent',
          fbSpendDelta: 0,
          fbSpendDeltaType: 'percent',
          merchSpendDelta: 0,
          merchSpendDeltaType: 'percent'
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
      JSON.stringify(lastCalcParamsRef.current.deltas) === JSON.stringify(localDeltas) &&
      lastCalcParamsRef.current.attendanceGrowthMode === attendanceGrowthMode &&
      lastCalcParamsRef.current.cogsMode === cogsMode
    ) return;
    setIsCalculating(true);
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    debounceTimeoutRef.current = setTimeout(() => {
      calculateScenarioForecast(localDeltas, {
        attendanceGrowthMode,
        cogsMode
      });
      lastCalcParamsRef.current = { baseModel, deltas: localDeltas, attendanceGrowthMode, cogsMode };
    }, 150);
    return () => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    };
  }, [localDeltas, scenario, baseModel, calculateScenarioForecast, attendanceGrowthMode, cogsMode]);

  // Turn off loading once forecast updates
  useEffect(() => {
    if (isCalculating) setIsCalculating(false);
  }, [scenarioForecastData, lastUpdated]);

  // --- NEW: Auto-apply price elasticity with override ---
  useEffect(() => {
    if (lastChangedParam === 'pricingPercent') {
      // Auto-apply elasticity unless overridden
      const elasticity = -0.5;
      const attendanceImpact = localDeltas.pricingPercent * elasticity;
      if (Math.round((localDeltas.attendanceGrowthPercent || 0) * 10) / 10 !== Math.round(attendanceImpact * 10) / 10) {
        setLocalDeltas(prev => ({
          ...prev,
          attendanceGrowthPercent: Math.round(attendanceImpact * 10) / 10,
          _autoElasticity: true // custom flag for UI
        }));
        setSuggestedChanges({ attendanceGrowthPercent: attendanceImpact });
        setShowSuggestions(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localDeltas.pricingPercent]);

  // --- Enhanced: Handle parameter changes for both number and string values ---
  const handleParamChange = (param: keyof ScenarioParameterDeltas, value: number | string) => {
    setLocalDeltas(prev => ({
      ...prev,
      [param]: value
    }));
    setLastChangedParam(param);
    try {
      if (typeof value === 'number') {
        const newSuggestions = calculateRelatedChanges(param, value, localDeltas);
        if (Object.keys(newSuggestions).length > 0) {
          setSuggestedChanges(newSuggestions);
          setShowSuggestions(true);
        } else {
          setSuggestedChanges({});
          setShowSuggestions(false);
        }
      }
    } catch {
      setSuggestedChanges({});
      setShowSuggestions(false);
    }
  };

  // --- NEW: Reset Button ---
  const handleReset = () => {
    setLocalDeltas({
      marketingSpendPercent: 0,
      marketingSpendByChannel: {},
      pricingPercent: 0,
      attendanceGrowthPercent: 0,
      cogsMultiplier: 0,
      ticketPriceDelta: 0,
      ticketPriceDeltaType: 'percent',
      fbSpendDelta: 0,
      fbSpendDeltaType: 'percent',
      merchSpendDelta: 0,
      merchSpendDeltaType: 'percent'
    });
    setSuggestedChanges({});
    setShowSuggestions(false);
    setLastChangedParam(null);
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

  // --- NEW: Trigger forecast calculation on localDeltas change ---
  useEffect(() => {
    console.log('localDeltas changed:', localDeltas);
    calculateScenarioForecast(localDeltas);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localDeltas]);

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

  const [activeTab, setActiveTab] = useState<'main' | 'forecastData'>('main');

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

        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Scenario Editor</CardTitle>
            <CardDescription>
              Adjust scenario parameters and see real-time forecast updates.
            </CardDescription>
            <div className="flex gap-2 mt-2">
              <Button variant={activeTab === 'main' ? 'default' : 'outline'} onClick={() => setActiveTab('main')}>Summary & Charts</Button>
              <Button variant={activeTab === 'forecastData' ? 'default' : 'outline'} onClick={() => setActiveTab('forecastData')}>Forecast Data Table</Button>
            </div>
          </CardHeader>
          <CardContent>
            {activeTab === 'main' ? (
              <>
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
                        aria-label="Marketing Spend Percent"
                      />
                      <div className="mt-2 text-right font-semibold">{localDeltas.marketingSpendPercent}%</div>
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
                        aria-label="Pricing Percent"
                      />
                      <div className="mt-2 text-right font-semibold">{localDeltas.pricingPercent}%</div>
                    </CardContent>
                  </Card>

                  {/* Attendance Growth Slider */}
                  <Card className={parameterCardClass}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>Attendance Growth</CardTitle>
                          <CardDescription>Adjust attendance growth rate (%)</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={attendanceGrowthMode}
                            onChange={e => setAttendanceGrowthMode(e.target.value as 'replace' | 'add')}
                            aria-label="Attendance Growth Calculation Mode"
                            className="border rounded px-2 py-1 text-xs"
                          >
                            <option value="replace">Replace Baseline</option>
                            <option value="add">Add to Baseline</option>
                          </select>
                          <span title={attendanceGrowthMode === 'replace'
                            ? 'Each week’s attendance will grow by this percentage, starting from the initial value. (Replaces baseline growth rate)'
                            : 'This percentage will be added to the baseline attendance growth rate.'}
                          >
                            <Lightbulb size={16} className="ml-1 text-yellow-400" />
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Slider
                        id="attendance-growth-slider"
                        min={-100}
                        max={200}
                        step={1}
                        value={[localDeltas.attendanceGrowthPercent]}
                        onValueChange={([value]) => handleParamChange('attendanceGrowthPercent', value)}
                        aria-label="Attendance Growth Percent"
                      />
                      <div className="mt-2 text-right font-semibold">{localDeltas.attendanceGrowthPercent}%</div>
                      <TypographyMuted>
                        {attendanceGrowthMode === 'replace'
                          ? 'Attendance will compound at this rate each period, replacing the baseline.'
                          : 'This value will be added to the baseline attendance growth rate.'}
                      </TypographyMuted>
                    </CardContent>
                  </Card>

                  {/* COGS Slider */}
                  <Card className={parameterCardClass}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>COGS Change</CardTitle>
                          <CardDescription>Adjust cost of goods sold (%)</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={cogsMode}
                            onChange={e => setCogsMode(e.target.value as 'multiply' | 'add')}
                            aria-label="COGS Calculation Mode"
                            className="border rounded px-2 py-1 text-xs"
                          >
                            <option value="multiply">% Increase (multiply)</option>
                            <option value="add">Add to Baseline</option>
                          </select>
                          <span title={cogsMode === 'multiply'
                            ? 'COGS will be multiplied by (1 + this value/100). E.g., 30% + 5% = 31.5%.'
                            : 'This value will be added to the baseline COGS percentage.'}
                          >
                            <Lightbulb size={16} className="ml-1 text-yellow-400" />
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Slider
                        id="cogs-multiplier-slider"
                        min={-100}
                        max={100}
                        step={1}
                        value={[localDeltas.cogsMultiplier]}
                        onValueChange={([value]) => handleParamChange('cogsMultiplier', value)}
                        aria-label="COGS Multiplier"
                      />
                      <div className="mt-2 text-right font-semibold">{localDeltas.cogsMultiplier}%</div>
                      <TypographyMuted>
                        {cogsMode === 'multiply'
                          ? 'COGS will be multiplied by (1 + value/100).'
                          : 'This value will be added to the baseline COGS percentage.'}
                      </TypographyMuted>
                    </CardContent>
                  </Card>

                  {/* --- Per-Attendee Revenue Group --- */}
                  <div className="col-span-full">
                    <Card className="shadow-md rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 flex flex-col gap-2">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Per-Attendee Revenue</CardTitle>
                        <CardDescription className="text-xs">Model increases in average spend per attendee for ticket price, F&B, and merchandise. Choose % or $ increase.</CardDescription>
                      </CardHeader>
                      <CardContent className="flex flex-col md:flex-row gap-2">
                        {/* Ticket Price Delta */}
                        <div className="flex-1 flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs">Ticket Price</span>
                            <select
                              value={localDeltas.ticketPriceDeltaType || 'percent'}
                              onChange={e => handleParamChange('ticketPriceDeltaType', e.target.value as any)}
                              className="border rounded px-1 py-0.5 text-xs"
                            >
                              <option value="percent">% Increase</option>
                              <option value="absolute">$ Increase</option>
                            </select>
                          </div>
                          <Slider
                            min={localDeltas.ticketPriceDeltaType === 'absolute' ? -10 : -50}
                            max={localDeltas.ticketPriceDeltaType === 'absolute' ? 50 : 100}
                            step={localDeltas.ticketPriceDeltaType === 'absolute' ? 1 : 1}
                            value={[localDeltas.ticketPriceDelta || 0]}
                            onValueChange={([v]) => handleParamChange('ticketPriceDelta', v)}
                            aria-label="Ticket Price Delta"
                          />
                          <div className="mt-1 text-right font-semibold text-xs">
                            {localDeltas.ticketPriceDeltaType === 'absolute'
                              ? `$${localDeltas.ticketPriceDelta || 0}`
                              : `${localDeltas.ticketPriceDelta || 0}%`}
                          </div>
                        </div>
                        {/* F&B Spend Delta */}
                        <div className="flex-1 flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs">F&B Spend</span>
                            <select
                              value={localDeltas.fbSpendDeltaType || 'percent'}
                              onChange={e => handleParamChange('fbSpendDeltaType', e.target.value as any)}
                              className="border rounded px-1 py-0.5 text-xs"
                            >
                              <option value="percent">% Increase</option>
                              <option value="absolute">$ Increase</option>
                            </select>
                          </div>
                          <Slider
                            min={localDeltas.fbSpendDeltaType === 'absolute' ? -10 : -50}
                            max={localDeltas.fbSpendDeltaType === 'absolute' ? 50 : 100}
                            step={localDeltas.fbSpendDeltaType === 'absolute' ? 1 : 1}
                            value={[localDeltas.fbSpendDelta || 0]}
                            onValueChange={([v]) => handleParamChange('fbSpendDelta', v)}
                            aria-label="F&B Spend Delta"
                          />
                          <div className="mt-1 text-right font-semibold text-xs">
                            {localDeltas.fbSpendDeltaType === 'absolute'
                              ? `$${localDeltas.fbSpendDelta || 0}`
                              : `${localDeltas.fbSpendDelta || 0}%`}
                          </div>
                        </div>
                        {/* Merchandise Spend Delta */}
                        <div className="flex-1 flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs">Merch Spend</span>
                            <select
                              value={localDeltas.merchSpendDeltaType || 'percent'}
                              onChange={e => handleParamChange('merchSpendDeltaType', e.target.value as any)}
                              className="border rounded px-1 py-0.5 text-xs"
                            >
                              <option value="percent">% Increase</option>
                              <option value="absolute">$ Increase</option>
                            </select>
                          </div>
                          <Slider
                            min={localDeltas.merchSpendDeltaType === 'absolute' ? -10 : -50}
                            max={localDeltas.merchSpendDeltaType === 'absolute' ? 50 : 100}
                            step={localDeltas.merchSpendDeltaType === 'absolute' ? 1 : 1}
                            value={[localDeltas.merchSpendDelta || 0]}
                            onValueChange={([v]) => handleParamChange('merchSpendDelta', v)}
                            aria-label="Merch Spend Delta"
                          />
                          <div className="mt-1 text-right font-semibold text-xs">
                            {localDeltas.merchSpendDeltaType === 'absolute'
                              ? `$${localDeltas.merchSpendDelta || 0}`
                              : `${localDeltas.merchSpendDelta || 0}%`}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                </div>

                {/* Section Divider */}
                {sectionDivider}

                {/* --- Suggestions Section (renovated) --- */}
                {showSuggestions && (
                  <div className="my-4 p-6 bg-blue-100 border-2 border-blue-400 rounded-xl shadow-lg flex flex-col gap-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Lightbulb className="h-6 w-6 text-blue-600" />
                      <span className="text-lg font-bold text-blue-800">Scenario Advice</span>
                    </div>
                    <ul className="mb-2 text-blue-900 text-base">
                      {Object.entries(suggestedChanges).map(([key, val]) => (
                        <li key={key} className="flex items-center justify-between py-1">
                          <span>
                            <strong>{key}:</strong> {String(Math.round(Number(val) * 10) / 10)}%
                            {key === 'attendanceGrowthPercent' && lastChangedParam === 'pricingPercent' && (
                              <span className="ml-2 text-xs text-blue-700 italic">(auto-applied price elasticity: -0.5)</span>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleAcceptSuggestions(suggestedChanges)}>
                        Accept Advice
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleDismissSuggestions}>
                        Override
                      </Button>
                    </div>
                    <div className="text-xs text-blue-700 mt-2 flex items-center gap-1">
                      <span className="font-semibold">What is price elasticity?</span>
                      <span className="ml-1">Raising prices usually reduces attendance. This model uses an elasticity of -0.5 (e.g., a 10% price increase → 5% attendance drop).</span>
                    </div>
                  </div>
                )}
                {/* --- Reset Button --- */}
                <div className="flex gap-3 justify-end mt-6">
                  <Button
                    variant="outline"
                    className="border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-2 rounded"
                    onClick={handleReset}
                  >
                    Reset All
                  </Button>
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
                  >
                    Cancel
                  </Button>
                </div>

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
              </>
            ) : (
              <ForecastDataTab />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default ScenarioEditor;