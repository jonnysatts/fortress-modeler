import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose
} from '@/components/ui/dialog';
import CreateScenarioDialog from './CreateScenarioDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Copy, MoreVertical, Plus, Trash } from 'lucide-react';
import { Scenario } from '@/types/scenarios';
import useStore from '@/store/useStore';
import { TypographyH4, TypographyMuted } from '@/components/ui/typography';

interface ScenariosListProps {
  scenarios: Scenario[];
  loading: boolean;
  onSelect: (scenario: Scenario) => void;
  onCreate: () => void;
  projectId: number;
  baseModelId: number;
}

/**
 * ScenariosList Component
 * Displays a list of scenarios and provides management functions
 */
const ScenariosList: React.FC<ScenariosListProps> = ({
  scenarios,
  loading,
  onSelect,
  onCreate,
  projectId,
  baseModelId
}) => {
  // State for dialogs
  const [duplicateScenarioName, setDuplicateScenarioName] = useState('');
  const [scenarioToDelete, setScenarioToDelete] = useState<Scenario | null>(null);
  const [scenarioToDuplicate, setScenarioToDuplicate] = useState<Scenario | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);

  // Get actions from store
  const { createScenario, deleteScenario, duplicateScenario } = useStore(state => ({
    createScenario: state.createScenario,
    deleteScenario: state.deleteScenario,
    duplicateScenario: state.duplicateScenario
  }));

  // Handle create scenario - now handled by CreateScenarioDialog

  // Handle delete scenario
  const handleDeleteScenario = async () => {
    if (!scenarioToDelete) return;

    await deleteScenario(scenarioToDelete.id!);

    // Reset state
    setScenarioToDelete(null);
    setIsDeleteDialogOpen(false);
  };

  // Handle duplicate scenario
  const handleDuplicateScenario = async () => {
    if (!scenarioToDuplicate || !duplicateScenarioName.trim()) return;

    await duplicateScenario(scenarioToDuplicate.id!, duplicateScenarioName.trim());

    // Reset state
    setScenarioToDuplicate(null);
    setDuplicateScenarioName('');
    setIsDuplicateDialogOpen(false);
  };

  // Render loading state
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render empty state
  if (scenarios.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Scenarios</CardTitle>
          <CardDescription>
            Create different scenarios to model business outcomes
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <TypographyH4>No Scenarios Available</TypographyH4>
          <TypographyMuted className="mt-2 mb-6">
            Create your first scenario to start modeling different business outcomes.
          </TypographyMuted>

          <Button onClick={onCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Create New Scenario
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Render scenarios list
  return (
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
                      <DropdownMenuItem
                        onClick={() => {
                          setScenarioToDuplicate(scenario);
                          setDuplicateScenarioName(`Copy of ${scenario.name}`);
                          setIsDuplicateDialogOpen(true);
                        }}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setScenarioToDelete(scenario);
                          setIsDeleteDialogOpen(true);
                        }}
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
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Scenario</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this scenario? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleDeleteScenario}
            >
              Delete
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
              Create a copy of this scenario with a new name.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="duplicate-name" className="text-sm font-medium">
                New Scenario Name
              </label>
              <Input
                id="duplicate-name"
                placeholder="e.g., Copy of Optimistic Growth"
                value={duplicateScenarioName}
                onChange={(e) => setDuplicateScenarioName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={handleDuplicateScenario}
              disabled={!duplicateScenarioName.trim()}
            >
              Duplicate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default ScenariosList;
