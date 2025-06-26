import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Globe, Lock } from 'lucide-react';
import { apiService } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PublicPrivateToggleProps {
  projectId: string;
  isPublic?: boolean;
  onToggle?: (isPublic: boolean) => void;
  size?: 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
}

export function PublicPrivateToggle({ 
  projectId, 
  isPublic = false, 
  onToggle, 
  size = 'md',
  showLabel = false,
  className 
}: PublicPrivateToggleProps) {
  const [isToggling, setIsToggling] = useState(false);
  const [currentState, setCurrentState] = useState(isPublic);

  const handleToggle = async (newState: boolean) => {
    setIsToggling(true);
    try {
      await apiService.updateProjectVisibility(projectId, newState);
      setCurrentState(newState);
      onToggle?.(newState);
      toast.success(
        newState 
          ? 'Project is now public and visible to all users' 
          : 'Project is now private and only visible to you'
      );
    } catch (error) {
      console.error('Failed to update project visibility:', error);
      toast.error('Failed to update project visibility');
    } finally {
      setIsToggling(false);
    }
  };

  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex items-center gap-1">
        {currentState ? (
          <Globe className={cn(iconSize, 'text-blue-600')} />
        ) : (
          <Lock className={cn(iconSize, 'text-gray-600')} />
        )}
        {showLabel && (
          <Label 
            htmlFor={`visibility-${projectId}`}
            className={cn(textSize, 'cursor-pointer', currentState ? 'text-blue-600' : 'text-gray-600')}
          >
            {currentState ? 'Public' : 'Private'}
          </Label>
        )}
      </div>
      <Switch
        id={`visibility-${projectId}`}
        checked={currentState}
        onCheckedChange={handleToggle}
        disabled={isToggling}
        className={size === 'sm' ? 'scale-75' : ''}
      />
    </div>
  );
}