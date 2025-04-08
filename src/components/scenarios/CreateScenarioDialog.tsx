import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';
import useStore from '@/store/useStore';

interface CreateScenarioDialogProps {
  projectId: number;
  baseModelId: number;
  onScenarioCreated?: () => void;
}

/**
 * CreateScenarioDialog Component
 * Dialog for creating a new scenario
 */
const CreateScenarioDialog: React.FC<CreateScenarioDialogProps> = ({
  projectId,
  baseModelId,
  onScenarioCreated
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  // Get createScenario function from store
  const { createScenario } = useStore(state => ({
    createScenario: state.createScenario
  }));
  
  // Handle create scenario
  const handleCreateScenario = async () => {
    if (!name.trim() || typeof createScenario !== 'function') return;
    
    try {
      setIsCreating(true);
      
      await createScenario(
        projectId,
        baseModelId,
        name.trim(),
        description.trim() || undefined
      );
      
      // Reset form and close dialog
      setName('');
      setDescription('');
      setIsOpen(false);
      
      // Call onScenarioCreated callback if provided
      if (onScenarioCreated) {
        onScenarioCreated();
      }
    } catch (error) {
      console.error('Error creating scenario:', error);
    } finally {
      setIsCreating(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Scenario
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Scenario</DialogTitle>
          <DialogDescription>
            Create a new scenario based on the current forecast model.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Scenario Name
            </label>
            <Input
              id="name"
              placeholder="e.g., Optimistic Growth"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              Description (Optional)
            </label>
            <Textarea
              id="description"
              placeholder="Describe the scenario assumptions..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button 
            onClick={handleCreateScenario}
            disabled={!name.trim() || isCreating}
          >
            {isCreating ? 'Creating...' : 'Create Scenario'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateScenarioDialog;
