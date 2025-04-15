/**
 * Scenarios List Component
 * 
 * This component displays a list of scenarios and provides management functions.
 */

import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Copy, MoreVertical, Plus, Trash } from 'lucide-react';
import { Scenario } from '../types/scenarioTypes';

interface ScenariosListProps {
  scenarios: Scenario[];
  loading: boolean;
  onSelect: (scenario: Scenario) => void;
  onCreate: () => void;
  onDuplicate: (scenarioId: number, newName: string) => Promise<void>;
  onDelete: (scenarioId: number) => Promise<void>;
  projectId: number;
  baseModelId: number;
}

const ScenariosList: React.FC<ScenariosListProps> = ({
  scenarios,
  loading,
  onSelect,
  onCreate,
  onDuplicate,
  onDelete,
  projectId,
  baseModelId
}) => {
  // State for dialogs
  const [duplicateScenarioName, setDuplicateScenarioName] = useState('');
  const [scenarioToDelete, setScenarioToDelete] = useState<Scenario | null>(null);
  const [scenarioToDuplicate, setScenarioToDuplicate] = useState<Scenario | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Handle delete scenario
  const handleDeleteScenario = async () => {
    if (!scenarioToDelete) return;

    try {
      setIsProcessing(true);
      await onDelete(scenarioToDelete.id!);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting scenario:', error);
    } finally {
      setIsProcessing(false);
      setScenarioToDelete(null);
    }
  };

  // Handle duplicate scenario
  const handleDuplicateScenario = async () => {
    if (!scenarioToDuplicate || !duplicateScenarioName.trim()) return;

    try {
      setIsProcessing(true);
      await onDuplicate(scenarioToDuplicate.id!, duplicateScenarioName);
      setIsDuplicateDialogOpen(false);
    } catch (error) {
      console.error('Error duplicating scenario:', error);
    } finally {
      setIsProcessing(false);
      setScenarioToDuplicate(null);
      setDuplicateScenarioName('');
    }
  };

  // Open delete dialog
  const openDeleteDialog = (scenario: Scenario) => {
    setScenarioToDelete(scenario);
    setIsDeleteDialogOpen(true);
  };

  // Open duplicate dialog
  const openDuplicateDialog = (scenario: Scenario) => {
    setScenarioToDuplicate(scenario);
    setDuplicateScenarioName(`${scenario.name} (Copy)`);
    setIsDuplicateDialogOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Scenarios</CardTitle>
            <CardDescription>
              Create and manage different business scenarios
            </CardDescription>
          </div>
          <Button onClick={onCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Create New Scenario
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : scenarios.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No scenarios found</p>
              <Button onClick={onCreate} variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Scenario
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scenarios.map((scenario) => (
                  <TableRow key={scenario.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell
                      className="font-medium"
                      onClick={() => onSelect(scenario)}
                    >
                      {scenario.name}
                    </TableCell>
                    <TableCell
                      onClick={() => onSelect(scenario)}
                    >
                      {scenario.description || '-'}
                    </TableCell>
                    <TableCell
                      onClick={() => onSelect(scenario)}
                    >
                      {new Date(scenario.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell
                      onClick={() => onSelect(scenario)}
                    >
                      {new Date(scenario.updatedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onSelect(scenario)}>
                            Edit Scenario
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openDuplicateDialog(scenario)}>
                            <Copy className="mr-2 h-4 w-4" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => openDeleteDialog(scenario)}
                            className="text-red-600"
                          >
                            <Trash className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
              Delete Scenario
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{scenarioToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteScenario}
              disabled={isProcessing}
            >
              {isProcessing ? 'Deleting...' : 'Delete Scenario'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Dialog */}
      <Dialog open={isDuplicateDialogOpen} onOpenChange={setIsDuplicateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicate Scenario</DialogTitle>
            <DialogDescription>
              Create a copy of "{scenarioToDuplicate?.name}" with a new name.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="duplicateName">New Scenario Name</Label>
            <Input
              id="duplicateName"
              value={duplicateScenarioName}
              onChange={(e) => setDuplicateScenarioName(e.target.value)}
              className="mt-1"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDuplicateDialogOpen(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDuplicateScenario}
              disabled={!duplicateScenarioName.trim() || isProcessing}
            >
              {isProcessing ? 'Creating...' : 'Create Copy'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ScenariosList;
