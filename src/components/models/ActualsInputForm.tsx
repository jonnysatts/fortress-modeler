import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FinancialModel, db } from '@/lib/db';
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
import { formatCurrency } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { upsertActualsPeriod } from "@/lib/db";

interface ActualsInputFormProps {
  model: FinancialModel;
  existingActuals: ActualsPeriodEntry[]; // All actuals for this model
  onActualsSaved: () => void; // Callback to trigger refetch in parent
}

type PeriodActuals = {
    revenueActuals: Record<string, number>;
    costActuals: Record<string, number>;
    attendanceActual?: number;
    notes?: string;
};

export const ActualsInputForm: React.FC<ActualsInputFormProps> = ({ 
    model, 
    existingActuals,
    onActualsSaved
}) => {
  const isWeekly = model.assumptions.metadata?.type === "WeeklyEvent";
  const timeUnit = isWeekly ? "Week" : "Month";
  const duration = isWeekly ? model.assumptions.metadata?.weeks || 12 : 12; // Use model duration
  
  const [selectedPeriod, setSelectedPeriod] = useState<number>(1);
  const [periodData, setPeriodData] = useState<PeriodActuals>({ revenueActuals: {}, costActuals: {}, attendanceActual: undefined });
  const [isDirty, setIsDirty] = useState(false);
  const [initialDataString, setInitialDataString] = useState<string>(""); // To track changes

  const revenueItems: RevenueStream[] = model.assumptions.revenue || [];
  const costItems: CostCategory[] = model.assumptions.costs || [];
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
    const initialValues: PeriodActuals = {
        revenueActuals: currentActual?.revenueActuals || {},
        costActuals: currentActual?.costActuals || {},
        attendanceActual: currentActual?.attendanceActual,
        notes: currentActual?.notes || ''
    };
    setPeriodData(initialValues);
    setInitialDataString(JSON.stringify(initialValues)); // Store initial state for dirty check
    setIsDirty(false); // Reset dirty state on period change
  }, [selectedPeriod, existingActuals]);

  // Check for dirtiness whenever periodData changes
   useEffect(() => {
       setIsDirty(JSON.stringify(periodData) !== initialDataString);
   }, [periodData, initialDataString]);

  const handleInputChange = (
      type: 'revenue' | 'cost' | 'attendance',
      key: string,
      value: string
  ) => {
    const numValue = parseFloat(value) || 0;
    if (type === 'attendance') {
        setPeriodData(prev => ({ ...prev, attendanceActual: numValue }));
    } else {
        setPeriodData(prev => ({
            ...prev,
            [type === 'revenue' ? 'revenueActuals' : 'costActuals']: {
                ...prev[type === 'revenue' ? 'revenueActuals' : 'costActuals'],
                [key]: numValue
            }
        }));
    }
  };

  const handleNotesChange = (value: string) => {
     setPeriodData(prev => ({ ...prev, notes: value }));
  };

  const handleSaveActuals = async () => {
    console.log("[ActualsInputForm] handleSaveActuals triggered."); 
    // Ensure projectId from the model exists and is a number before parsing
    const projectIdNum = model?.projectId;
    if (!model?.id || typeof projectIdNum !== 'number') { 
        console.error("[ActualsInputForm] Save failed: Model ID or valid Project ID missing.");
        toast({ variant: "destructive", title: "Error", description: "Model or Project ID is invalid." });
        return;
    }
    
    const actualEntry: Omit<ActualsPeriodEntry, 'id'> = {
        projectId: projectIdNum,
        period: selectedPeriod,
        periodType: timeUnit,
        revenueActuals: periodData.revenueActuals,
        costActuals: periodData.costActuals,
        attendanceActual: periodData.attendanceActual,
        notes: periodData.notes
    };

    console.log("[ActualsInputForm] Data prepared for upsert:", JSON.stringify(actualEntry));

    try {
        // Use the upsertActualsPeriod helper function correctly
        const savedId = await upsertActualsPeriod(actualEntry);
        console.log(`[ActualsInputForm] Upsert successful, ID: ${savedId}`);
        
        toast({ title: "Success", description: `Actuals for ${timeUnit} ${selectedPeriod} saved.` });
        setInitialDataString(JSON.stringify(periodData)); 
        setIsDirty(false);
        onActualsSaved(); 
    } catch (error) {
        console.error("[ActualsInputForm] Error saving actuals via upsertActualsPeriod:", error);
        toast({ variant: "destructive", title: "Save Error", description: "Could not save actuals data." });
    }
  };

  return (
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
                            type="number"
                            className="col-span-2 h-8"
                            value={periodData.revenueActuals[item.name] || ''} // Use empty string for visual 0
                            onChange={(e) => handleInputChange('revenue', item.name, e.target.value)}
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
                            type="number"
                            className="col-span-2 h-8"
                            value={periodData.costActuals[item.name] || ''}
                            onChange={(e) => handleInputChange('cost', item.name, e.target.value)}
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
                            type="number"
                            className="col-span-2 h-8"
                            value={periodData.costActuals["Marketing Budget"] || ''}
                            onChange={(e) => handleInputChange('cost', "Marketing Budget", e.target.value)}
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
                            type="number"
                            className="col-span-2 h-8"
                            value={periodData.attendanceActual ?? ''} // Use empty string for visual 0/undefined
                            onChange={(e) => handleInputChange('attendance', 'value', e.target.value)}
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
                    value={periodData.notes}
                    onChange={(e) => handleNotesChange(e.target.value)}
                    placeholder={`Enter any relevant notes for ${timeUnit} ${selectedPeriod}...`}
                    rows={3}
                />
            </div>
        </div>

        {/* Save Button */}
        <div className="mt-6 pt-6 border-t flex justify-end">
            <Button onClick={handleSaveActuals} disabled={!isDirty}>
                Save Actuals for {timeUnit} {selectedPeriod}
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}; 