import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TypographyH4, TypographyMuted } from '@/components/ui/typography';
import { Scenario } from '@/types/scenarios';
import useStore from '@/store/useStore';
import ScenariosList from '@/components/scenarios/ScenariosList';
import ScenarioEditor from '@/components/scenarios/ScenarioEditor';
import ScenarioComparison from '@/components/scenarios/ScenarioComparison';
import { AlertTriangle } from 'lucide-react';

/**
 * ScenariosView Component
 * Main component for the Scenarios tab
 */
const ScenariosView: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [activeTab, setActiveTab] = useState<string>('scenarios');

  // Get data and actions from store
  const {
    scenarios,
    currentScenario,
    baselineModel,
    scenariosLoading,
    loadScenarios,
    loadModelsForProject,
    setBaselineModel,
    setCurrentScenario
  } = useStore(state => ({
    scenarios: state.scenarios || [],
    currentScenario: state.currentScenario,
    baselineModel: state.baselineModel,
    scenariosLoading: state.scenariosLoading || false,
    loadScenarios: state.loadScenarios,
    loadModelsForProject: state.loadModelsForProject,
    setBaselineModel: state.setBaselineModel,
    setCurrentScenario: state.setCurrentScenario
  }));

  // Load scenarios and models when component mounts
  useEffect(() => {
    if (projectId) {
      const projectIdNum = parseInt(projectId);

      // Load models and set baseline model
      loadModelsForProject(projectIdNum).then(models => {
        if (models.length > 0) {
          if (typeof setBaselineModel === 'function') {
            setBaselineModel(models[0]);
          } else {
            console.warn('setBaselineModel is not a function');
          }
        }
      });

      // Load scenarios if the function exists
      if (typeof loadScenarios === 'function') {
        loadScenarios(projectIdNum).catch(error => {
          console.error('Error loading scenarios:', error);
        });
      }
    }

    // Clear current scenario when component unmounts
    return () => {
      if (typeof setCurrentScenario === 'function') {
        setCurrentScenario(null);
      }
    };
  }, [projectId, loadModelsForProject, loadScenarios, setBaselineModel, setCurrentScenario]);

  // Handle scenario selection
  const handleScenarioSelect = (scenario: Scenario) => {
    if (typeof setCurrentScenario === 'function') {
      setCurrentScenario(scenario);
      setActiveTab('editor');
    }
  };

  // Handle scenario save
  const handleSaveScenario = async (updatedScenario: Scenario) => {
    try {
      if (typeof useStore.getState().updateScenario === 'function') {
        await useStore.getState().updateScenario(updatedScenario);
        if (typeof setCurrentScenario === 'function') {
          setCurrentScenario(updatedScenario);
        }
        console.log('[ScenariosView] Scenario saved successfully', updatedScenario);
      } else {
        console.error('[ScenariosView] updateScenario is not a function');
      }
    } catch (error) {
      console.error('[ScenariosView] Error saving scenario', error);
    }
  };

  // Handle cancel (return to scenario list)
  const handleCancel = () => {
    setActiveTab('scenarios');
  };

  // If no baseline model is available, show a message
  if (!baselineModel) {
    return (
      <div className="py-8 text-center">
        <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
        <TypographyH4>No Baseline Model Available</TypographyH4>
        <TypographyMuted className="mt-2">
          A baseline financial model is required to create scenarios.
          Please create a financial model first.
        </TypographyMuted>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <TypographyH4>Scenarios</TypographyH4>
          <TypographyMuted>
            Create and compare different business scenarios
          </TypographyMuted>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
          <TabsTrigger value="editor" disabled={!currentScenario}>Scenario Editor</TabsTrigger>
          <TabsTrigger value="comparison" disabled={!currentScenario}>Comparison</TabsTrigger>
        </TabsList>

        <TabsContent value="scenarios" className="space-y-6">
          <ScenariosList
            scenarios={scenarios}
            loading={scenariosLoading}
            onSelect={handleScenarioSelect}
            onCreate={async () => {
              if (!baselineModel || !projectId) {
                console.error('[ScenariosView] Cannot create scenario: missing baselineModel or projectId');
                return;
              }
              try {
                const name = `New Scenario ${scenarios.length + 1}`;
                const description = `Created on ${new Date().toLocaleDateString()}`;
                const createdScenario = await useStore.getState().createScenario(
                  parseInt(projectId),
                  baselineModel.id,
                  name,
                  description
                );
                if (typeof setCurrentScenario === 'function') {
                  setCurrentScenario(createdScenario);
                }
                setActiveTab('editor');
                console.log('[ScenariosView] Scenario created and editor tab activated', createdScenario);
              } catch (error) {
                console.error('[ScenariosView] Error creating scenario', error);
              }
            }}
            projectId={parseInt(projectId || '0')}
            baseModelId={baselineModel?.id || 0}
          />
        </TabsContent>

        <TabsContent value="editor" className="space-y-6">
          {(() => {
            console.log('[ScenariosView] scenarios:', scenarios);
            console.log('[ScenariosView] currentScenario:', currentScenario);
            console.log('[ScenariosView] baselineModel:', baselineModel);
            return null;
          })()}
          {currentScenario ? (
            <ScenarioEditor
              scenario={currentScenario}
              baseModel={baselineModel}
              onSave={handleSaveScenario}
              onCancel={handleCancel}
            />
          ) : (
            <div className="py-8 text-center">
              <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
              <TypographyH4>No Scenario Selected</TypographyH4>
              <TypographyMuted className="mt-2">
                Please select a scenario to edit or create a new one.
              </TypographyMuted>
            </div>
          )}
        </TabsContent>

        <TabsContent value="comparison" className="space-y-6">
          {currentScenario ? (
            <ScenarioComparison
              scenario={currentScenario}
              baselineModel={baselineModel}
            />
          ) : (
            <div className="py-8 text-center">
              <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
              <TypographyH4>No Scenario Selected</TypographyH4>
              <TypographyMuted className="mt-2">
                Please select a scenario to compare with the baseline.
              </TypographyMuted>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ScenariosView;
