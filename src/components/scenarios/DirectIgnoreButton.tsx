import React from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { ScenarioParameterDeltas } from '@/types/scenarios';
import { toast } from '@/components/ui/use-toast';

interface DirectIgnoreButtonProps {
  sourceParam: keyof ScenarioParameterDeltas;
  sourceValue: number;
  onDismiss: () => void;
}

/**
 * DirectIgnoreButton Component
 * A specialized button that ensures parameter changes are applied when ignoring suggestions
 */
const DirectIgnoreButton: React.FC<DirectIgnoreButtonProps> = ({
  sourceParam,
  sourceValue,
  onDismiss
}) => {
  const handleIgnore = () => {
    try {
      console.log(`Ignoring suggestions for ${sourceParam}=${sourceValue}`);
      
      // First dismiss the suggestions UI
      onDismiss();
      
      // Force a page reload to ensure everything is fresh
      setTimeout(() => {
        window.location.reload();
      }, 100);
    } catch (error) {
      console.error('Error ignoring suggestions:', error);
      
      // Show error toast
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

export default DirectIgnoreButton;
