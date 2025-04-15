/**
 * Scenarios View (Refactored)
 * 
 * This component integrates the refactored scenario module with the existing application.
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useStore from '@/store/useStore';
import { Scenario } from '@/features/scenarios/types/scenarioTypes';
import { ScenariosList, ScenarioEditor, ScenarioComparison } from '@/features/scenarios/components';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const ScenariosViewRefactored: React.FC = () => {
  const { projectId, scenarioId } = useParams<{ projectId: string; scenarioId: string }>();
  const navigate = useNavigate();
  
  // Local state
  const [isCreating, setIsCreating] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  
  // Get data and actions from store
  const {
    scenarios,
    currentScenario,
    baselineModel,
    scenarioForecastData,
    baselineForecastData,
    scenariosLoading,
    loadScenarios,
    createScenario,
    updateScenario,
    deleteScenario,
    duplicateScenario,
    setCurrentScenario,
    setBaselineModel,
    loadFinancialModel,
    toggleComparisonMode
  } = useStore(state => ({
    scenarios: state.scenarios,
    currentScenario: state.currentScenario,
    baselineModel: state.baselineModel,
    scenarioForecastData: state.scenarioForecastData,
    baselineForecastData: state.baselineForecastData,
    scenariosLoading: state.scenariosLoading,
    loadScenarios: state.loadScenarios,
    createScenario: state.createScenario,
    updateScenario: state.updateScenario,
    deleteScenario: state.deleteScenario,
    duplicateScenario: state.duplicateScenario,
    setCurrentScenario: state.setCurrentScenario,
    setBaselineModel: state.setBaselineModel,
    loadFinancialModel: state.loadFinancialModel,
    toggleComparisonMode: state.toggleComparisonMode
  }));
  
  // Load scenarios when the component mounts
  useEffect(() => {
    if (projectId) {
      loadScenarios(parseInt(projectId));
    }
  }, [projectId, loadScenarios]);
  
  // Load the current scenario when scenarioId changes
  useEffect(() => {
    if (scenarioId && scenarios.length > 0) {
      const scenario = scenarios.find(s => s.id === parseInt(scenarioId));
      if (scenario) {
        setCurrentScenario(scenario);
        
        // Load the baseline model if needed
        if (!baselineModel || baselineModel.id !== scenario.baseModelId) {
          loadFinancialModel(scenario.baseModelId).then(model => {
            if (model) {
              setBaselineModel(model);
            }
          });
        }
        
        // Set comparison mode to false when viewing a scenario
        toggleComparisonMode(false);
        setIsComparing(false);
      }
    } else if (scenarios.length > 0 && !isCreating) {
      // Clear current scenario when no scenarioId is provided
      setCurrentScenario(null);
    }
  }, [scenarioId, scenarios, setCurrentScenario, baselineModel, loadFinancialModel, setBaselineModel, toggleComparisonMode, isCreating]);
  
  // Handle scenario selection
  const handleSelectScenario = (scenario: Scenario) => {
    navigate(`/projects/${projectId}/scenarios/${scenario.id}`);
  };
  
  // Handle scenario creation
  const handleCreateScenario = () => {
    setIsCreating(true);
    
    // Load the default model for the project
    loadFinancialModel(parseInt(projectId)).then(model => {
      if (model) {
        setBaselineModel(model);
        
        // Create a new scenario with default values
        createScenario(
          parseInt(projectId),
          model.id!,
          'New Scenario',
          'Created on ' + new Date().toLocaleDateString()
        ).then(newScenario => {
          // Navigate to the new scenario
          navigate(`/projects/${projectId}/scenarios/${newScenario.id}`);
          setIsCreating(false);
        }).catch(error => {
          console.error('Error creating scenario:', error);
          toast({
            title: 'Error',
            description: 'Failed to create scenario',
            variant: 'destructive',
          });
          setIsCreating(false);
        });
      }
    });
  };
  
  // Handle scenario duplication
  const handleDuplicateScenario = async (scenarioId: number, newName: string) => {
    try {
      const duplicatedScenario = await duplicateScenario(scenarioId, newName);
      navigate(`/projects/${projectId}/scenarios/${duplicatedScenario.id}`);
    } catch (error) {
      console.error('Error duplicating scenario:', error);
      toast({
        title: 'Error',
        description: 'Failed to duplicate scenario',
        variant: 'destructive',
      });
    }
  };
  
  // Handle scenario deletion
  const handleDeleteScenario = async (scenarioId: number) => {
    try {
      await deleteScenario(scenarioId);
      
      // Navigate back to the scenarios list
      navigate(`/projects/${projectId}/scenarios`);
    } catch (error) {
      console.error('Error deleting scenario:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete scenario',
        variant: 'destructive',
      });
    }
  };
  
  // Handle scenario save
  const handleSaveScenario = async (updatedScenario: Scenario) => {
    try {
      await updateScenario(updatedScenario);
      toast({
        title: 'Success',
        description: 'Scenario saved successfully',
      });
    } catch (error) {
      console.error('Error saving scenario:', error);
      toast({
        title: 'Error',
        description: 'Failed to save scenario',
        variant: 'destructive',
      });
      throw error; // Re-throw to let the component handle the error
    }
  };
  
  // Handle cancel
  const handleCancel = () => {
    // Navigate back to the scenarios list
    navigate(`/projects/${projectId}/scenarios`);
  };
  
  // Toggle comparison mode
  const handleToggleComparison = () => {
    setIsComparing(!isComparing);
    toggleComparisonMode(!isComparing);
  };
  
  // Render the appropriate view based on the current state
  const renderContent = () => {
    if (currentScenario && baselineModel) {
      // If in comparison mode, show the comparison view
      if (isComparing) {
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <Button variant="outline" onClick={handleToggleComparison}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Editor
              </Button>
            </div>
            
            <ScenarioComparison
              scenario={currentScenario}
              baselineModel={baselineModel}
              baselineForecastData={baselineForecastData}
              scenarioForecastData={scenarioForecastData}
            />
          </div>
        );
      }
      
      // Otherwise, show the editor
      return (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <Button variant="outline" onClick={handleCancel}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Scenarios
            </Button>
            
            <Button onClick={handleToggleComparison}>
              View Detailed Comparison
            </Button>
          </div>
          
          <ScenarioEditor
            scenario={currentScenario}
            baseModel={baselineModel}
            baselineForecastData={baselineForecastData}
            scenarioForecastData={scenarioForecastData}
            onSave={handleSaveScenario}
            onCancel={handleCancel}
          />
        </div>
      );
    }
    
    // If no scenario is selected, show the list
    return (
      <ScenariosList
        scenarios={scenarios}
        loading={scenariosLoading}
        onSelect={handleSelectScenario}
        onCreate={handleCreateScenario}
        onDuplicate={handleDuplicateScenario}
        onDelete={handleDeleteScenario}
        projectId={parseInt(projectId || '0')}
        baseModelId={baselineModel?.id || 0}
      />
    );
  };
  
  return (
    <div className="container mx-auto py-6">
      {renderContent()}
    </div>
  );
};

export default ScenariosViewRefactored;
