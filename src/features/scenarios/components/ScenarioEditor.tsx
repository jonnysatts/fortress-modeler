/**
 * Scenario Editor Component
 *
 * This component provides a UI for editing scenario parameters.
 */

import React, { useEffect } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Scenario } from '../types/scenarioTypes';
import { FinancialModel } from '@/lib/db';
import { useHotkeys } from 'react-hotkeys-hook';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

// Import tab components
import { MarketingTab, PricingTab, AttendanceTab, CostsTab } from './editor';

// Import chart and summary components
import ScenarioChart from './ScenarioChart';
import ScenarioSummaryTable from './ScenarioSummaryTable';

// Import custom hooks
import { useScenarioEditor } from '../hooks';

interface ScenarioEditorProps {
  scenario: Scenario | null;
  baseModel: FinancialModel | null;
  baselineForecastData: any[];
  scenarioForecastData: any[];
  onSave: (updatedScenario: Scenario) => Promise<void>;
  onCancel: () => void;
  isNew?: boolean;
}

const ScenarioEditor: React.FC<ScenarioEditorProps> = ({
  scenario,
  baseModel,
  baselineForecastData,
  scenarioForecastData,
  onSave,
  onCancel,
  isNew = false
}) => {
  const navigate = useNavigate();

  // Use the scenario editor hook
  const {
    localDeltas,
    isDirty,
    isSaving,
    activeTab,
    hasUnsavedChanges,
    handleParamChange,
    handleChannelParamChange,
    handleSave,
    handleReset,
    handleCancel,
    setActiveTab
  } = useScenarioEditor({
    scenario,
    onSave,
    onCancel
  });

  // Set up hotkeys
  useHotkeys('mod+s', (e) => {
    e.preventDefault();
    if (isDirty && !isSaving) {
      handleSave();
    }
  }, [isDirty, isSaving, handleSave]);

  useHotkeys('escape', () => {
    handleCancel();
  }, [handleCancel]);

  // Prompt user before leaving if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Handle loading state
  if (!scenario || !baseModel) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="p-8">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-muted-foreground">Loading scenario data...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">{isNew ? 'Create New Scenario' : 'Edit Scenario'}</h1>
          <p className="text-muted-foreground">
            Adjust parameters to see how they affect the financial forecast
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button variant="outline" onClick={handleReset} disabled={!isDirty || isSaving}>
            Reset
          </Button>
          <Button onClick={handleSave} disabled={!isDirty || isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Scenario Parameters</CardTitle>
              <CardDescription>
                Adjust parameters to see how they affect the forecast
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="space-y-4 mb-4">
                <div>
                  <Label htmlFor="name">Scenario Name</Label>
                  <Input
                    id="name"
                    value={scenario.name}
                    onChange={(e) => {
                      // This would need to be handled separately
                      // as it's not part of the parameter deltas
                    }}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Input
                    id="description"
                    value={scenario.description || ''}
                    onChange={(e) => {
                      // This would need to be handled separately
                      // as it's not part of the parameter deltas
                    }}
                    className="mt-1"
                  />
                </div>
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4 mb-4">
                  <TabsTrigger value="marketing" className="text-xs">Marketing</TabsTrigger>
                  <TabsTrigger value="pricing" className="text-xs">Pricing</TabsTrigger>
                  <TabsTrigger value="attendance" className="text-xs">Attendance</TabsTrigger>
                  <TabsTrigger value="costs" className="text-xs">Costs</TabsTrigger>
                </TabsList>

                <TabsContent value="marketing" className="space-y-4">
                  <MarketingTab
                    baseModel={baseModel}
                    localDeltas={localDeltas}
                    onParamChange={handleParamChange}
                    onChannelParamChange={handleChannelParamChange}
                  />
                </TabsContent>

                <TabsContent value="pricing" className="space-y-4">
                  <PricingTab
                    baseModel={baseModel}
                    localDeltas={localDeltas}
                    onParamChange={handleParamChange}
                  />
                </TabsContent>

                <TabsContent value="attendance" className="space-y-4">
                  <AttendanceTab
                    baseModel={baseModel}
                    localDeltas={localDeltas}
                    onParamChange={handleParamChange}
                  />
                </TabsContent>

                <TabsContent value="costs" className="space-y-4">
                  <CostsTab
                    baseModel={baseModel}
                    localDeltas={localDeltas}
                    onParamChange={handleParamChange}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>

            <CardFooter className={cn(
              "flex justify-between",
              isDirty ? "bg-amber-50 dark:bg-amber-950/20" : ""
            )}>
              {isDirty ? (
                <div className="text-sm text-amber-600 dark:text-amber-400">
                  Unsaved Changes
                </div>
              ) : (
                <div></div>
              )}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleReset} disabled={!isDirty || isSaving}>
                  Reset
                </Button>
                <Button size="sm" onClick={handleSave} disabled={!isDirty || isSaving}>
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Scenario Impact</CardTitle>
              <CardDescription>
                See how your changes affect the financial forecast
              </CardDescription>
            </CardHeader>

            <CardContent className="p-0">
              <ScenarioChart
                baselineData={baselineForecastData}
                scenarioData={scenarioForecastData}
                height={300}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Financial Summary</CardTitle>
              <CardDescription>
                Comparison between baseline and scenario
              </CardDescription>
            </CardHeader>

            <CardContent>
              <ScenarioSummaryTable
                baselineData={baselineForecastData}
                scenarioData={scenarioForecastData}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ScenarioEditor;
