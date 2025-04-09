import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCcw, Save } from 'lucide-react';
import { Scenario, ScenarioParameterDeltas } from '@/types/scenarios';
import { toast } from '@/components/ui/use-toast';
import useStore from '@/store/useStore';

interface ScenarioControlsProps {
  scenario: Scenario;
  localDeltas: ScenarioParameterDeltas;
  isDirty: boolean;
  onReset: () => void;
}

/**
 * ScenarioControls Component
 * Simple controls to save and reset scenario parameters
 */
const ScenarioControls: React.FC<ScenarioControlsProps> = ({
  scenario,
  localDeltas,
  isDirty,
  onReset
}) => {
  // Get the store functions
  const { updateScenario, calculateScenarioForecast } = useStore(state => ({
    updateScenario: state.updateScenario,
    calculateScenarioForecast: state.calculateScenarioForecast
  }));
  
  // Add a state to track if we're currently saving
  const [isSaving, setIsSaving] = useState(false);
  
  // Add a local copy of the dirty state to ensure buttons don't flicker
  const [localIsDirty, setLocalIsDirty] = useState(isDirty);

  // Log the dirty state for debugging
  useEffect(() => {
    console.log('ScenarioControls: isDirty =', isDirty, 'for scenario', scenario.name);
    // Only update local dirty state when external state changes to true
    // This prevents buttons from flickering if external state is inconsistent
    if (isDirty) {
      setLocalIsDirty(true);
    }
  }, [isDirty, scenario]);

  // Handle save directly
  const handleSave = async () => {
    try {
      console.log('Saving scenario with deltas:', localDeltas);
      
      // Set saving state
      setIsSaving(true);
      // Immediately disable the button by setting local state
      setLocalIsDirty(false);
      
      // Show loading toast
      toast({
        title: 'Saving...',
        description: 'Saving your scenario changes',
      });
      
      // Update timestamp
      const updatedScenario = {
        ...scenario,
        parameterDeltas: { ...localDeltas },
        updatedAt: new Date()
      };
      
      // Save to database and update store
      await updateScenario(updatedScenario);
      
      // Calculate forecast with updated data
      calculateScenarioForecast();
      
      // Dispatch a saved event to reset dirty state in parent components
      document.dispatchEvent(new CustomEvent('scenario:saved', {
        detail: { scenarioId: scenario.id }
      }));
      
      // Show success toast
      toast({
        title: 'Success',
        description: 'Scenario changes saved successfully',
      });
    } catch (error) {
      console.error('Error saving scenario:', error);
      
      // If there was an error, re-enable the buttons
      setLocalIsDirty(true);
      
      // Show error toast
      toast({
        title: 'Error',
        description: 'Failed to save scenario changes',
        variant: 'destructive',
      });
    } finally {
      // Reset saving state
      setIsSaving(false);
    }
  };
  
  // Handle reset
  const handleReset = () => {
    try {
      console.log('Resetting scenario');
      
      // Immediately disable buttons
      setLocalIsDirty(false);
      
      // Call the provided reset function
      onReset();
    } catch (error) {
      console.error('Error resetting scenario:', error);
      
      // If there was an error, re-enable the buttons
      setLocalIsDirty(true);
      
      // Show error toast
      toast({
        title: 'Error',
        description: 'Failed to reset scenario',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex space-x-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleReset}
        disabled={!localIsDirty}
      >
        <RefreshCcw className="mr-2 h-4 w-4" />
        Reset
      </Button>
      <Button
        size="sm"
        onClick={handleSave}
        disabled={!localIsDirty || isSaving}
      >
        {isSaving ? (
          <>
            <span className="mr-2 h-4 w-4 animate-spin">⟳</span>
            Saving...
          </>
        ) : (
          <>
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </>
        )}
      </Button>
    </div>
  );
};

export default ScenarioControls;
