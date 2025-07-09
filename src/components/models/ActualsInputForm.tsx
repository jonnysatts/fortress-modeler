import React, { useState, useEffect, useMemo, memo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { FinancialModel } from '@/lib/db';
import { ActualsPeriodEntry, RevenueStream, CostCategory } from '@/types/models';
import { calculateFbCOGS, calculateExpectedMarketingSpend } from '@/lib/weekly-revenue-calculator';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Settings } from 'lucide-react';

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
  useFbCogsPercentage: z.boolean().default(false),
  useMerchandiseCogsPercentage: z.boolean().default(false),
  useMarketingPlan: z.boolean().default(false),
});

type ActualsFormData = z.infer<typeof actualsFormSchema>;

export const ActualsInputForm: React.FC<ActualsInputFormProps> = ({ 
    model, 
    existingActuals
}) => {
  const upsertActualsMutation = useUpsertActuals();
  const navigate = useNavigate();
  const { projectId } = useParams();
  const isWeekly = model.assumptions.metadata?.type === "WeeklyEvent";
  const timeUnit = isWeekly ? "Week" : "Month";
  const duration = isWeekly ? model.assumptions.metadata?.weeks || 12 : 12; // Use model duration
  
  const [selectedPeriod, setSelectedPeriod] = useState<number>(1);
  const [useFbCogsPercentage, setUseFbCogsPercentage] = useState<boolean>(false);
  const [useMerchandiseCogsPercentage, setUseMerchandiseCogsPercentage] = useState<boolean>(false);
  const [useMarketingPlan, setUseMarketingPlan] = useState<boolean>(false);

  const revenueItems: RevenueStream[] = model.assumptions.revenue || [];
  const costItems: CostCategory[] = model.assumptions.costs || [];
  
  const form = useForm<ActualsFormData>({
    resolver: zodResolver(actualsFormSchema),
    defaultValues: {
      revenueActuals: {},
      costActuals: {},
      attendanceActual: undefined,
      notes: '',
      useFbCogsPercentage: false,
      useMarketingPlan: false,
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

  const marketingSetupStatus = useMemo(() => {
      const marketingSetup = model.assumptions.marketing;
      if (!marketingSetup) return 'not_configured';
      if (marketingSetup.allocationMode === 'channels') {
          if (!marketingSetup.channels || marketingSetup.channels.length === 0) return 'no_channels';
          if (!marketingSetup.channels.some(ch => ch.weeklyBudget > 0)) return 'no_budget';
          return 'configured';
      } else {
          if ((marketingSetup.totalBudget || 0) <= 0) return 'no_budget';
          return 'configured';
      }
  }, [model.assumptions.marketing]);

  // Get F&B COGS percentage and F&B revenue from model for percentage calculation
  const fbCogsPercentage = useMemo(() => {
    return model.assumptions.metadata?.costs?.fbCOGSPercent || 30;
  }, [model.assumptions.metadata?.costs?.fbCOGSPercent]);

  const fbRevenue = useMemo(() => {
    return form.watch('revenueActuals')['F&B Sales'] || 0;
  }, [form.watch('revenueActuals')['F&B Sales']]);

  const calculatedFbCogs = useMemo(() => {
    return calculateFbCOGS(fbRevenue, fbCogsPercentage);
  }, [fbRevenue, fbCogsPercentage]);

  // Get expected marketing spend for current week
  const expectedMarketingSpend = useMemo(() => {
    return calculateExpectedMarketingSpend(
      model.assumptions.marketing,
      selectedPeriod,
      duration
    );
  }, [model.assumptions.marketing, selectedPeriod, duration]);

  // Auto-update F&B COGS when using percentage mode and F&B revenue changes
  useEffect(() => {
    if (useFbCogsPercentage && fbRevenue >= 0) {
      const calculatedValue = Math.round(calculatedFbCogs);
      form.setValue('costActuals', {
        ...form.getValues('costActuals'),
        'F&B COGS': calculatedValue
      }, { shouldValidate: true, shouldDirty: true });
    }
  }, [fbRevenue, useFbCogsPercentage, calculatedFbCogs, form]);

  // Auto-update Marketing Budget when using plan mode
  useEffect(() => {
    if (useMarketingPlan && expectedMarketingSpend >= 0) {
      const roundedValue = Math.round(expectedMarketingSpend);
      form.setValue('costActuals', {
        ...form.getValues('costActuals'),
        'Marketing Budget': roundedValue
      }, { shouldValidate: true, shouldDirty: true });
    }
  }, [useMarketingPlan, expectedMarketingSpend, form]);

  // Load data for the selected period when it changes
  useEffect(() => {
    const currentActual = existingActuals.find(a => a.period === selectedPeriod);
    const initialValues: ActualsFormData = {
        revenueActuals: currentActual?.revenueActuals || {},
        costActuals: currentActual?.costActuals || {},
        attendanceActual: currentActual?.attendanceActual,
        notes: currentActual?.notes || '',
        useFbCogsPercentage: currentActual?.useFbCogsPercentage || false,
        useMarketingPlan: currentActual?.useMarketingPlan || false
    };
    form.reset(initialValues);
    setUseFbCogsPercentage(currentActual?.useFbCogsPercentage || false);
    setUseMarketingPlan(currentActual?.useMarketingPlan || false);
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
        notes: sanitizedNotes,
        useFbCogsPercentage: useFbCogsPercentage,
        useMarketingPlan: useMarketingPlan
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
                {costItems.map(item => {
                  // Special handling for F&B COGS
                  if (item.name === 'F&B COGS') {
                    return (
                      <div key={`cost-${item.name}`} className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id={`use-percentage-${item.name}`}
                            checked={useFbCogsPercentage}
                            onCheckedChange={(checked) => {
                              setUseFbCogsPercentage(checked as boolean);
                              form.setValue('useFbCogsPercentage', checked as boolean);
                              // When switching to percentage, calculate and set the value
                              if (checked) {
                                const calculatedValue = Math.round(calculatedFbCogs);
                                form.setValue('costActuals', {
                                  ...form.getValues('costActuals'),
                                  [item.name]: calculatedValue
                                });
                              }
                            }}
                          />
                          <Label htmlFor={`use-percentage-${item.name}`} className="text-sm">
                            Use {fbCogsPercentage}% from model
                          </Label>
                        </div>
                        <div className="grid grid-cols-3 items-center gap-2">
                          <Label htmlFor={`cost-${item.name}`} className="col-span-1 text-sm">
                            {item.name}
                          </Label>
                          <Input 
                            id={`cost-${item.name}`}
                            type="text"
                            className="col-span-2 h-8"
                            value={useFbCogsPercentage ? Math.round(calculatedFbCogs).toString() : (form.watch('costActuals')[item.name] || '')}
                            onChange={(e) => !useFbCogsPercentage && handleInputChange('cost', item.name, e.target.value)}
                            onBlur={(e) => !useFbCogsPercentage && handleInputBlur('cost', item.name, e.target.value)}
                            placeholder="0"
                            disabled={useFbCogsPercentage}
                          />
                        </div>
                        {useFbCogsPercentage && (
                          <p className="text-xs text-muted-foreground ml-1">
                            Calculated: {fbCogsPercentage}% of F&B Revenue (${Math.round(fbRevenue)})
                          </p>
                        )}
                      </div>
                    );
                  }
                  
                  // Regular cost items
                  return (
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
                  );
                })}
                 {/* Marketing Actuals - Always show with smart prompting */}
                 <div key="cost-MarketingBudget" className="space-y-2">
                    <Label className="text-sm font-medium">Marketing Actuals</Label>
                    
                    {hasMarketingBudget ? (
                      // Show normal functionality when marketing budget is configured
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="use-marketing-plan"
                            checked={useMarketingPlan}
                            onCheckedChange={(checked) => {
                              setUseMarketingPlan(checked as boolean);
                              form.setValue('useMarketingPlan', checked as boolean);
                              // When switching to plan mode, calculate and set the value
                              if (checked) {
                                const calculatedValue = Math.round(expectedMarketingSpend);
                                form.setValue('costActuals', {
                                  ...form.getValues('costActuals'),
                                  'Marketing Budget': calculatedValue
                                });
                              }
                            }}
                          />
                          <Label htmlFor="use-marketing-plan" className="text-sm">
                            Use planned amount (${Math.round(expectedMarketingSpend)} for {timeUnit} {selectedPeriod})
                          </Label>
                        </div>
                        <div className="grid grid-cols-3 items-center gap-2">
                            <Label htmlFor="cost-MarketingBudget" className="col-span-1 text-sm">
                                Marketing Budget
                            </Label>
                            <Input 
                                id="cost-MarketingBudget"
                                type="text"
                                className="col-span-2 h-8"
                                value={useMarketingPlan ? Math.round(expectedMarketingSpend).toString() : (form.watch('costActuals')["Marketing Budget"] || '')}
                                onChange={(e) => !useMarketingPlan && handleInputChange('cost', "Marketing Budget", e.target.value)}
                                onBlur={(e) => !useMarketingPlan && handleInputBlur('cost', "Marketing Budget", e.target.value)}
                                placeholder="0"
                                disabled={useMarketingPlan}
                            />
                        </div>
                        {useMarketingPlan && (
                          <p className="text-xs text-muted-foreground ml-1">
                            {model.assumptions.marketing?.allocationMode === 'channels' 
                              ? `Sum of all channel weekly budgets`
                              : `${model.assumptions.marketing?.budgetApplication || 'spreadEvenly'} allocation from total budget`
                            }
                          </p>
                        )}
                      </div>
                    ) : (
                      // Show smart prompt when no marketing budget configured
                      <div className="border border-dashed border-gray-300 rounded-lg p-4 text-center bg-gray-50">
                        <Settings className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600 mb-2">
                          {marketingSetupStatus === 'not_configured' && 'No marketing budget configured for this model'}
                          {marketingSetupStatus === 'no_channels' && 'Marketing setup started but no channels added'}
                          {marketingSetupStatus === 'no_budget' && 'Marketing channels set up but no budget amounts allocated'}
                        </p>
                        <p className="text-xs text-gray-500 mb-3">
                          {marketingSetupStatus === 'not_configured' && 'Set up marketing budget to track planned vs actual marketing spend'}
                          {marketingSetupStatus === 'no_channels' && 'Add marketing channels with budget amounts to enable actuals tracking'}
                          {marketingSetupStatus === 'no_budget' && 'Set budget amounts for your marketing channels to enable actuals tracking'}
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate(`/projects/${projectId}/models/${model.id}?tab=setup`)}
                          className="text-sm"
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Configure Marketing Budget
                        </Button>
                      </div>
                    )}
                 </div>
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