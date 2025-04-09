import React from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { ScenarioParameterDeltas } from '@/types/scenarios';
import useStore from '@/store/useStore';
import { toast } from '@/components/ui/use-toast';

interface IgnoreButtonProps {
  sourceParam: keyof ScenarioParameterDeltas;
  sourceValue: number;
  onDismiss: () => void;
}

/**
 * IgnoreButton Component
 * A simplified button that ensures parameter changes are preserved when ignoring suggestions
 */
const IgnoreButton: React.FC<IgnoreButtonProps> = ({
  sourceParam,
  sourceValue,
  onDismiss
}) => {
  const { updateScenarioDeltas, calculateScenarioForecast } = useStore(state => ({
    updateScenarioDeltas: state.updateScenarioDeltas,
    calculateScenarioForecast: state.calculateScenarioForecast
  }));

  const handleIgnore = () => {
    try {
      // Log for debugging
      console.log(`IgnoreButton: Keeping parameter ${sourceParam} value ${sourceValue}`);
      
      // First dismiss the suggestions UI
      onDismiss();
      
      // Then explicitly ensure the parameter value is set in store
      // This is the simplest approach - just make sure the parameter value is what we expect
      const update = { [sourceParam]: sourceValue };
      updateScenarioDeltas(update);
      
      // Recalculate once to ensure UI updates
      calculateScenarioForecast();
      
      // Notify user
      toast({
        title: 'Parameter Applied',
        description: `Applied ${sourceParam} change of ${sourceValue > 0 ? '+' : ''}${sourceValue}%`,
      });
    } catch (error) {
      console.error('Error applying parameter change:', error);
      toast({
        title: 'Error',
        description: 'Failed to apply parameter change',
        variant: 'destructive',
      });
    }
  };

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleIgnore}
      className="h-8 px-2 text-xs"
    >
      <X className="h-3 w-3 mr-1" />
      Ignore
    </Button>
  );
};

export default IgnoreButton;
