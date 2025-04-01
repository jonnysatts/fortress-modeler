
import { useState } from 'react';
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
import { db } from '@/lib/db';

// Types for event-specific model
interface WeeklyRevenue {
  ticketSales: number;
  fbSales: number;
  merchandiseSales: number;
  onlineSales: number;
  miscRevenue: number;
}

interface WeeklyCosts {
  setupCosts: number;
  spreadSetupCosts: boolean;
  fbCOGSPercent: number;
  staffCount: number;
  staffCostPerPerson: number;
  managementCosts: number;
}

interface GrowthSettings {
  useBlanketed: boolean;
  blanketedRate: number;
  ticketGrowth: number;
  fbGrowth: number;
  merchandiseGrowth: number;
  onlineGrowth: number;
  miscGrowth: number;
}

// Schema for validation
const formSchema = z.object({
  name: z.string().min(1, "Model name is required"),
  weeks: z.coerce.number().int().min(1, "Must have at least one week"),
  revenue: z.object({
    ticketSales: z.coerce.number().min(0),
    fbSales: z.coerce.number().min(0),
    merchandiseSales: z.coerce.number().min(0),
    onlineSales: z.coerce.number().min(0),
    miscRevenue: z.coerce.number().min(0),
  }),
  costs: z.object({
    setupCosts: z.coerce.number().min(0),
    spreadSetupCosts: z.boolean().default(false),
    fbCOGSPercent: z.coerce.number().min(0).max(100).default(30),
    staffCount: z.coerce.number().int().min(0),
    staffCostPerPerson: z.coerce.number().min(0),
    managementCosts: z.coerce.number().min(0),
  }),
  growth: z.object({
    useBlanketed: z.boolean().default(true),
    blanketedRate: z.coerce.number().default(0),
    ticketGrowth: z.coerce.number().default(0),
    fbGrowth: z.coerce.number().default(0),
    merchandiseGrowth: z.coerce.number().default(0),
    onlineGrowth: z.coerce.number().default(0),
    miscGrowth: z.coerce.number().default(0),
  }),
});

type FormValues = z.infer<typeof formSchema>;

interface EventModelFormProps {
  projectId: number;
  projectName: string;
  onCancel: () => void;
}

const EventModelForm = ({ projectId, projectName, onCancel }: EventModelFormProps) => {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "Weekly Event Model",
      weeks: 12,
      revenue: {
        ticketSales: 0,
        fbSales: 0,
        merchandiseSales: 0,
        onlineSales: 0,
        miscRevenue: 0,
      },
      costs: {
        setupCosts: 0,
        spreadSetupCosts: false,
        fbCOGSPercent: 30,
        staffCount: 0,
        staffCostPerPerson: 0,
        managementCosts: 0,
      },
      growth: {
        useBlanketed: true,
        blanketedRate: 0,
        ticketGrowth: 0,
        fbGrowth: 0,
        merchandiseGrowth: 0,
        onlineGrowth: 0,
        miscGrowth: 0,
      },
    },
  });

  const watchUseBlanketed = form.watch("growth.useBlanketed");
  const watchFbSales = form.watch("revenue.fbSales");
  const watchFbCOGSPercent = form.watch("costs.fbCOGSPercent");

  // Calculate F&B COGS automatically based on F&B sales and percentage
  const fbCOGS = (watchFbSales * watchFbCOGSPercent) / 100;

  const onSubmit = async (data: FormValues) => {
    try {
      // Transform the event-specific data to fit the general model structure
      const revenueAssumptions = [
        { name: "Ticket Sales", value: data.revenue.ticketSales, type: "recurring" as const, frequency: "weekly" as const },
        { name: "F&B Sales", value: data.revenue.fbSales, type: "recurring" as const, frequency: "weekly" as const },
        { name: "Merchandise Sales", value: data.revenue.merchandiseSales, type: "recurring" as const, frequency: "weekly" as const },
        { name: "Online Sales", value: data.revenue.onlineSales, type: "recurring" as const, frequency: "weekly" as const },
        { name: "Miscellaneous Revenue", value: data.revenue.miscRevenue, type: "recurring" as const, frequency: "weekly" as const },
      ];

      const costAssumptions = [
        { name: "Setup Costs", value: data.costs.setupCosts, type: data.costs.spreadSetupCosts ? "recurring" as const : "fixed" as const, category: "operations" as const },
        { name: "F&B COGS", value: fbCOGS, type: "variable" as const, category: "operations" as const },
        { name: "Staff Costs", value: data.costs.staffCount * data.costs.staffCostPerPerson, type: "recurring" as const, category: "staffing" as const },
        { name: "Management Costs", value: data.costs.managementCosts, type: "recurring" as const, category: "operations" as const },
      ];

      // Create growth model
      const growthModel = {
        type: "linear" as const,
        rate: data.growth.useBlanketed ? data.growth.blanketedRate / 100 : 0,
        individualRates: !data.growth.useBlanketed ? {
          ticketSales: data.growth.ticketGrowth / 100,
          fbSales: data.growth.fbGrowth / 100,
          merchandiseSales: data.growth.merchandiseGrowth / 100,
          onlineSales: data.growth.onlineGrowth / 100,
          miscRevenue: data.growth.miscGrowth / 100,
        } : undefined,
      };

      // Add metadata for the weekly event
      const eventMetadata = {
        type: "WeeklyEvent",
        weeks: data.weeks,
        revenue: data.revenue,
        costs: data.costs,
        growth: data.growth,
      };

      // Save to database with the transformed structure
      const modelId = await db.financialModels.add({
        projectId,
        name: data.name,
        assumptions: {
          revenue: revenueAssumptions,
          costs: costAssumptions,
          growthModel,
          metadata: eventMetadata,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      toast({
        title: "Event model created",
        description: `Successfully created "${data.name}" weekly event model.`,
      });

      onCancel(); // Navigate back
    } catch (error) {
      console.error("Error creating event model:", error);
      toast({
        variant: "destructive",
        title: "Failed to create model",
        description: "There was an error creating your weekly event model.",
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
            New Weekly Event Model
          </h1>
          <p className="text-muted-foreground">
            Create a specialized event model for {projectName}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="revenue" className="w-full">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="revenue">Revenue Categories</TabsTrigger>
              <TabsTrigger value="costs">Cost Categories</TabsTrigger>
              <TabsTrigger value="growth">Growth Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="revenue" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Weekly Revenue Sources</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="revenue.ticketSales"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ticket Sales (per week)</FormLabel>
                            <FormControl>
                              <Input type="number" min={0} step={0.01} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="revenue.fbSales"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>F&B Sales (per week)</FormLabel>
                            <FormControl>
                              <Input type="number" min={0} step={0.01} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <FormField
                        control={form.control}
                        name="revenue.merchandiseSales"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Merchandise Sales (per week)</FormLabel>
                            <FormControl>
                              <Input type="number" min={0} step={0.01} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="revenue.onlineSales"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Online Sales (per week)</FormLabel>
                            <FormControl>
                              <Input type="number" min={0} step={0.01} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="revenue.miscRevenue"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Miscellaneous Revenue (per week)</FormLabel>
                            <FormControl>
                              <Input type="number" min={0} step={0.01} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
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
                              <FormLabel>Spread setup costs across all weeks</FormLabel>
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
                              Calculated F&B COGS: ${fbCOGS.toFixed(2)}
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
                      name="growth.useBlanketed"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox 
                              checked={field.value} 
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel>Use blanket growth rate for all revenue</FormLabel>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {watchUseBlanketed ? (
                      <FormField
                        control={form.control}
                        name="growth.blanketedRate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Weekly Growth Rate (%)</FormLabel>
                            <FormControl>
                              <Input type="number" step={0.1} {...field} />
                            </FormControl>
                            <FormDescription>
                              Applied to all revenue streams (e.g., 5 = 5% weekly growth)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ) : (
                      <div className="space-y-4">
                        <h4 className="text-sm font-medium">Individual Growth Rates (%)</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <FormField
                            control={form.control}
                            name="growth.ticketGrowth"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Ticket Sales Growth</FormLabel>
                                <FormControl>
                                  <Input type="number" step={0.1} {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="growth.fbGrowth"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>F&B Sales Growth</FormLabel>
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
                            name="growth.merchandiseGrowth"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Merchandise Growth</FormLabel>
                                <FormControl>
                                  <Input type="number" step={0.1} {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="growth.onlineGrowth"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Online Sales Growth</FormLabel>
                                <FormControl>
                                  <Input type="number" step={0.1} {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="growth.miscGrowth"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Misc. Revenue Growth</FormLabel>
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
              Save Model
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default EventModelForm;
