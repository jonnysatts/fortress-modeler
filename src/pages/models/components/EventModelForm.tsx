import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowLeft, Save, PlusCircle, MinusCircle } from 'lucide-react';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage,
  FormDescription 
} from '@/components/ui/form';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { db, FinancialModel } from '@/lib/db';

interface PerCustomerRevenue {
  ticketPrice: number;
  fbSpend: number;
  merchandiseSpend: number;
  onlineSpend: number;
  miscSpend: number;
}

interface WeeklyCosts {
  setupCosts: number;
  spreadSetupCosts: boolean;
  fbCOGSPercent: number;
  merchCogsPercent: number;
  staffCount: number;
  staffCostPerPerson: number;
  managementCosts: number;
}

interface GrowthSettings {
  attendanceGrowthRate: number;
  useCustomerSpendGrowth: boolean;
  ticketPriceGrowth: number;
  fbSpendGrowth: number;
  merchandiseSpendGrowth: number;
  onlineSpendGrowth: number;
  miscSpendGrowth: number;
}

const formSchema = z.object({
  name: z.string().min(1, "Model name is required"),
  weeks: z.coerce.number().int().min(1, "Duration must be at least 1 week"),
  initialWeeklyAttendance: z.coerce.number().int().min(1, "Initial attendance required"),
  perCustomer: z.object({
    ticketPrice: z.coerce.number().min(0),
    fbSpend: z.coerce.number().min(0),
    merchandiseSpend: z.coerce.number().min(0),
    onlineSpend: z.coerce.number().min(0),
    miscSpend: z.coerce.number().min(0),
  }),
  costs: z.object({
    setupCosts: z.coerce.number().min(0),
    spreadSetupCosts: z.boolean(),
    fbCOGSPercent: z.coerce.number().min(0).max(100),
    merchCogsPercent: z.coerce.number().min(0).max(100),
    staffCount: z.coerce.number().int().min(0),
    staffCostPerPerson: z.coerce.number().min(0),
    managementCosts: z.coerce.number().min(0),
  }),
  growth: z.object({
    attendanceGrowthRate: z.coerce.number(),
    useCustomerSpendGrowth: z.boolean(),
    ticketPriceGrowth: z.coerce.number(),
    fbSpendGrowth: z.coerce.number(),
    merchandiseSpendGrowth: z.coerce.number(),
    onlineSpendGrowth: z.coerce.number(),
    miscSpendGrowth: z.coerce.number(),
  }),
});

type FormValues = z.infer<typeof formSchema>;

interface EventModelFormProps {
  projectId: number;
  projectName: string;
  existingModel?: FinancialModel;
  onCancel: () => void;
}

const EventModelForm = ({ projectId, projectName, existingModel, onCancel }: EventModelFormProps) => {
  // Define default structures clearly
  const defaultPerCustomer: PerCustomerRevenue = {
    ticketPrice: 0,
    fbSpend: 0,
    merchandiseSpend: 0,
    onlineSpend: 0,
    miscSpend: 0,
  };
  const defaultCosts: WeeklyCosts = {
    setupCosts: 0,
    spreadSetupCosts: false,
    fbCOGSPercent: 30, // Default to 30
    merchCogsPercent: 0, // Default to 0 initially
    staffCount: 0,
    staffCostPerPerson: 0,
    managementCosts: 0,
  };
  const defaultGrowth: GrowthSettings = {
    attendanceGrowthRate: 0,
    useCustomerSpendGrowth: false,
    ticketPriceGrowth: 0,
    fbSpendGrowth: 0,
    merchandiseSpendGrowth: 0,
    onlineSpendGrowth: 0,
    miscSpendGrowth: 0,
  };

  // Use loaded metadata, falling back to defaults more carefully
  const loadedMetadata = existingModel?.assumptions?.metadata as any; // Keep as any for flexibility for now

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: existingModel?.name || "Weekly Event Model",
      weeks: loadedMetadata?.weeks ?? 12,
      initialWeeklyAttendance: loadedMetadata?.initialWeeklyAttendance ?? 100,
      // Merge defaults with loaded data for nested objects
      perCustomer: {
        ...defaultPerCustomer,
        ...(loadedMetadata?.perCustomer || {}),
      },
      costs: {
        ...defaultCosts,
        ...(loadedMetadata?.costs || {}),
        // Ensure boolean type for checkbox
        spreadSetupCosts: !!loadedMetadata?.costs?.spreadSetupCosts,
      },
      growth: {
        ...defaultGrowth,
        ...(loadedMetadata?.growth || {}),
      },
    },
  });

  const watchInitialAttendance = form.watch("initialWeeklyAttendance");
  const watchPerCustomer = form.watch("perCustomer");
  const watchFbCOGSPercent = form.watch("costs.fbCOGSPercent");
  const watchUseCustomerSpendGrowth = form.watch("growth.useCustomerSpendGrowth");

  const calculateWeeklyRevenue = () => {
    return {
      ticketSales: watchInitialAttendance * watchPerCustomer.ticketPrice,
      fbSales: watchInitialAttendance * watchPerCustomer.fbSpend,
      merchandiseSales: watchInitialAttendance * watchPerCustomer.merchandiseSpend,
      onlineSales: watchInitialAttendance * watchPerCustomer.onlineSpend,
      miscRevenue: watchInitialAttendance * watchPerCustomer.miscSpend,
    };
  };

  const weeklyRevenue = calculateWeeklyRevenue();
  
  const fbCOGS = (weeklyRevenue.fbSales * watchFbCOGSPercent) / 100;
  const merchCOGS = (weeklyRevenue.merchandiseSales * form.watch("costs.merchCogsPercent")) / 100;

  const onSubmit = async (data: FormValues) => {
    try {
      const weeklyRevenue = {
        ticketSales: data.initialWeeklyAttendance * data.perCustomer.ticketPrice,
        fbSales: data.initialWeeklyAttendance * data.perCustomer.fbSpend, 
        merchandiseSales: data.initialWeeklyAttendance * data.perCustomer.merchandiseSpend,
        onlineSales: data.initialWeeklyAttendance * data.perCustomer.onlineSpend,
        miscRevenue: data.initialWeeklyAttendance * data.perCustomer.miscSpend,
      };

      const revenueAssumptions = [
        { name: "Ticket Sales", value: weeklyRevenue.ticketSales, type: "recurring" as const, frequency: "weekly" as const },
        { name: "F&B Sales", value: weeklyRevenue.fbSales, type: "recurring" as const, frequency: "weekly" as const },
        { name: "Merchandise Sales", value: weeklyRevenue.merchandiseSales, type: "recurring" as const, frequency: "weekly" as const },
        { name: "Online Sales", value: weeklyRevenue.onlineSales, type: "recurring" as const, frequency: "weekly" as const },
        { name: "Miscellaneous Revenue", value: weeklyRevenue.miscRevenue, type: "recurring" as const, frequency: "weekly" as const },
      ];

      const setupCostType = data.costs.spreadSetupCosts ? "recurring" as const : "fixed" as const;
      
      const costAssumptions = [
        { name: "Setup Costs", value: data.costs.setupCosts, type: setupCostType, category: "operations" as const },
        { name: "F&B COGS", value: fbCOGS, type: "variable" as const, category: "operations" as const },
        { name: "Merch COGS", value: merchCOGS, type: "variable" as const, category: "operations" as const },
        { name: "Staff Costs", value: data.costs.staffCount * data.costs.staffCostPerPerson, type: "recurring" as const, category: "staffing" as const },
        { name: "Management Costs", value: data.costs.managementCosts, type: "recurring" as const, category: "operations" as const },
      ];

      const growthModel = {
        type: "linear" as const,
        rate: data.growth.attendanceGrowthRate / 100,
        individualRates: data.growth.useCustomerSpendGrowth ? {
          ticketPrice: data.growth.ticketPriceGrowth / 100,
          fbSpend: data.growth.fbSpendGrowth / 100,
          merchandiseSpend: data.growth.merchandiseSpendGrowth / 100,
          onlineSpend: data.growth.onlineSpendGrowth / 100,
          miscSpend: data.growth.miscSpendGrowth / 100,
        } : undefined,
      };

      const eventMetadata = {
        type: "WeeklyEvent",
        weeks: data.weeks,
        initialWeeklyAttendance: data.initialWeeklyAttendance,
        perCustomer: data.perCustomer,
        costs: { // Ensure all cost fields from form are included
          setupCosts: data.costs.setupCosts,
          spreadSetupCosts: !!data.costs.spreadSetupCosts,
          fbCOGSPercent: data.costs.fbCOGSPercent,
          merchCogsPercent: data.costs.merchCogsPercent,
          staffCount: data.costs.staffCount,
          staffCostPerPerson: data.costs.staffCostPerPerson,
          managementCosts: data.costs.managementCosts,
        },
        growth: data.growth,
      };

      // Log the metadata just before saving
      console.log("[EventModelForm] Saving eventMetadata:", JSON.stringify(eventMetadata, null, 2));

      const modelData = {
         projectId,
         name: data.name,
         assumptions: {
           // Keep revenue/costs arrays if they are used elsewhere, 
           // but primary assumptions live in metadata for WeeklyEvent
           revenue: [], // Or potentially map from weekly calculation if needed?
           costs: [],   // Or potentially map from weekly calculation if needed?
           growthModel, // Simplified growth model
           metadata: eventMetadata, // Detailed assumptions
         },
         updatedAt: new Date(),
      };

      // Log the full model data being saved/updated
      console.log("[EventModelForm] Full modelData for DB operation:", JSON.stringify(modelData, null, 2));

      if (existingModel && existingModel.id) {
        await db.financialModels.update(existingModel.id, modelData);
        toast({
          title: "Event model updated",
          description: `Successfully updated "${data.name}" weekly event model.`,
        });
      } else {
        await db.financialModels.add({
          ...modelData,
          createdAt: new Date(),
        });
        toast({
          title: "Event model created",
          description: `Successfully created "${data.name}" weekly event model.`,
        });
      }

      onCancel();
    } catch (error) {
      console.error("Error saving event model:", error);
      toast({
        variant: "destructive",
        title: existingModel ? "Failed to update model" : "Failed to create model",
        description: "There was an error saving your weekly event model.",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-fortress-blue">
            {existingModel ? `Edit: ${existingModel.name}` : "New Weekly Event Model"}
          </h1>
          <p className="text-muted-foreground">
            {existingModel ? "Update" : "Create"} a specialized event model for {projectName}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Model Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Model Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Weekly Event Model" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="weeks"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of Weeks</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} {...field} />
                      </FormControl>
                      <FormDescription>
                        The duration of the event series in weeks
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="initialWeeklyAttendance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Initial Weekly Attendance</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} {...field} />
                      </FormControl>
                      <FormDescription>
                        Expected weekly customer count
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="revenue" className="w-full">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="revenue">Customer Revenue</TabsTrigger>
              <TabsTrigger value="costs">Cost Categories</TabsTrigger>
              <TabsTrigger value="growth">Growth Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="revenue" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Per-Customer Revenue Sources</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="perCustomer.ticketPrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ticket Price (per customer)</FormLabel>
                            <FormControl>
                              <Input type="number" min={0} step={0.01} {...field} />
                            </FormControl>
                            <FormDescription>
                              Projected weekly revenue: ${(watchInitialAttendance * field.value).toFixed(2)}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="perCustomer.fbSpend"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>F&B Spend (per customer)</FormLabel>
                            <FormControl>
                              <Input type="number" min={0} step={0.01} {...field} />
                            </FormControl>
                            <FormDescription>
                              Projected weekly revenue: ${(watchInitialAttendance * field.value).toFixed(2)}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <FormField
                        control={form.control}
                        name="perCustomer.merchandiseSpend"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Merchandise Spend (per customer)</FormLabel>
                            <FormControl>
                              <Input type="number" min={0} step={0.01} {...field} />
                            </FormControl>
                            <FormDescription>
                              Projected weekly revenue: ${(watchInitialAttendance * field.value).toFixed(2)}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="perCustomer.onlineSpend"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Online Spend (per customer)</FormLabel>
                            <FormControl>
                              <Input type="number" min={0} step={0.01} {...field} />
                            </FormControl>
                            <FormDescription>
                              Projected weekly revenue: ${(watchInitialAttendance * field.value).toFixed(2)}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="perCustomer.miscSpend"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Miscellaneous Spend (per customer)</FormLabel>
                            <FormControl>
                              <Input type="number" min={0} step={0.01} {...field} />
                            </FormControl>
                            <FormDescription>
                              Projected weekly revenue: ${(watchInitialAttendance * field.value).toFixed(2)}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Card className="bg-muted/50 border-dashed">
                      <CardContent className="pt-6">
                        <h3 className="text-lg font-medium mb-2">Weekly Revenue Summary</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Tickets</p>
                            <p className="text-lg font-medium">${weeklyRevenue.ticketSales.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">F&B</p>
                            <p className="text-lg font-medium">${weeklyRevenue.fbSales.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Merchandise</p>
                            <p className="text-lg font-medium">${weeklyRevenue.merchandiseSales.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Online</p>
                            <p className="text-lg font-medium">${weeklyRevenue.onlineSales.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Misc</p>
                            <p className="text-lg font-medium">${weeklyRevenue.miscRevenue.toFixed(2)}</p>
                          </div>
                          <div className="md:col-span-2 lg:col-span-5 pt-2 border-t">
                            <p className="text-sm text-muted-foreground">Total Weekly Revenue</p>
                            <p className="text-xl font-bold">
                              ${(
                                weeklyRevenue.ticketSales +
                                weeklyRevenue.fbSales +
                                weeklyRevenue.merchandiseSales +
                                weeklyRevenue.onlineSales +
                                weeklyRevenue.miscRevenue
                              ).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="costs" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Cost Categories</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <FormField
                          control={form.control}
                          name="costs.setupCosts"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Initial Setup Costs</FormLabel>
                              <FormControl>
                                <Input type="number" min={0} step={0.01} {...field} />
                              </FormControl>
                              <FormMessage />
                              <FormDescription>
                                One-time costs that apply only to the first week unless spread
                              </FormDescription>
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="flex items-end space-x-2">
                        <FormField
                          control={form.control}
                          name="costs.spreadSetupCosts"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                              <FormControl>
                                <Checkbox 
                                  checked={field.value} 
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div>
                                <FormLabel>Spread setup costs across all weeks</FormLabel>
                                <FormDescription>
                                  When checked, setup costs will be divided evenly across all weeks
                                </FormDescription>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="costs.fbCOGSPercent"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>F&B COGS Percentage</FormLabel>
                            <FormControl>
                              <Input type="number" min={0} max={100} step={0.1} {...field} />
                            </FormControl>
                            <FormDescription>
                              Calculated Weekly F&B COGS: ${((calculateWeeklyRevenue().fbSales * field.value) / 100).toFixed(2)}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="costs.merchCogsPercent"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Merchandise COGS Percentage</FormLabel>
                            <FormControl>
                              <Input type="number" min={0} max={100} step={0.1} {...field} />
                            </FormControl>
                            <FormDescription>
                              Calculated Weekly Merch COGS: ${((calculateWeeklyRevenue().merchandiseSales * field.value) / 100).toFixed(2)}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="costs.staffCount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Staff Count (per event)</FormLabel>
                            <FormControl>
                              <Input type="number" min={0} step={1} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="costs.staffCostPerPerson"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cost per Staff Member</FormLabel>
                            <FormControl>
                              <Input type="number" min={0} step={0.01} {...field} />
                            </FormControl>
                            <FormDescription>
                              Total weekly staff cost: ${(form.watch("costs.staffCount") * form.watch("costs.staffCostPerPerson")).toFixed(2)}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div>
                      <FormField
                        control={form.control}
                        name="costs.managementCosts"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Weekly Management Costs</FormLabel>
                            <FormControl>
                              <Input type="number" min={0} step={0.01} {...field} />
                            </FormControl>
                            <FormDescription>
                              Ongoing weekly costs for management and miscellaneous expenses
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="growth" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Growth Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <FormField
                      control={form.control}
                      name="growth.attendanceGrowthRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Weekly Attendance Growth Rate (%)</FormLabel>
                          <FormControl>
                            <Input type="number" step={0.1} {...field} />
                          </FormControl>
                          <FormDescription>
                            Applied to weekly attendance (e.g., 5 = 5% weekly attendance growth)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="growth.useCustomerSpendGrowth"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox 
                              checked={field.value} 
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel>Enable per-customer spend growth rates</FormLabel>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {watchUseCustomerSpendGrowth && (
                      <div className="space-y-4 pl-6 border-l-2 border-muted">
                        <h4 className="text-sm font-medium">Customer Spend Growth Rates (%)</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <FormField
                            control={form.control}
                            name="growth.ticketPriceGrowth"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Ticket Price Growth</FormLabel>
                                <FormControl>
                                  <Input type="number" step={0.1} {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="growth.fbSpendGrowth"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>F&B Spend Growth</FormLabel>
                                <FormControl>
                                  <Input type="number" step={0.1} {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <FormField
                            control={form.control}
                            name="growth.merchandiseSpendGrowth"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Merchandise Spend Growth</FormLabel>
                                <FormControl>
                                  <Input type="number" step={0.1} {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="growth.onlineSpendGrowth"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Online Spend Growth</FormLabel>
                                <FormControl>
                                  <Input type="number" step={0.1} {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="growth.miscSpendGrowth"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Misc. Spend Growth</FormLabel>
                                <FormControl>
                                  <Input type="number" step={0.1} {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button type="submit" className="bg-fortress-emerald hover:bg-fortress-emerald/90">
              <Save className="mr-2 h-4 w-4" />
              {existingModel ? "Update" : "Save"} Model
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default EventModelForm;
