import React, { useState, useEffect, useMemo, memo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FinancialModel } from '@/lib/db';
import { ActualsPeriodEntry, RevenueStream, CostCategory } from '@/types/models';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { useUpsertActuals } from "@/hooks/useActuals";
import { sanitizeTextInput, sanitizeNumericInput } from "@/lib/security";

interface ActualsInputFormProps {
  model: FinancialModel;
  existingActuals: ActualsPeriodEntry[]; // All actuals for this model
}

// Zod schema for form validation
const actualsFormSchema = z.object({
  revenueActuals: z.record(z.string(), z.number().min(0, "Revenue must be non-negative")),
  costActuals: z.record(z.string(), z.number().min(0, "Cost must be non-negative")),
  attendanceActual: z.number().min(0, "Attendance must be non-negative").optional(),
  notes: z.string().max(500, "Notes must be 500 characters or less").optional(),
});

type ActualsFormData = z.infer<typeof actualsFormSchema>;

export const ActualsInputForm: React.FC<ActualsInputFormProps> = ({ 
    model, 
    existingActuals
}) => {
  const upsertActualsMutation = useUpsertActuals();
  const isWeekly = model.assumptions.metadata?.type === "WeeklyEvent";
  const timeUnit = isWeekly ? "Week" : "Month";
  const duration = isWeekly ? model.assumptions.metadata?.weeks || 12 : 12; // Use model duration
  
  const [selectedPeriod, setSelectedPeriod] = useState<number>(1);

  const revenueItems: RevenueStream[] = model.assumptions.revenue || [];
  const costItems: CostCategory[] = model.assumptions.costs || [];
  
  const form = useForm<ActualsFormData>({
    resolver: zodResolver(actualsFormSchema),
    defaultValues: {
      revenueActuals: {},
      costActuals: {},
      attendanceActual: undefined,
      notes: '',
    },
  });
  // Determine if MarketingBudget exists as a calculated cost
  const hasMarketingBudget = useMemo(() => {
      const marketingSetup = model.assumptions.marketing;
      if (!marketingSetup) return false;
      if (marketingSetup.allocationMode === 'channels') {
          return marketingSetup.channels.some(ch => ch.weeklyBudget > 0);
      } else {
          return (marketingSetup.totalBudget || 0) > 0;
      }
  }, [model.assumptions.marketing]);

  // Load data for the selected period when it changes
  useEffect(() => {
    const currentActual = existingActuals.find(a => a.period === selectedPeriod);
    const initialValues: ActualsFormData = {
        revenueActuals: currentActual?.revenueActuals || {},
        costActuals: currentActual?.costActuals || {},
        attendanceActual: currentActual?.attendanceActual,
        notes: currentActual?.notes || ''
    };
    form.reset(initialValues);
  }, [selectedPeriod, existingActuals, form]);

  const handleInputChange = (
      type: 'revenue' | 'cost' | 'attendance',
      key: string,
      value: string
  ) => {
    // Allow raw input during typing for natural UX
    if (type === 'attendance') {
        form.setValue('attendanceActual', value, { shouldValidate: true, shouldDirty: true });
    } else {
        const currentData = form.getValues();
        const fieldName = type === 'revenue' ? 'revenueActuals' : 'costActuals';
        form.setValue(fieldName, {
          ...currentData[fieldName],
          [key]: value
        }, { shouldValidate: true, shouldDirty: true });
    }
  };

  const handleInputBlur = (
      type: 'revenue' | 'cost' | 'attendance',
      key: string,
      value: string
  ) => {
    // Sanitize numeric input only when field loses focus
    const maxValue = type === 'attendance' ? 1000000 : 1000000000; // 1M for attendance, 1B for money
    const sanitizedValue = sanitizeNumericInput(value, 0, maxValue);

    if (type === 'attendance') {
        form.setValue('attendanceActual', sanitizedValue, { shouldValidate: true, shouldDirty: true });
    } else {
        const currentData = form.getValues();
        const fieldName = type === 'revenue' ? 'revenueActuals' : 'costActuals';
        form.setValue(fieldName, {
          ...currentData[fieldName],
          [key]: sanitizedValue
        }, { shouldValidate: true, shouldDirty: true });
    }
  };

  const handleNotesChange = (value: string) => {
    // Allow raw input during typing for natural UX - sanitize only on submit
    form.setValue('notes', value, { shouldValidate: true, shouldDirty: true });
  };

  const onSubmit = async (data: ActualsFormData) => {
    // Ensure projectId from the model exists and is a string (UUID)
    const projectId = model?.projectId;
    if (!model?.id || !projectId) { 
        console.error("[ActualsInputForm] Save failed: Model ID or Project ID missing.");
        toast.error("Error", { description: "Model or Project ID is invalid." });
        return;
    }
    
    // Sanitize all numeric values before submission
    const sanitizedRevenueActuals: Record<string, number> = {};
    Object.entries(data.revenueActuals || {}).forEach(([key, value]) => {
        sanitizedRevenueActuals[key] = sanitizeNumericInput(value, 0, 1000000000);
    });

    const sanitizedCostActuals: Record<string, number> = {};
    Object.entries(data.costActuals || {}).forEach(([key, value]) => {
        sanitizedCostActuals[key] = sanitizeNumericInput(value, 0, 1000000000);
    });

    const sanitizedAttendance = data.attendanceActual 
        ? sanitizeNumericInput(data.attendanceActual, 0, 1000000)
        : undefined;

    // Sanitize notes only on submission
    const sanitizedNotes = data.notes ? sanitizeTextInput(data.notes) : '';
    
    const actualEntry: Omit<ActualsPeriodEntry, 'id'> = {
        projectId: projectId,
        period: selectedPeriod,
        periodType: timeUnit,
        revenueActuals: sanitizedRevenueActuals,
        costActuals: sanitizedCostActuals,
        attendanceActual: sanitizedAttendance,
        notes: sanitizedNotes
    };

    upsertActualsMutation.mutate(actualEntry, {
        onSuccess: () => {
            toast.success("Success", { description: `Actuals for ${timeUnit} ${selectedPeriod} saved.` });
            form.reset(data); // Reset form state to mark as clean
        },
        onError: (error) => {
            console.error("[ActualsInputForm] Error saving actuals:", error);
            toast.error("Save Error", { description: "Could not save actuals data." });
        }
    });
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
              <div>
                  <CardTitle>Enter Actual Performance Data</CardTitle>
                  <CardDescription>Input actual revenue and costs for each period.</CardDescription>
              </div>
              {/* Period Selector */} 
              <div className="flex items-center gap-2">
                  <Label htmlFor="period-select">Select {timeUnit}:</Label>
                  <Select 
                    value={selectedPeriod.toString()} 
                    onValueChange={(value) => setSelectedPeriod(Number(value))}
                  >
                    <SelectTrigger id="period-select" className="w-[80px] h-9">
                      <SelectValue placeholder={timeUnit} />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: duration }, (_, i) => i + 1).map(periodNum => (
                        <SelectItem key={periodNum} value={periodNum.toString()}>
                          {periodNum}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
              </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            {/* Revenue Actuals Section */}
            <div className="space-y-3">
                <h4 className="font-semibold border-b pb-1">Revenue Actuals</h4>
                {revenueItems.map(item => (
                    <div key={`rev-${item.name}`} className="grid grid-cols-3 items-center gap-2">
                        <Label htmlFor={`rev-${item.name}`} className="col-span-1 text-sm">
                            {item.name}
                        </Label>
                        <Input 
                            id={`rev-${item.name}`}
                            type="text"
                            className="col-span-2 h-8"
                            value={form.watch('revenueActuals')[item.name] || ''} // Use empty string for visual 0
                            onChange={(e) => handleInputChange('revenue', item.name, e.target.value)}
                            onBlur={(e) => handleInputBlur('revenue', item.name, e.target.value)}
                            placeholder="0"
                        />
                    </div>
                ))}
            </div>

            {/* Cost Actuals Section */}
            <div className="space-y-3">
                <h4 className="font-semibold border-b pb-1">Cost Actuals</h4>
                {costItems.map(item => (
                     <div key={`cost-${item.name}`} className="grid grid-cols-3 items-center gap-2">
                        <Label htmlFor={`cost-${item.name}`} className="col-span-1 text-sm">
                            {item.name}
                        </Label>
                        <Input 
                            id={`cost-${item.name}`}
                            type="text"
                            className="col-span-2 h-8"
                            value={form.watch('costActuals')[item.name] || ''}
                            onChange={(e) => handleInputChange('cost', item.name, e.target.value)}
                            onBlur={(e) => handleInputBlur('cost', item.name, e.target.value)}
                            placeholder="0"
                        />
                    </div>
                ))}
                 {/* Add input for Marketing Budget if applicable */}
                 {hasMarketingBudget && (
                    <div key="cost-MarketingBudget" className="grid grid-cols-3 items-center gap-2">
                        <Label htmlFor="cost-MarketingBudget" className="col-span-1 text-sm">
                            Marketing Budget
                        </Label>
                        <Input 
                            id="cost-MarketingBudget"
                            type="text"
                            className="col-span-2 h-8"
                            value={form.watch('costActuals')["Marketing Budget"] || ''}
                            onChange={(e) => handleInputChange('cost', "Marketing Budget", e.target.value)}
                            onBlur={(e) => handleInputBlur('cost', "Marketing Budget", e.target.value)}
                            placeholder="0"
                        />
                    </div>
                 )}
            </div>

            {/* NEW: Attendance Actual Input (only for Weekly Events) */}
            {isWeekly && (
              <div className="md:col-span-2 space-y-2 mt-4 pt-4 border-t">
                  <h4 className="font-semibold">Attendance Actual</h4>
                   <div className="grid grid-cols-3 items-center gap-2 max-w-sm">
                        <Label htmlFor="attendanceActual" className="col-span-1 text-sm">
                            Actual Attendance
                        </Label>
                        <Input 
                            id="attendanceActual"
                            type="text"
                            className="col-span-2 h-8"
                            value={form.watch('attendanceActual') ?? ''} // Use empty string for visual 0/undefined
                            onChange={(e) => handleInputChange('attendance', 'value', e.target.value)}
                            onBlur={(e) => handleInputBlur('attendance', 'value', e.target.value)}
                            placeholder="0"
                        />
                    </div>
              </div>
            )}

            {/* Notes Section */}
            <div className="md:col-span-2 space-y-2 mt-4">
                 <Label htmlFor="notes">Notes for {timeUnit} {selectedPeriod}</Label>
                 <Textarea 
                    id="notes"
                    value={form.watch('notes') || ''}
                    onChange={(e) => handleNotesChange(e.target.value)}
                    placeholder={`Enter any relevant notes for ${timeUnit} ${selectedPeriod}...`}
                    maxLength={500}
                    rows={3}
                />
                {form.formState.errors.notes && (
                  <p className="text-sm text-red-500">{form.formState.errors.notes.message}</p>
                )}
            </div>
        </div>

        {/* Save Button */}
        <div className="mt-6 pt-6 border-t flex justify-end">
            <Button 
                type="submit"
                disabled={!form.formState.isDirty || upsertActualsMutation.isPending || !form.formState.isValid}
            >
                {upsertActualsMutation.isPending ? 'Saving...' : `Save Actuals for ${timeUnit} ${selectedPeriod}`}
            </Button>
        </div>
        </CardContent>
      </Card>
    </form>
  );
};

export default memo(ActualsInputForm); 