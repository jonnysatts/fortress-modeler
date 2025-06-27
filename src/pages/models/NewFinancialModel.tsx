import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RevenueAssumption, CostAssumption } from "@/lib/db";
import { useProject } from "@/hooks/useProjects";
import { useCreateModel } from "@/hooks/useModels";
import { toast } from "@/hooks/use-toast";
import EventModelForm from "./components/EventModelForm";

// Default revenue assumption
const defaultRevenueAssumption: RevenueAssumption = {
  name: "",
  value: 0,
  type: "recurring",
  frequency: "monthly",
};

// Default cost assumption
const defaultCostAssumption: CostAssumption = {
  name: "",
  value: 0,
  type: "fixed",
  category: "operations",
};

// Zod schemas for validation
const revenueAssumptionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  value: z.coerce.number().min(0, "Value must be positive"),
  type: z.enum(["recurring", "fixed", "variable"]),
  frequency: z.enum(["monthly", "quarterly", "annually", "one-time"]),
});

const costAssumptionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  value: z.coerce.number().min(0, "Value must be positive"),
  type: z.enum(["recurring", "fixed", "variable"]),
  category: z.enum(["staffing", "marketing", "operations", "other"]),
});

const formSchema = z.object({
  name: z.string().min(1, "Model name is required"),
  growthModelType: z.enum(["linear", "exponential", "seasonal"]),
  growthRate: z.coerce.number().min(0, "Growth rate must be positive").default(0.1),
  seasonalFactors: z.string().optional(),
  revenueAssumptions: z.array(revenueAssumptionSchema).min(1, "At least one revenue stream is required."),
  costAssumptions: z.array(costAssumptionSchema).min(1, "At least one cost is required."),
});

type FormValues = z.infer<typeof formSchema>;

const NewFinancialModel = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { data: currentProject, isLoading: projectLoading } = useProject(projectId);
  const createModel = useCreateModel();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      growthModelType: "linear",
      growthRate: 0.1,
      seasonalFactors: "",
      revenueAssumptions: [{ ...defaultRevenueAssumption, name: "Monthly Subscription" }],
      costAssumptions: [{ ...defaultCostAssumption, name: "Cloud Infrastructure" }],
    },
  });

  const { fields: revenueFields, append: appendRevenue, remove: removeRevenue } = useFieldArray({
    control: form.control,
    name: "revenueAssumptions",
  });

  const { fields: costFields, append: appendCost, remove: removeCost } = useFieldArray({
    control: form.control,
    name: "costAssumptions",
  });

  const onSubmit = async (data: FormValues) => {
    if (!projectId || projectLoading || !currentProject || !currentProject.id) {
      toast({
        variant: "destructive",
        title: "Project not loaded",
        description: "Could not create a model because the project data is missing.",
      });
      return;
    }

    try {
      // Handle submission based on product type
      if (currentProject.productType === "WeeklyEvent") {
        // The event model form will handle its own submission
        return;
      }

      // Parse seasonal factors if provided
      let seasonalFactorsArray: number[] | undefined = undefined;
      if (data.growthModelType === "seasonal" && data.seasonalFactors) {
        try {
          seasonalFactorsArray = data.seasonalFactors
            .split(",")
            .map((factor) => parseFloat(factor.trim()))
            .filter((factor) => !isNaN(factor));
        } catch (error) {
          console.error("Error parsing seasonal factors:", error);
          toast({
            variant: "destructive",
            title: "Invalid seasonal factors",
            description:
              "Please enter valid numbers separated by commas (e.g., 1.1, 0.9, 1.2, 0.8).",
          });
          return;
        }
      }

      // Create growth model based on type
      const growthModel = {
        type: data.growthModelType,
        rate: data.growthRate,
        seasonalFactors: seasonalFactorsArray,
      };

      await createModel.mutateAsync({
        projectId: currentProject.id,
        name: data.name,
        assumptions: {
          revenue: data.revenueAssumptions,
          costs: data.costAssumptions,
          growthModel,
        },
      });

      navigate(`/projects/${projectId}`);
    } catch (error) {
      console.error("Error creating financial model:", error);
      toast({
        variant: "destructive",
        title: "Failed to create model",
        description: "There was an error creating the financial model.",
      });
    }
  };

  if (projectLoading || !currentProject) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="h-10 w-10 border-4 border-fortress-emerald border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Check if this is a weekly event project
  if (currentProject.productType === "WeeklyEvent") {
    return (
      <EventModelForm 
        projectId={Number(projectId)} 
        projectName={currentProject.name} 
        onCancel={() => navigate(`/projects/${projectId}`)}
      />
    );
  }

  // Default form for other product types
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`/projects/${projectId}`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-fortress-blue">
            New Financial Model
          </h1>
          <p className="text-muted-foreground">
            Create a financial model for {currentProject.name}
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
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Model Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Base Financial Model" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Tabs defaultValue="revenue" className="w-full">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="revenue">Revenue Assumptions</TabsTrigger>
              <TabsTrigger value="costs">Cost Assumptions</TabsTrigger>
              <TabsTrigger value="growth">Growth Model</TabsTrigger>
            </TabsList>

            <TabsContent value="revenue" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Assumptions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {revenueFields.map((field, index) => (
                      <div
                        key={field.id}
                        className="grid grid-cols-1 md:grid-cols-4 gap-4 pb-4 border-b"
                      >
                        <FormField
                          control={form.control}
                          name={`revenueAssumptions.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name</FormLabel>
                              <FormControl><Input placeholder="Subscription Fee" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`revenueAssumptions.${index}.value`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Value ($)</FormLabel>
                              <FormControl><Input type="number" placeholder="99.99" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`revenueAssumptions.${index}.type`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Type</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                                <SelectContent>
                                  <SelectItem value="recurring">Recurring</SelectItem>
                                  <SelectItem value="variable">Variable</SelectItem>
                                  <SelectItem value="fixed">Fixed</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`revenueAssumptions.${index}.frequency`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Frequency</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select frequency" /></SelectTrigger></FormControl>
                                <SelectContent>
                                  <SelectItem value="monthly">Monthly</SelectItem>
                                  <SelectItem value="quarterly">Quarterly</SelectItem>
                                  <SelectItem value="annually">Annually</SelectItem>
                                  <SelectItem value="one-time">One-time</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex justify-end col-span-1 md:col-span-4">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeRevenue(index)}
                            disabled={revenueFields.length <= 1}
                            className="text-red-500"
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => appendRevenue(defaultRevenueAssumption)}
                      className="mt-4"
                    >
                      Add Revenue Stream
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="costs" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Cost Assumptions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {costFields.map((field, index) => (
                      <div
                        key={field.id}
                        className="grid grid-cols-1 md:grid-cols-4 gap-4 pb-4 border-b"
                      >
                        <FormField
                          control={form.control}
                          name={`costAssumptions.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name</FormLabel>
                              <FormControl><Input placeholder="Server Costs" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`costAssumptions.${index}.value`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Value ($)</FormLabel>
                              <FormControl><Input type="number" placeholder="500" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`costAssumptions.${index}.type`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Type</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                                <SelectContent>
                                  <SelectItem value="recurring">Recurring</SelectItem>
                                  <SelectItem value="variable">Variable</SelectItem>
                                  <SelectItem value="fixed">Fixed</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`costAssumptions.${index}.category`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Category</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger></FormControl>
                                <SelectContent>
                                  <SelectItem value="staffing">Staffing</SelectItem>
                                  <SelectItem value="marketing">Marketing</SelectItem>
                                  <SelectItem value="operations">Operations</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex justify-end col-span-1 md:col-span-4">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeCost(index)}
                            disabled={costFields.length <= 1}
                            className="text-red-500"
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => appendCost(defaultCostAssumption)}
                      className="mt-4"
                    >
                      Add Cost
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="growth" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Growth Model</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="growthModelType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Growth Model Type</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a growth model" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="linear">Linear</SelectItem>
                            <SelectItem value="exponential">Exponential</SelectItem>
                            <SelectItem value="seasonal">Seasonal</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="growthRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Growth Rate</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.1"
                            {...field}
                          />
                        </FormControl>
                        <p className="text-sm text-muted-foreground">
                          Enter as a decimal: 0.1 = 10% growth
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {form.watch("growthModelType") === "seasonal" && (
                    <FormField
                      control={form.control}
                      name="seasonalFactors"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Seasonal Factors</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="1.1, 0.9, 1.2, 0.8"
                              {...field}
                            />
                          </FormControl>
                          <p className="text-sm text-muted-foreground">
                            Enter factors separated by commas (e.g., 1.1, 0.9, 1.2, 0.8)
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/projects/${projectId}`)}
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

export default NewFinancialModel;
