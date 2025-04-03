import React, { useState, useEffect, useMemo } from 'react';
import { FinancialModel, ActualsPeriodEntry, upsertActualsPeriod, db } from '@/lib/db';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription, 
    DialogFooter, 
    DialogClose
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

// Type for the form state within the dialog
type PeriodActualsFormData = {
    revenueActuals: Record<string, number>;
    costActuals: Record<string, number>;
    attendanceActual?: number;
    notes?: string;
};

interface ActualsInputDialogProps {
  model: FinancialModel; 
  period: number; // The specific period (week/month number) to add/edit
  existingEntry: ActualsPeriodEntry | null; // Pass existing data if editing
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (savedEntry: ActualsPeriodEntry) => void; // Callback after saving to trigger refetch
}

export const ActualsInputDialog: React.FC<ActualsInputDialogProps> = ({ 
    model, 
    period,
    existingEntry,
    open,
    onOpenChange,
    onSave
}) => {
  const isWeekly = model.assumptions.metadata?.type === "WeeklyEvent";
  const timeUnit = isWeekly ? "Week" : "Month";
  
  const [formData, setFormData] = useState<PeriodActualsFormData>({ revenueActuals: {}, costActuals: {} });
  const [isDirty, setIsDirty] = useState(false);
  const [initialDataString, setInitialDataString] = useState<string>("");

  const revenueItems = model.assumptions.revenue || [];
  const costItems = model.assumptions.costs || [];
  
  // Log the items to be rendered
  console.log("Actuals Dialog - Revenue Items:", revenueItems);
  console.log("Actuals Dialog - Cost Items:", costItems);

  const hasMarketingBudget = useMemo(() => {
      const marketingSetup = model.assumptions.marketing;
      if (!marketingSetup) return false;
      if (marketingSetup.allocationMode === 'channels') {
          return marketingSetup.channels.some(ch => (ch.weeklyBudget ?? 0) > 0);
      } else if (marketingSetup.allocationMode === 'highLevel') {
          return (marketingSetup.totalBudget ?? 0) > 0;
      }
      return false;
  }, [model.assumptions.marketing]);

  // Load initial data when dialog opens or period/existingEntry changes
  useEffect(() => {
    if (open) {
        const initialValues: PeriodActualsFormData = {
            revenueActuals: existingEntry?.revenueActuals || {},
            costActuals: existingEntry?.costActuals || {},
            attendanceActual: existingEntry?.attendanceActual,
            notes: existingEntry?.notes || ''
        };
        setFormData(initialValues);
        setInitialDataString(JSON.stringify(initialValues));
        setIsDirty(false);
    }
  }, [open, period, existingEntry]);

  // Check for dirtiness
   useEffect(() => {
       if (!open) return; // Only check when open
       setIsDirty(JSON.stringify(formData) !== initialDataString);
   }, [formData, initialDataString, open]);

  // Define known revenue streams for WeeklyEvent
  const weeklyEventRevenueStreams = [
      "Ticket Sales", 
      "F&B Sales", 
      "Merchandise Sales", 
      "Online Sales", // Assuming these exist based on metadata structure
      "Miscellaneous Revenue"
  ];
  // Use model.assumptions.revenue for non-weekly types (if applicable later)
  const revenueItemsToDisplay = isWeekly ? weeklyEventRevenueStreams : (model.assumptions.revenue || []).map(r => r.name);

  // --- Input Handlers ---
  const handleInputChange = (
      type: 'revenue' | 'cost' | 'attendance',
      key: string,
      value: string
  ) => {
    // Allow empty input visually, but treat as 0 for state if needed
    const numValue = value === '' ? undefined : parseFloat(value);

    setFormData(prev => {
        let updatedValue = numValue;
        // Ensure non-negative values, default undefined/NaN to undefined for optional fields
        if (updatedValue !== undefined && isNaN(updatedValue)) updatedValue = undefined;
        if (updatedValue !== undefined && updatedValue < 0) updatedValue = 0;

        if (type === 'attendance') {
            return { ...prev, attendanceActual: updatedValue };
        } else {
            const fieldKey = type === 'revenue' ? 'revenueActuals' : 'costActuals';
            const updatedRecord = { ...(prev[fieldKey] || {}), [key]: updatedValue ?? 0 }; // Store 0 if undefined
            // Optional: Clean up keys if value becomes undefined again
            // if (updatedValue === undefined) delete updatedRecord[key]; 
            return {
                ...prev,
                [fieldKey]: updatedRecord
            };
        }
    });
  };

  const handleNotesChange = (value: string) => {
     setFormData(prev => ({ ...prev, notes: value }));
  };

  // --- Save Handler ---
  const handleSave = async () => {
    const projectIdNum = model?.projectId;
    if (!model?.id || typeof projectIdNum !== 'number') { 
        toast({ variant: "destructive", title: "Error", description: "Model or Project ID is invalid." });
        return;
    }
    
    const actualEntry: Omit<ActualsPeriodEntry, 'id'> = {
        projectId: projectIdNum,
        period: period,
        periodType: timeUnit,
        revenueActuals: formData.revenueActuals,
        costActuals: formData.costActuals,
        attendanceActual: formData.attendanceActual,
        notes: formData.notes
    };

    try {
        const savedEntry = await upsertActualsPeriod(actualEntry);
        if (savedEntry) {
            toast({ title: "Success", description: `Actuals for ${timeUnit} ${period} saved.` });
            onSave(savedEntry); // Pass the returned entry back
            onOpenChange(false); 
        } else {
             toast({ variant: "destructive", title: "Save Error", description: "Could not save actuals data (failed to retrieve after save)." });
        }
    } catch (error) {
        console.error("Error saving actuals:", error);
        toast({ variant: "destructive", title: "Save Error", description: "Could not save actuals data." });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Record Actuals for {timeUnit} {period}</DialogTitle>
          <DialogDescription>
            Enter the actual performance data for this period.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-y-6 py-4 max-h-[60vh] overflow-y-auto pr-2">
            {/* Revenue Actuals Section */}
            <div className="space-y-3">
                <h4 className="font-semibold border-b pb-1">Revenue Actuals</h4>
                {revenueItemsToDisplay.length === 0 && (
                    <p className="text-sm text-muted-foreground italic">No revenue streams defined for this model type.</p>
                )}
                {revenueItemsToDisplay.map(streamName => (
                    <div key={`rev-${streamName}`} className="flex items-center justify-between gap-4">
                        <Label htmlFor={`rev-${streamName}`} className="text-sm whitespace-normal">
                            {streamName} 
                        </Label>
                        <Input 
                            id={`rev-${streamName}`}
                            type="number"
                            className="h-8 w-32" 
                            value={formData.revenueActuals[streamName] ?? ''} 
                            onChange={(e) => handleInputChange('revenue', streamName, e.target.value)}
                            placeholder="0"
                            step="0.01"
                            min="0"
                        />
                    </div>
                ))}
            </div>

            {/* Cost Actuals Section */}
            <div className="space-y-3 pt-4 border-t">
                <h4 className="font-semibold border-b pb-1">Cost Actuals</h4>
                {costItems.length === 0 && !hasMarketingBudget && (
                     <p className="text-sm text-muted-foreground italic">No cost items defined in the forecast model.</p>
                )}
                 {costItems.map(item => (
                     <div key={`cost-${item.name}`} className="flex items-center justify-between gap-4">
                        <Label htmlFor={`cost-${item.name}`} className="text-sm whitespace-normal">
                            {item.name}
                        </Label>
                        <Input 
                            id={`cost-${item.name}`}
                            type="number"
                            className="h-8 w-32"
                            value={formData.costActuals[item.name] ?? ''}
                            onChange={(e) => handleInputChange('cost', item.name, e.target.value)}
                            placeholder="0"
                            step="0.01"
                            min="0"
                        />
                    </div>
                ))}
                 {hasMarketingBudget && (
                    <div key="cost-MarketingBudget" className="flex items-center justify-between gap-4">
                        <Label htmlFor="cost-MarketingBudget" className="text-sm whitespace-normal">
                            Marketing Budget
                        </Label>
                        <Input 
                            id="cost-MarketingBudget"
                            type="number"
                            className="h-8 w-32"
                            value={formData.costActuals["Marketing Budget"] ?? ''}
                            onChange={(e) => handleInputChange('cost', "Marketing Budget", e.target.value)}
                            placeholder="0"
                            step="0.01"
                            min="0"
                        />
                    </div>
                 )}
            </div>

                       {/* Attendance Input (conditional) */}
                       {isWeekly && (
              <div className="space-y-2 pt-4 border-t">
                 <Label htmlFor="attendanceActual">Actual Attendance for {timeUnit} {period}</Label>
                 {/* Ensure this Input field exists */}
                 <Input
                    id="attendanceActual"
                    type="number"
                    className="h-8 max-w-xs"
                    value={formData.attendanceActual ?? ''}
                    onChange={(e) => handleInputChange('attendance', 'value', e.target.value)}
                    placeholder="0"
                    min="0"
                 />
              </div>
            )}

            {/* Notes Section */}
            <div className="space-y-2 pt-4 border-t">
                 <Label htmlFor="notes">Notes for {timeUnit} {period}</Label>
                 <Textarea 
                    id="notes"
                    value={formData.notes ?? ''}
                    onChange={(e) => handleNotesChange(e.target.value)}
                    placeholder={`Enter any relevant notes for ${timeUnit} ${period}...`}
                    rows={3}
                />
            </div>
        </div>
        <DialogFooter>
            <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
          <Button type="button" onClick={handleSave} disabled={!isDirty}>
            Save Actuals
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 