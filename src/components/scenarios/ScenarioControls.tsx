import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCcw, Save } from 'lucide-react';
import { Scenario, ScenarioParameterDeltas } from '@/types/scenarios';
import { toast } from '@/components/ui/use-toast';
import { db } from '@/lib/db';
import useStore from '@/store/useStore';

interface ScenarioControlsProps {
  scenario: Scenario;
  localDeltas: ScenarioParameterDeltas;
  isDirty: boolean;
  onReset: () => void;
}

/**
 * ScenarioControls Component
 * A specialized component that handles Save and Reset functionality for scenarios
 */
const ScenarioControls: React.FC<ScenarioControlsProps> = ({
  scenario,
  localDeltas,
  isDirty,
  onReset
}) => {
  // Get the store functions
  const { calculateScenarioForecast } = useStore(state => ({
    calculateScenarioForecast: state.calculateScenarioForecast
  }));

  // Handle save directly
  const handleSave = async () => {
    try {
      console.log('Saving scenario with deltas:', localDeltas);
      
      // Show loading toast
      toast({
        title: 'Saving...',
        description: 'Saving your scenario changes',
      });
      
      // Update timestamp
      const updatedScenario = {
        ...scenario,
        parameterDeltas: localDeltas,
        updatedAt: new Date()
      };
      
      // Save directly to database
      await db.scenarios.update(scenario.id!, updatedScenario);
      
      // Reload the page to ensure everything is fresh
      window.location.reload();
      
      // Show success toast
      toast({
        title: 'Success',
        description: 'Scenario changes saved successfully',
      });
    } catch (error) {
      console.error('Error saving scenario:', error);
      
      // Show error toast
      toast({
        title: 'Error',
        description: 'Failed to save scenario changes',
        variant: 'destructive',
      });
    }
  };
  
  // Handle reset directly
  const handleReset = () => {
    try {
      console.log('Resetting scenario');
      
      // Show loading toast
      toast({
        title: 'Resetting...',
        description: 'Resetting scenario to baseline values',
      });
      
      // Call the provided reset function
      onReset();
      
      // Reload the page to ensure everything is fresh
      window.location.reload();
    } catch (error) {
      console.error('Error resetting scenario:', error);
      
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
        disabled={!isDirty}
      >
        <RefreshCcw className="mr-2 h-4 w-4" />
        Reset
      </Button>
      <Button
        size="sm"
        onClick={handleSave}
        disabled={!isDirty}
      >
        <Save className="mr-2 h-4 w-4" />
        Save Changes
      </Button>
    </div>
  );
};

export default ScenarioControls;
