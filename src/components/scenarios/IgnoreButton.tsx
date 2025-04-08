import React from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { ScenarioParameterDeltas } from '@/types/scenarios';
import useStore from '@/store/useStore';

interface IgnoreButtonProps {
  sourceParam: keyof ScenarioParameterDeltas;
  sourceValue: number;
  onDismiss: () => void;
}

/**
 * IgnoreButton Component
 * A specialized button that ensures parameter changes are applied when ignoring suggestions
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
    // First dismiss the suggestions UI
    onDismiss();
    
    // Then explicitly re-apply the original parameter change
    console.log('IgnoreButton: Re-applying original change:', { param: sourceParam, value: sourceValue });
    
    // Create a proper partial object with the correct structure
    const deltaUpdate: Partial<ScenarioParameterDeltas> = { 
      [sourceParam]: sourceValue 
    };
    
    // Update the store with the original parameter change
    updateScenarioDeltas(deltaUpdate);
    
    // Force immediate recalculation
    setTimeout(() => {
      calculateScenarioForecast();
      
      // Force another recalculation after a short delay to ensure UI updates
      setTimeout(() => {
        calculateScenarioForecast();
      }, 100);
    }, 10);
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
