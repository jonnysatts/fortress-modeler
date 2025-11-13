/**
 * CategoryManagement - Admin UI for managing configurable categories
 * Allows admins to create, edit, and delete event types, cost categories, and frequencies
 * Part of Phase 2: Configurable Event Categories System
 */

import { useState } from 'react';
import { Plus, Edit2, Trash2, Save, X, Tag, DollarSign, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  useAllEventTypes,
  useCreateEventType,
  useUpdateEventType,
  useDeleteEventType,
  useAllCostCategories,
  useCreateCostCategory,
  useUpdateCostCategory,
  useDeleteCostCategory,
  useAllFrequencies,
  useCreateFrequency,
  useUpdateFrequency,
  useDeleteFrequency,
} from '@/hooks/useCategories';
import { EventType, CostCategory, Frequency } from '@/services/CategoryService';
import { toast } from 'sonner';

export default function CategoryManagement() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Category Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage event types, cost categories, and frequencies for your financial models.
          Changes here will be reflected throughout the application.
        </p>
      </div>

      <Tabs defaultValue="event-types" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="event-types" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Event Types
          </TabsTrigger>
          <TabsTrigger value="cost-categories" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Cost Categories
          </TabsTrigger>
          <TabsTrigger value="frequencies" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Frequencies
          </TabsTrigger>
        </TabsList>

        <TabsContent value="event-types">
          <EventTypesManager />
        </TabsContent>

        <TabsContent value="cost-categories">
          <CostCategoriesManager />
        </TabsContent>

        <TabsContent value="frequencies">
          <FrequenciesManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// =====================================================================
// EVENT TYPES MANAGER
// =====================================================================

function EventTypesManager() {
  const { data: eventTypes = [], isLoading } = useAllEventTypes();
  const createMutation = useCreateEventType();
  const updateMutation = useUpdateEventType();
  const deleteMutation = useDeleteEventType();

  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<EventType>>({
    value: '',
    label: '',
    description: '',
    is_recurring: false,
    requires_forecast: true,
    requires_actuals: true,
    color_scheme: '#3b82f6',
    sort_order: 100,
  });

  const handleCreate = async () => {
    if (!formData.value || !formData.label) {
      toast.error('Value and label are required');
      return;
    }

    await createMutation.mutateAsync(formData);
    setIsCreating(false);
    setFormData({
      value: '',
      label: '',
      description: '',
      is_recurring: false,
      requires_forecast: true,
      requires_actuals: true,
      color_scheme: '#3b82f6',
      sort_order: 100,
    });
  };

  const handleUpdate = async (id: string) => {
    if (!formData.value || !formData.label) {
      toast.error('Value and label are required');
      return;
    }

    await updateMutation.mutateAsync({ id, updates: formData });
    setEditingId(null);
  };

  const handleDelete = async (id: string, label: string) => {
    if (confirm(`Are you sure you want to delete "${label}"? This action cannot be undone.`)) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const startEditing = (eventType: EventType) => {
    setEditingId(eventType.id);
    setFormData(eventType);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setFormData({
      value: '',
      label: '',
      description: '',
      is_recurring: false,
      requires_forecast: true,
      requires_actuals: true,
      color_scheme: '#3b82f6',
      sort_order: 100,
    });
  };

  if (isLoading) {
    return <div>Loading event types...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Event Types</CardTitle>
          <CardDescription>
            Manage event types like weekly events, special events, and custom types
          </CardDescription>
        </div>
        <Button onClick={() => setIsCreating(true)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Event Type
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Value</TableHead>
              <TableHead>Label</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Recurring</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Order</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {eventTypes.map((eventType) => (
              <TableRow key={eventType.id}>
                <TableCell className="font-mono text-sm">{eventType.value}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {eventType.color_scheme && (
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: eventType.color_scheme }}
                      />
                    )}
                    {eventType.label}
                  </div>
                </TableCell>
                <TableCell className="max-w-xs truncate">{eventType.description || '—'}</TableCell>
                <TableCell>
                  {eventType.is_recurring ? (
                    <Badge variant="default">Yes</Badge>
                  ) : (
                    <Badge variant="secondary">No</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {eventType.is_active ? (
                    <Badge variant="default">Active</Badge>
                  ) : (
                    <Badge variant="destructive">Inactive</Badge>
                  )}
                  {eventType.is_system && <Badge variant="outline" className="ml-1">System</Badge>}
                </TableCell>
                <TableCell>{eventType.sort_order}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEditing(eventType)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    {!eventType.is_system && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(eventType.id, eventType.label)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      {/* Create/Edit Dialog */}
      <Dialog open={isCreating || editingId !== null} onOpenChange={(open) => {
        if (!open) {
          setIsCreating(false);
          cancelEditing();
        }
      }}>
        <DialogContent className="w-full max-w-[95vw] sm:max-w-md md:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isCreating ? 'Create Event Type' : 'Edit Event Type'}</DialogTitle>
            <DialogDescription>
              Define a new event type that users can select when creating projects
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="value">Value *</Label>
                <Input
                  id="value"
                  placeholder="e.g., monthly"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Lowercase, no spaces (used in code)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="label">Label *</Label>
                <Input
                  id="label"
                  placeholder="e.g., Monthly Event"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Display name shown to users
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Optional description of this event type"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <Input
                  id="color"
                  type="color"
                  value={formData.color_scheme}
                  onChange={(e) => setFormData({ ...formData, color_scheme: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sort_order">Sort Order</Label>
                <Input
                  id="sort_order"
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <Label>Recurring Event</Label>
                <p className="text-xs text-muted-foreground">
                  Check if this event type repeats regularly
                </p>
              </div>
              <Switch
                checked={formData.is_recurring}
                onCheckedChange={(checked) => setFormData({ ...formData, is_recurring: checked })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label>Requires Forecast</Label>
                  <p className="text-xs text-muted-foreground">
                    Show forecast form
                  </p>
                </div>
                <Switch
                  checked={formData.requires_forecast}
                  onCheckedChange={(checked) => setFormData({ ...formData, requires_forecast: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label>Requires Actuals</Label>
                  <p className="text-xs text-muted-foreground">
                    Show actuals form
                  </p>
                </div>
                <Switch
                  checked={formData.requires_actuals}
                  onCheckedChange={(checked) => setFormData({ ...formData, requires_actuals: checked })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsCreating(false);
              cancelEditing();
            }}>
              Cancel
            </Button>
            <Button onClick={isCreating ? handleCreate : () => handleUpdate(editingId!)}>
              {isCreating ? 'Create' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// =====================================================================
// COST CATEGORIES MANAGER (Similar structure to Event Types)
// =====================================================================

function CostCategoriesManager() {
  const { data: categories = [], isLoading } = useAllCostCategories();
  const createMutation = useCreateCostCategory();
  const updateMutation = useUpdateCostCategory();
  const deleteMutation = useDeleteCostCategory();

  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<CostCategory>>({
    value: '',
    label: '',
    description: '',
    category_type: 'expense',
    is_cogs: false,
    color_scheme: '#ef4444',
    sort_order: 100,
  });

  const handleCreate = async () => {
    if (!formData.value || !formData.label) {
      toast.error('Value and label are required');
      return;
    }

    await createMutation.mutateAsync(formData);
    setIsCreating(false);
    setFormData({
      value: '',
      label: '',
      description: '',
      category_type: 'expense',
      is_cogs: false,
      color_scheme: '#ef4444',
      sort_order: 100,
    });
  };

  const handleUpdate = async (id: string) => {
    if (!formData.value || !formData.label) {
      toast.error('Value and label are required');
      return;
    }

    await updateMutation.mutateAsync({ id, updates: formData });
    setEditingId(null);
  };

  const handleDelete = async (id: string, label: string) => {
    if (confirm(`Are you sure you want to delete "${label}"? This action cannot be undone.`)) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const startEditing = (category: CostCategory) => {
    setEditingId(category.id);
    setFormData(category);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setFormData({
      value: '',
      label: '',
      description: '',
      category_type: 'expense',
      is_cogs: false,
      color_scheme: '#ef4444',
      sort_order: 100,
    });
  };

  if (isLoading) {
    return <div>Loading cost categories...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Cost Categories</CardTitle>
          <CardDescription>
            Manage cost categories like staffing, marketing, operations, and custom categories
          </CardDescription>
        </div>
        <Button onClick={() => setIsCreating(true)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Value</TableHead>
              <TableHead>Label</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Order</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell className="font-mono text-sm">{category.value}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {category.color_scheme && (
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: category.color_scheme }}
                      />
                    )}
                    {category.label}
                  </div>
                </TableCell>
                <TableCell className="max-w-xs truncate">{category.description || '—'}</TableCell>
                <TableCell>
                  <Badge variant="outline">{category.category_type}</Badge>
                  {category.is_cogs && <Badge variant="secondary" className="ml-1">COGS</Badge>}
                </TableCell>
                <TableCell>
                  {category.is_active ? (
                    <Badge variant="default">Active</Badge>
                  ) : (
                    <Badge variant="destructive">Inactive</Badge>
                  )}
                  {category.is_system && <Badge variant="outline" className="ml-1">System</Badge>}
                </TableCell>
                <TableCell>{category.sort_order}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEditing(category)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    {!category.is_system && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(category.id, category.label)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      {/* Create/Edit Dialog */}
      <Dialog open={isCreating || editingId !== null} onOpenChange={(open) => {
        if (!open) {
          setIsCreating(false);
          cancelEditing();
        }
      }}>
        <DialogContent className="w-full max-w-[95vw] sm:max-w-md md:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isCreating ? 'Create Cost Category' : 'Edit Cost Category'}</DialogTitle>
            <DialogDescription>
              Define a new cost category for organizing expenses
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="value">Value *</Label>
                <Input
                  id="value"
                  placeholder="e.g., venue"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="label">Label *</Label>
                <Input
                  id="label"
                  placeholder="e.g., Venue Costs"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Optional description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category_type">Category Type</Label>
                <Select
                  value={formData.category_type}
                  onValueChange={(value) => setFormData({ ...formData, category_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="cogs">Cost of Goods Sold</SelectItem>
                    <SelectItem value="capital">Capital Expenditure</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <Input
                  id="color"
                  type="color"
                  value={formData.color_scheme}
                  onChange={(e) => setFormData({ ...formData, color_scheme: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <Label>COGS Category</Label>
                <p className="text-xs text-muted-foreground">
                  Check if this is a cost of goods sold category
                </p>
              </div>
              <Switch
                checked={formData.is_cogs}
                onCheckedChange={(checked) => setFormData({ ...formData, is_cogs: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsCreating(false);
              cancelEditing();
            }}>
              Cancel
            </Button>
            <Button onClick={isCreating ? handleCreate : () => handleUpdate(editingId!)}>
              {isCreating ? 'Create' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// =====================================================================
// FREQUENCIES MANAGER (Similar structure)
// =====================================================================

function FrequenciesManager() {
  const { data: frequencies = [], isLoading } = useAllFrequencies();
  const createMutation = useCreateFrequency();
  const updateMutation = useUpdateFrequency();
  const deleteMutation = useDeleteFrequency();

  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Frequency>>({
    value: '',
    label: '',
    description: '',
    interval_type: 'week',
    interval_count: 1,
    is_recurring: true,
    sort_order: 100,
  });

  const handleCreate = async () => {
    if (!formData.value || !formData.label) {
      toast.error('Value and label are required');
      return;
    }

    await createMutation.mutateAsync(formData);
    setIsCreating(false);
    setFormData({
      value: '',
      label: '',
      description: '',
      interval_type: 'week',
      interval_count: 1,
      is_recurring: true,
      sort_order: 100,
    });
  };

  const handleUpdate = async (id: string) => {
    if (!formData.value || !formData.label) {
      toast.error('Value and label are required');
      return;
    }

    await updateMutation.mutateAsync({ id, updates: formData });
    setEditingId(null);
  };

  const handleDelete = async (id: string, label: string) => {
    if (confirm(`Are you sure you want to delete "${label}"? This action cannot be undone.`)) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const startEditing = (frequency: Frequency) => {
    setEditingId(frequency.id);
    setFormData(frequency);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setFormData({
      value: '',
      label: '',
      description: '',
      interval_type: 'week',
      interval_count: 1,
      is_recurring: true,
      sort_order: 100,
    });
  };

  if (isLoading) {
    return <div>Loading frequencies...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Frequencies</CardTitle>
          <CardDescription>
            Manage frequency options like weekly, monthly, quarterly, and custom intervals
          </CardDescription>
        </div>
        <Button onClick={() => setIsCreating(true)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Frequency
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Value</TableHead>
              <TableHead>Label</TableHead>
              <TableHead>Interval</TableHead>
              <TableHead>Recurring</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Order</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {frequencies.map((frequency) => (
              <TableRow key={frequency.id}>
                <TableCell className="font-mono text-sm">{frequency.value}</TableCell>
                <TableCell>{frequency.label}</TableCell>
                <TableCell>
                  {frequency.interval_type ? (
                    `${frequency.interval_count} ${frequency.interval_type}${frequency.interval_count > 1 ? 's' : ''}`
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell>
                  {frequency.is_recurring ? (
                    <Badge variant="default">Yes</Badge>
                  ) : (
                    <Badge variant="secondary">No</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {frequency.is_active ? (
                    <Badge variant="default">Active</Badge>
                  ) : (
                    <Badge variant="destructive">Inactive</Badge>
                  )}
                  {frequency.is_system && <Badge variant="outline" className="ml-1">System</Badge>}
                </TableCell>
                <TableCell>{frequency.sort_order}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEditing(frequency)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    {!frequency.is_system && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(frequency.id, frequency.label)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      {/* Create/Edit Dialog */}
      <Dialog open={isCreating || editingId !== null} onOpenChange={(open) => {
        if (!open) {
          setIsCreating(false);
          cancelEditing();
        }
      }}>
        <DialogContent className="w-full max-w-[95vw] sm:max-w-md md:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isCreating ? 'Create Frequency' : 'Edit Frequency'}</DialogTitle>
            <DialogDescription>
              Define a new frequency option for recurring events
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="value">Value *</Label>
                <Input
                  id="value"
                  placeholder="e.g., bi-weekly"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="label">Label *</Label>
                <Input
                  id="label"
                  placeholder="e.g., Bi-Weekly"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Optional description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="interval_type">Interval Type</Label>
                <Select
                  value={formData.interval_type}
                  onValueChange={(value) => setFormData({ ...formData, interval_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Day</SelectItem>
                    <SelectItem value="week">Week</SelectItem>
                    <SelectItem value="month">Month</SelectItem>
                    <SelectItem value="quarter">Quarter</SelectItem>
                    <SelectItem value="year">Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="interval_count">Interval Count</Label>
                <Input
                  id="interval_count"
                  type="number"
                  min="1"
                  value={formData.interval_count}
                  onChange={(e) => setFormData({ ...formData, interval_count: parseInt(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground">
                  E.g., 2 for bi-weekly, 3 for quarterly
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <Label>Recurring</Label>
                <p className="text-xs text-muted-foreground">
                  Check if this frequency repeats
                </p>
              </div>
              <Switch
                checked={formData.is_recurring}
                onCheckedChange={(checked) => setFormData({ ...formData, is_recurring: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsCreating(false);
              cancelEditing();
            }}>
              Cancel
            </Button>
            <Button onClick={isCreating ? handleCreate : () => handleUpdate(editingId!)}>
              {isCreating ? 'Create' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
