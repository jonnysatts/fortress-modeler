import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useForm, useFieldArray, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FinancialModel, db, updateProject } from '@/lib/db'; // Assuming update function exists or similar
import { ModelAssumptions, RevenueStream, CostCategory } from '@/types/models'; 
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrashIcon } from '@radix-ui/react-icons'; // Assuming you have icons
import { Checkbox } from "@/components/ui/checkbox"; // Add Checkbox import
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"; // Add RadioGroup import
import useStore from '@/store/useStore';

// Define standard channel types
const defaultChannelTypes = [
  "Social Media Ads",
  "Search Engine Ads (SEM)",
  "Content Marketing",
  "Email Marketing",
  "Affiliate Marketing",
  "Influencer Marketing",
  "Print Media",
  "Events/Trade Shows",
  "Referral Program",
  "Public Relations (PR)",
  "Custom",
];

// --- Zod Schema for Validation --- 
const revenueStreamSchema = z.object({
  name: z.string().min(1, "Stream name is required"),
  value: z.number().positive("Base value must be positive"),
  type: z.enum(['recurring', 'fixed', 'variable']), // Add other valid types if necessary
  frequency: z.enum(['weekly', 'monthly', 'quarterly', 'annually', 'one-time']).optional(),
});

const costCategorySchema = z.object({
  name: z.string().min(1, "Cost name is required"),
  value: z.number().nonnegative("Value cannot be negative"), // Allow 0 for costs
  type: z.enum(['recurring', 'fixed']), // Variable costs handled by COGS %
  category: z.enum(['operations', 'staffing', 'marketing', 'other']),
});

const growthModelSchema = z.object({
  type: z.enum(['linear', 'exponential', 'seasonal', 'none']), // Added 'none' as a possibility
  rate: z.number(), // Allow zero or negative?
  seasonalFactors: z.array(z.number()).optional(),
  individualRates: z.record(z.number()).optional(),
});

const marketingChannelSchema = z.object({
    id: z.string().uuid(),
    channelType: z.string().min(1, "Channel type is required"),
    name: z.string().min(1, "Channel name is required"),
    weeklyBudget: z.number().nonnegative(),
    targetAudience: z.string().optional(),
    description: z.string().optional(),
});

const marketingSetupSchema = z.object({
  allocationMode: z.enum(['channels', 'highLevel', 'none']), // Added 'none' 
  channels: z.array(marketingChannelSchema).optional(),
  totalBudget: z.number().nonnegative().optional(),
  budgetApplication: z.enum(['upfront', 'spreadEvenly', 'spreadCustom']).optional(),
  spreadDuration: z.number().int().positive().optional(),
});

const modelMetadataSchema = z.object({
  type: z.string().optional(), // Could be enum: ['WeeklyEvent', 'Monthly']
  weeks: z.number().int().positive().optional().default(12),
  initialWeeklyAttendance: z.number().int().nonnegative().optional().default(0),
  perCustomer: z.object({
    ticketPrice: z.number().nonnegative().optional().default(0),
    fbSpend: z.number().nonnegative().optional().default(0),
    merchandiseSpend: z.number().nonnegative().optional().default(0),
    onlineSpend: z.number().nonnegative().optional().default(0),
    miscSpend: z.number().nonnegative().optional().default(0),
  }).optional().default({}),
  growth: z.object({
    attendanceGrowthRate: z.number().optional().default(0),
    useCustomerSpendGrowth: z.boolean().optional().default(false),
    ticketPriceGrowth: z.number().optional().default(0),
    fbSpendGrowth: z.number().optional().default(0),
    merchandiseSpendGrowth: z.number().optional().default(0),
    onlineSpendGrowth: z.number().optional().default(0),
    miscSpendGrowth: z.number().optional().default(0),
  }).optional().default({ attendanceGrowthRate: 0, useCustomerSpendGrowth: false }),
  costs: z.object({
    fbCOGSPercent: z.number().min(0).max(100).optional().default(30),
    merchandiseCogsPercent: z.number().min(0).max(100).optional().default(40),
    staffCount: z.number().int().nonnegative().optional().default(0),
    staffCostPerPerson: z.number().nonnegative().optional().default(0),
    managementCosts: z.number().nonnegative().optional().default(0),
  }).optional().default({}),
});

// Comprehensive schema for the entire assumptions object
const assumptionsSchema = z.object({ 
    metadata: modelMetadataSchema.optional().default({ type: 'Monthly', weeks: 12 }),
    revenue: z.array(revenueStreamSchema).default([]),
    costs: z.array(costCategorySchema).default([]),
    growthModel: growthModelSchema,
    marketing: marketingSetupSchema.optional().default({ allocationMode: 'none', channels: [] }),
});

const ForecastBuilder: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [model, setModel] = useState<FinancialModel | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  // State to store the initial assumptions as a string
  const [initialAssumptionsString, setInitialAssumptionsString] = useState<string>(""); 
  const { currentProject } = useStore();

  const projectIdNum = projectId ? parseInt(projectId) : NaN;

  // Default assumptions structure
  const defaultAssumptions: ModelAssumptions = {
      revenue: [],
      costs: [],
      growthModel: { type: 'exponential', rate: 0 },
      // Base default is Monthly
      metadata: { type: 'Monthly', weeks: 0 }, 
      marketing: { allocationMode: 'channels', channels: [] }
  };
  // Specific default metadata for Weekly Events
  const defaultWeeklyEventMetadata: ModelAssumptions['metadata'] = {
      type: "WeeklyEvent",
      weeks: 12, 
      initialWeeklyAttendance: 100, 
      perCustomer: { ticketPrice: 0, fbSpend: 0, merchandiseSpend: 0, onlineSpend: 0, miscSpend: 0 },
      costs: { fbCOGSPercent: 30, merchandiseCogsPercent: 40, staffCount: 0, staffCostPerPerson: 0, managementCosts: 0 },
      growth: { attendanceGrowthRate: 0, useCustomerSpendGrowth: false, ticketPriceGrowth: 0, fbSpendGrowth: 0, merchandiseSpendGrowth: 0, onlineSpendGrowth: 0, miscSpendGrowth: 0 }
  };

  // --- Form Setup ---
  const { 
    control, 
    handleSubmit, 
    watch, 
    getValues,
    reset, // Keep reset for initialization sync
    formState: { isSubmitting, errors } // Remove dirtyFields from here
  } = useForm<ModelAssumptions>({
    resolver: zodResolver(assumptionsSchema),
    // We might not need 'values' prop with this manual dirty check, 
    // relying on reset in useEffect might be sufficient now.
    // Let's keep it for now, but can remove if causing issues.
    values: model?.assumptions || defaultAssumptions, 
    mode: "onChange", 
  });

  // Get ALL current form values
  const watchedValues = watch();

  // Log errors for debugging
  useEffect(() => {
      if (Object.keys(errors).length > 0) {
          console.log("Form Validation Errors:", errors);
      }
  }, [errors]);

  // --- Data Fetching and Initial State Setting ---
  useEffect(() => {
    const fetchModel = async () => {
      // GUARD CLAUSE: Ensure projectIdNum is valid AND currentProject is loaded and matches
      if (isNaN(projectIdNum) || !currentProject || currentProject.id !== projectIdNum) {
        console.log(`[ForecastBuilder Effect] Waiting: projectIdNum=${projectIdNum}, currentProject loaded=${!!currentProject}, project match=${currentProject?.id === projectIdNum}`);
        // Set loading true here ONLY if not already loading, 
        // or handle potential infinite loops if project never loads.
        // For now, just return and wait for parent layout/store to provide correct project.
        // If this component *should* trigger project loading, add it here.
        // setLoading(true); // Cautious about setting loading here
        return; 
      }
      
      console.log(`[ForecastBuilder Effect] Running fetch for projectId: ${projectIdNum} (Project Type: ${currentProject.productType})`);
      setLoading(true);
      setError(null);
      try {
        const models = await db.financialModels.where({ projectId: projectIdNum }).toArray();
        let modelToSet: FinancialModel | null = null;
        let assumptionsToSet: ModelAssumptions;
        
        if (models.length > 0) {
          let fetchedModel = models[0];
          // --- DATA SANITIZATION ---
          if (currentProject.productType === "WeeklyEvent" && fetchedModel.assumptions.metadata?.type !== "WeeklyEvent") {
              console.warn("[ForecastBuilder] Mismatch: Project is WeeklyEvent but model metadata is missing or incorrect. Applying default WeeklyEvent metadata.");
              fetchedModel = {
                  ...fetchedModel,
                  assumptions: {
                      ...defaultAssumptions,
                      ...fetchedModel.assumptions, 
                      metadata: { 
                          ...defaultWeeklyEventMetadata, 
                          ...(fetchedModel.assumptions.metadata || {}),
                          type: "WeeklyEvent" // Add comma here if needed, ensure this is last or has comma
                      }
                  }
              };
          }
          // --- END SANITIZATION ---
          modelToSet = fetchedModel;
          assumptionsToSet = fetchedModel.assumptions;
        } else {
          setError("No financial model found for this project. Creating default.");
          // --- CREATE DEFAULT MODEL ---
          const newModelAssumptions = currentProject.productType === "WeeklyEvent" 
              ? { ...defaultAssumptions, metadata: defaultWeeklyEventMetadata }
              : defaultAssumptions;
          
          const newModelData = {
              projectId: projectIdNum,
              name: `Default ${currentProject.productType} Model`, // Use project type in name
              assumptions: newModelAssumptions,
              createdAt: new Date(),
              updatedAt: new Date()
          };
          const newModelId = await db.financialModels.add(newModelData as FinancialModel);
          const newlyCreatedModel = await db.financialModels.get(newModelId);
          if (newlyCreatedModel) {
              modelToSet = newlyCreatedModel;
              assumptionsToSet = newlyCreatedModel.assumptions;
              setError(null); // Clear the "not found" error
          } else {
              throw new Error("Failed to retrieve newly created default model.");
          }
        }
        
        // Set model state (triggers re-render and updates 'values' prop)
        setModel(modelToSet);
        // Reset the form state AND set the initial string for comparison
        if (modelToSet) {
            console.log("Setting initial state and resetting form with:", assumptionsToSet);
            reset(assumptionsToSet); 
            setInitialAssumptionsString(JSON.stringify(assumptionsToSet));
        } else {
            reset(defaultAssumptions);
            setInitialAssumptionsString(JSON.stringify(defaultAssumptions));
        }
        
      } catch (err) {
        console.error("Error fetching or creating financial model:", err);
        setError("Failed to load or create model data.");
        setModel(null);
        // Reset the form state AND set the initial string for comparison
        reset(defaultAssumptions);
        setInitialAssumptionsString(JSON.stringify(defaultAssumptions));
      } finally {
        setLoading(false);
        console.log(`[ForecastBuilder Effect] Finished fetch for ${projectIdNum}`);
      }
    };
    
    fetchModel();
  }, [projectIdNum, reset, currentProject]); // Keep currentProject in dependencies

  // Define timeUnit and watch other values AFTER useForm
  const modelType = watch("metadata.type");
  const isWeeklyEventType = modelType === "WeeklyEvent";
  const timeUnit = isWeeklyEventType ? "Week" : "Month";
  const useSpecificGrowth = watch("metadata.growth.useCustomerSpendGrowth"); 
  const marketingAllocationMode = watch("marketing.allocationMode");
  const budgetApplication = watch("marketing.budgetApplication");

  // --- Manual Dirty Check Effect ---
  useEffect(() => {
    if (!initialAssumptionsString) {
        // Don't compare until initial state is set
        setIsDirty(false);
        return;
    }
    const currentValuesString = JSON.stringify(watchedValues);
    const dirty = currentValuesString !== initialAssumptionsString;
    // console.log("Manual Dirty Check:", dirty, "\nInitial:", initialAssumptionsString, "\nCurrent:", currentValuesString); // Verbose log if needed
    setIsDirty(dirty);
  }, [watchedValues, initialAssumptionsString]);

  // --- Field Arrays (Example for Revenue) ---
  const { fields: revenueFields, append: appendRevenue, remove: removeRevenue } = useFieldArray({
    control,
    name: "revenue"
  });
  const { fields: costFields, append: appendCost, remove: removeCost } = useFieldArray({
    control,
    name: "costs"
  });
  const { fields: channelFields, append: appendChannel, remove: removeChannel } = useFieldArray({
    control,
    name: "marketing.channels"
  });

  // --- Save Handler (updates initial string on successful save) ---
  const onSubmit: SubmitHandler<ModelAssumptions> = async (data) => {
    if (!model || !model.id) {
        toast({ variant: "destructive", title: "Error", description: "Cannot save, model not loaded." });
        return;
    }
    console.log("Saving assumptions:", data);
    try {
      // Update the assumptions field of the existing model document
      await db.financialModels.update(model.id, { assumptions: data });
      toast({ title: "Success", description: "Forecast assumptions saved." });
      // Update the initial state string to match the saved data
      setInitialAssumptionsString(JSON.stringify(data)); 
      setIsDirty(false); // Form is no longer dirty relative to saved state
    } catch (err) {
      console.error("Error saving assumptions:", err);
      toast({ variant: "destructive", title: "Save Error", description: "Could not save assumptions." });
    }
  };

  // Log the crucial watched value for debugging
  useEffect(() => {
      console.log("WATCHED metadata.type:", modelType, "-> isWeeklyEventType:", isWeeklyEventType);
  }, [modelType, isWeeklyEventType]);

  // --- Render Logic ---
  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <p className="text-red-600">Error: {error}</p>;
  }

  if (!model) {
    return <p>No model data available.</p>; // Or redirect/show create button
  }

  return (
    <form key={model?.id || 'loading'} onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
            <div className="flex justify-between items-center">
                <div>
                    <CardTitle>Forecast Builder</CardTitle>
                    <CardDescription>Define the assumptions for your financial forecast ({model.name}).</CardDescription>
                </div>
                 <Button type="submit" disabled={isSubmitting || !isDirty}>
                    {isSubmitting ? "Saving..." : "Save Assumptions"}
                </Button>
            </div>
        </CardHeader>
        <CardContent>
           <Tabs defaultValue="revenue" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-4">
                <TabsTrigger value="revenue">Revenue</TabsTrigger>
                <TabsTrigger value="costs">Costs</TabsTrigger>
                <TabsTrigger value="growth">Growth</TabsTrigger>
                <TabsTrigger value="marketing">Marketing</TabsTrigger>
            </TabsList>
            
            {/* --- Revenue Tab --- */} 
            <TabsContent value="revenue">
                <Card>
                    <CardHeader><CardTitle>Revenue Assumptions</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        
                        {/* Conditional Inputs for Weekly Event Drivers */}
                        {isWeeklyEventType && (
                             <div className="space-y-4 border p-4 rounded-md bg-secondary/30">
                                <h4 className="font-semibold mb-2">Weekly Event Drivers</h4>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4"> {/* Adjust grid */} 
                                    {/* Number of Weeks */}
                                    <div className="space-y-1">
                                        <Label htmlFor="metadataWeeks">Number of Weeks</Label>
                                        <Controller
                                            name="metadata.weeks"
                                            control={control}
                                            render={({ field }) => (
                                                <Input id="metadataWeeks" type="number" placeholder="e.g., 12" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
                                            )}
                                        />
                                        <p className="text-xs text-muted-foreground">Forecast duration.</p>
                                    </div>
                                    {/* Initial Attendance */}
                                    <div className="space-y-1">
                                        <Label htmlFor="initialWeeklyAttendance">Initial Attendance</Label>
                                        <Controller
                                            name="metadata.initialWeeklyAttendance"
                                            control={control}
                                            render={({ field }) => (
                                                <Input id="initialWeeklyAttendance" type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
                                            )}
                                        />
                                    </div>
                                    {/* Ticket Price (Per Attendee) */}
                                     <div className="space-y-1">
                                        <Label htmlFor="perCustomerTicketPrice">Ticket Price</Label>
                                        <Controller
                                            name="metadata.perCustomer.ticketPrice" // Linked to metadata
                                            control={control}
                                            render={({ field }) => (
                                                <Input id="perCustomerTicketPrice" type="number" step="0.01" placeholder="e.g., 50" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                                            )}
                                        />
                                    </div>
                                </div>
                                <h5 className="font-medium pt-4">Spend Per Attendee</h5>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4"> {/* Adjust grid */} 
                                    {/* F&B Spend */}
                                    <div className="space-y-1">
                                        <Label htmlFor="perCustomerFbSpend">F&B Spend</Label>
                                        <Controller
                                            name="metadata.perCustomer.fbSpend" // Linked to metadata
                                            control={control}
                                            render={({ field }) => (
                                                <Input id="perCustomerFbSpend" type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                                            )}
                                        />
                                    </div>
                                    {/* Merchandise Spend */}
                                     <div className="space-y-1">
                                        <Label htmlFor="perCustomerMerchSpend">Merchandise Spend</Label>
                                        <Controller
                                            name="metadata.perCustomer.merchandiseSpend" // Linked to metadata
                                            control={control}
                                            render={({ field }) => (
                                                <Input id="perCustomerMerchSpend" type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                                            )}
                                        />
                                    </div>
                                     {/* Add other per-customer spend fields if needed (Online, Misc?) */}
                                </div>
                             </div>
                        )}
                        
                        {/* Other/Custom Revenue Streams */}
                        <h4 className="font-semibold pt-4">Other / Custom Revenue Streams</h4>
                        <div className="space-y-2">
                            {revenueFields.map((field, index) => (
                                // Filter out standard per-attendee streams from this list if they exist in the array
                                // (Ideally, they shouldn't be added to the array in the first place)
                                // Example placeholder logic (adjust as needed):
                                !["Ticket Sales", "F&B Sales", "Merchandise Sales"].includes(field.name) && (
                                    <div key={field.id} className="flex items-center gap-2 border p-3 rounded bg-background">
                                        <Controller
                                            name={`revenue.${index}.name`}
                                            control={control}
                                            render={({ field }) => <Input placeholder="Stream Name (e.g., Online Sales)" {...field} className="flex-1" />}
                                        />
                                        <Controller
                                            name={`revenue.${index}.value`}
                                            control={control}
                                            render={({ field }) => <Input type="number" step="0.01" placeholder="Base Value" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} className="w-32" />}
                                        />
                                        <Controller
                                            name={`revenue.${index}.type`}
                                            control={control}
                                            render={({ field }) => (
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <SelectTrigger className="w-[150px]">
                                                        <SelectValue placeholder="Type" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="recurring">Recurring</SelectItem>
                                                        <SelectItem value="fixed">Fixed One-Time</SelectItem>
                                                        {/* Add other relevant types */}
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        />
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeRevenue(index)} className="text-destructive hover:bg-destructive/10">
                                            <TrashIcon className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )
                            ))}
                        </div>
                        <Button 
                            type="button" 
                            variant="outline" 
                            // Default for custom streams
                            onClick={() => appendRevenue({ name: '', value: 0, type: 'recurring' })} 
                        >
                            + Add Custom Revenue Stream
                        </Button>
                    </CardContent>
                </Card>
            </TabsContent>
            
            {/* --- Costs Tab --- */} 
            <TabsContent value="costs">
                 <Card>
                    <CardHeader><CardTitle>Cost Assumptions</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        {/* Variable COGS Section */}
                        <div className="space-y-3 border p-4 rounded-md bg-secondary/30">
                             <h4 className="font-semibold mb-2">Variable COGS (%)</h4>
                             <p className="text-xs text-muted-foreground">Enter Cost of Goods Sold as a percentage of the relevant revenue stream.</p>
                             <div className="grid grid-cols-2 gap-4">
                                 <div className="space-y-1">
                                     <Label htmlFor="fbCogsPercent">F&B COGS %</Label>
                                     <Controller
                                         name="metadata.costs.fbCOGSPercent" 
                                         control={control}
                                         render={({ field }) => (
                                             <Input id="fbCogsPercent" type="number" placeholder="e.g., 30" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
                                         )}
                                     />
                                 </div>
                                 <div className="space-y-1">
                                     <Label htmlFor="merchCogsPercent">Merchandise COGS %</Label>
                                     <Controller
                                         name="metadata.costs.merchandiseCogsPercent" 
                                         control={control}
                                         render={({ field }) => (
                                             <Input id="merchCogsPercent" type="number" placeholder="e.g., 40" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
                                         )}
                                     />
                                 </div>
                             </div>
                        </div>
                        
                        {/* Conditional Inputs for Weekly Event Cost Drivers */}
                        {isWeeklyEventType && (
                            <div className="space-y-3 border p-4 rounded-md bg-secondary/30">
                                <h4 className="font-semibold mb-2">Weekly Event Cost Drivers</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <Label htmlFor="staffCount">Staff Count</Label>
                                        <Controller
                                            name="metadata.costs.staffCount"
                                            control={control}
                                            render={({ field }) => (
                                                <Input id="staffCount" type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
                                            )}
                                        />
                                    </div>
                                     <div className="space-y-1">
                                        <Label htmlFor="staffCostPerPerson">Avg Cost per Staff</Label>
                                        <Controller
                                            name="metadata.costs.staffCostPerPerson"
                                            control={control}
                                            render={({ field }) => (
                                                <Input id="staffCostPerPerson" type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                                            )}
                                        />
                                    </div>
                                    {/* Add Management Costs, etc. if needed */}
                                </div>
                            </div>
                        )}
                        
                        {/* Fixed / Recurring Costs Section */}
                        <h4 className="font-semibold pt-4">Other Costs (Fixed / Recurring)</h4>
                        <div className="space-y-2">
                            {costFields.map((field, index) => (
                                <div key={field.id} className="flex items-center gap-2 border p-3 rounded bg-background">
                                    <Controller
                                        name={`costs.${index}.name`}
                                        control={control}
                                        render={({ field }) => <Input placeholder="Cost Item Name" {...field} className="flex-1" />}
                                    />
                                    <Controller
                                        name={`costs.${index}.value`}
                                        control={control}
                                        render={({ field }) => <Input type="number" step="0.01" placeholder="Value" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} className="w-32" />}
                                    />
                                    <Controller
                                        name={`costs.${index}.type`}
                                        control={control}
                                        render={({ field }) => (
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <SelectTrigger className="w-[150px]">
                                                    <SelectValue placeholder="Type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="recurring">Recurring</SelectItem>
                                                    <SelectItem value="fixed">Fixed One-Time</SelectItem>
                                                    {/* Avoid Variable here - handled by COGS % */}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                    <Controller
                                        name={`costs.${index}.category`}
                                        control={control}
                                        render={({ field }) => (
                                            <Select onValueChange={field.onChange} defaultValue={field.value} required> {/* Category is required */}
                                                <SelectTrigger className="w-[150px]">
                                                    <SelectValue placeholder="Category" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="operations">Operations</SelectItem>
                                                    <SelectItem value="staffing">Staffing</SelectItem>
                                                    <SelectItem value="marketing">Marketing</SelectItem>
                                                    <SelectItem value="other">Other</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeCost(index)} className="text-destructive hover:bg-destructive/10">
                                        <TrashIcon className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                        <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => appendCost({ name: '', value: 0, type: 'recurring', category: 'other' })} // Provide default values
                        >
                            + Add Other Cost Item
                        </Button>
                    </CardContent>
                </Card>
            </TabsContent>
            
            {/* --- Growth Tab --- */} 
            <TabsContent value="growth">
                 <Card>
                    <CardHeader><CardTitle>Growth Assumptions</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        {/* Overall Growth Model */}
                        <div className="space-y-3 border p-4 rounded-md bg-secondary/30">
                            <h4 className="font-semibold mb-2">Overall Growth Model</h4>
                            <p className="text-xs text-muted-foreground">Select a general growth model (applied if specific rates below are not used).</p>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label htmlFor="growthModelType">Growth Type</Label>
                                    <Controller
                                        name="growthModel.type"
                                        control={control}
                                        render={({ field }) => (
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <SelectTrigger id="growthModelType">
                                                    <SelectValue placeholder="Select Type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="exponential">Exponential %</SelectItem>
                                                    <SelectItem value="linear">Linear Amount</SelectItem>
                                                    <SelectItem value="seasonal">Seasonal (Not Implemented)</SelectItem> 
                                                    {/* Add 'none'? */}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="growthModelRate">Growth Rate/Amount</Label>
                                    <Controller
                                        name="growthModel.rate"
                                        control={control}
                                        render={({ field }) => (
                                            <Input id="growthModelRate" type="number" step="0.01" placeholder="e.g., 0.1 for 10%" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                                        )}
                                    />
                                </div>
                            </div>
                        </div>
                        
                        {/* Specific Growth Rates (Conditional - Weekly Event Only?) */}
                        {isWeeklyEventType && (
                            <div className="space-y-3 border p-4 rounded-md bg-secondary/30">
                                <div className="flex items-center space-x-2 mb-3">
                                    <Controller
                                        name="metadata.growth.useCustomerSpendGrowth"
                                        control={control}
                                        render={({ field }) => (
                                            <Checkbox 
                                                id="useSpecificGrowth" 
                                                checked={field.value} 
                                                onCheckedChange={field.onChange} 
                                            />
                                        )}
                                    />
                                    <Label htmlFor="useSpecificGrowth" className="font-semibold">
                                        Use Specific Growth Rates per Period?
                                    </Label>
                                </div>
                                
                                {useSpecificGrowth && (
                                    <div className="space-y-3 pl-6 border-l-2 ml-2">
                                        <p className="text-xs text-muted-foreground">Define specific percentage growth rates per week for key drivers.</p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <Label htmlFor="attendanceGrowthRate">Attendance Growth %</Label>
                                                <Controller
                                                    name="metadata.growth.attendanceGrowthRate"
                                                    control={control}
                                                    render={({ field }) => (
                                                        <Input id="attendanceGrowthRate" type="number" placeholder="e.g., 5 for 5%" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                                                    )}
                                                />
                                            </div>
                                             <div className="space-y-1">
                                                <Label htmlFor="ticketPriceGrowth">Ticket Price Growth %</Label>
                                                <Controller
                                                    name="metadata.growth.ticketPriceGrowth"
                                                    control={control}
                                                    render={({ field }) => (
                                                        <Input id="ticketPriceGrowth" type="number" placeholder="e.g., 1 for 1%" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                                                    )}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label htmlFor="fbSpendGrowth">F&B Spend Growth %</Label>
                                                <Controller
                                                    name="metadata.growth.fbSpendGrowth"
                                                    control={control}
                                                    render={({ field }) => (
                                                        <Input id="fbSpendGrowth" type="number" placeholder="e.g., 2 for 2%" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                                                    )}
                                                />
                                            </div>
                                             <div className="space-y-1">
                                                <Label htmlFor="merchSpendGrowth">Merchandise Spend Growth %</Label>
                                                <Controller
                                                    name="metadata.growth.merchandiseSpendGrowth"
                                                    control={control}
                                                    render={({ field }) => (
                                                        <Input id="merchSpendGrowth" type="number" placeholder="e.g., 1.5 for 1.5%" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                                                    )}
                                                />
                                            </div>
                                            {/* Add Online Spend Growth, Misc Spend Growth etc. if needed */} 
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
            
            {/* --- Marketing Tab --- */} 
            <TabsContent value="marketing">
                 <Card>
                    <CardHeader><CardTitle>Marketing Assumptions</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        {/* Allocation Mode Selection */}
                        <div className="space-y-2">
                           <Label>Marketing Allocation Mode</Label>
                           <Controller
                                name="marketing.allocationMode"
                                control={control}
                                render={({ field }) => (
                                    <RadioGroup 
                                        onValueChange={field.onChange} 
                                        defaultValue={field.value} 
                                        className="flex space-x-4"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="none" id="mode-none" />
                                            <Label htmlFor="mode-none">None</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="channels" id="mode-channels" />
                                            <Label htmlFor="mode-channels">Detailed Channels</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="highLevel" id="mode-highLevel" />
                                            <Label htmlFor="mode-highLevel">High-Level Budget</Label>
                                        </div>
                                    </RadioGroup>
                                )}
                            />
                        </div>

                        {/* Conditional Inputs: Detailed Channels */}
                        {marketingAllocationMode === 'channels' && (
                            <div className="space-y-3 border p-4 rounded-md bg-secondary/30">
                                <h4 className="font-semibold mb-2">Marketing Channels</h4>
                                <div className="space-y-2">
                                    {channelFields.map((field, index) => (
                                        <div key={field.id} className="flex items-center gap-2 border p-3 rounded bg-background">
                                            {/* Channel Type Select */}
                                            <Controller
                                                name={`marketing.channels.${index}.channelType`}
                                                control={control}
                                                render={({ field }) => (
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <SelectTrigger className="w-[180px]">
                                                            <SelectValue placeholder="Select Type..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {defaultChannelTypes.map(type => (
                                                                <SelectItem key={type} value={type}>{type}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                )}
                                            />
                                            {/* Channel Name Input */}
                                            <Controller
                                                name={`marketing.channels.${index}.name`}
                                                control={control}
                                                render={({ field }) => <Input placeholder="Specific Campaign/Name" {...field} className="flex-1" />}
                                            />
                                            {/* Weekly Budget Input */}
                                            <Controller
                                                name={`marketing.channels.${index}.weeklyBudget`}
                                                control={control}
                                                render={({ field }) => <Input type="number" step="0.01" placeholder="Weekly Budget" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} className="w-32" />}
                                            />
                                            {/* TODO: Add Target Audience/Description inputs if desired */}
                                            <Button type="button" variant="ghost" size="icon" onClick={() => removeChannel(index)} className="text-destructive hover:bg-destructive/10">
                                                <TrashIcon className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    // Provide default values including a default channelType
                                    onClick={() => appendChannel({ 
                                        id: crypto.randomUUID(), 
                                        channelType: defaultChannelTypes[0], // Default to first type
                                        name: '', 
                                        weeklyBudget: 0, 
                                        targetAudience: '', 
                                        description: '' 
                                    })}
                                >
                                    + Add Marketing Channel
                                </Button>
                            </div>
                        )}

                        {/* Conditional Inputs: High-Level Budget */}
                        {marketingAllocationMode === 'highLevel' && (
                            <div className="space-y-3 border p-4 rounded-md bg-secondary/30">
                                <h4 className="font-semibold mb-2">High-Level Budget</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <Label htmlFor="totalBudget">Total Marketing Budget</Label>
                                        <Controller
                                            name="marketing.totalBudget"
                                            control={control}
                                            render={({ field }) => (
                                                <Input id="totalBudget" type="number" step="0.01" placeholder="e.g., 10000" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                                            )}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="budgetApplication">Budget Application</Label>
                                        <Controller
                                            name="marketing.budgetApplication"
                                            control={control}
                                            render={({ field }) => (
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <SelectTrigger id="budgetApplication">
                                                        <SelectValue placeholder="Select Application" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="spreadEvenly">Spread Evenly</SelectItem>
                                                        <SelectItem value="upfront">Upfront (Period 1)</SelectItem>
                                                        <SelectItem value="spreadCustom">Spread Over Custom Duration</SelectItem> 
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        />
                                    </div>
                                </div>
                                {budgetApplication === 'spreadCustom' && (
                                     <div className="space-y-1 pt-2">
                                        <Label htmlFor="spreadDuration">Spread Duration ({timeUnit}s)</Label>
                                        <Controller
                                            name="marketing.spreadDuration"
                                            control={control}
                                            render={({ field }) => (
                                                <Input id="spreadDuration" type="number" placeholder={`e.g., 3 for 3 ${timeUnit}s`} {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
                                            )}
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
            
           </Tabs>
        </CardContent>
      </Card>
    </form>
  );
};

export default ForecastBuilder; 