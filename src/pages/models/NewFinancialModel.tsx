import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { db, getProject, RevenueAssumption, CostAssumption } from "@/lib/db";
import useStore from "@/store/useStore";
import { toast } from "@/hooks/use-toast";
import EventModelForm from "./components/EventModelForm";

// Schema for form validation
const formSchema = z.object({
  name: z.string().min(1, "Model name is required"),
  growthModelType: z.enum(["linear", "exponential", "seasonal"], {
    required_error: "Please select a growth model type",
  }),
  growthRate: z.coerce
    .number()
    .min(0, "Growth rate must be positive")
    .default(0.1),
  seasonalFactors: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

// Default revenue assumption
const defaultRevenueAssumption: RevenueAssumption = {
  name: "",
  value: 0,
  type: "recurring", // Now explicitly using the union type
  frequency: "monthly",
};

// Default cost assumption
const defaultCostAssumption: CostAssumption = {
  name: "",
  value: 0,
  type: "fixed", // Now explicitly using the union type
  category: "operations",
};

const NewFinancialModel = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { currentProject, loadProjectById } = useStore();
  const [revenueAssumptions, setRevenueAssumptions] = useState<RevenueAssumption[]>([
    { ...defaultRevenueAssumption, name: "Monthly Subscription" },
  ]);
  const [costAssumptions, setCostAssumptions] = useState<CostAssumption[]>([
    { ...defaultCostAssumption, name: "Cloud Infrastructure" },
  ]);

  // Load project if not already loaded
  useEffect(() => {
    if (projectId && (!currentProject || currentProject.id !== Number(projectId))) {
      loadProjectById(Number(projectId));
    }
  }, [projectId, currentProject, loadProjectById]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      growthModelType: "linear",
      growthRate: 0.1,
      seasonalFactors: "",
    },
  });

  const onSubmit = async (data: FormValues) => {
    if (!projectId || !currentProject) return;

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

      // Create new financial model
      const modelId = await db.financialModels.add({
        projectId: parseInt(projectId),
        name: data.name,
        assumptions: {
          revenue: revenueAssumptions,
          costs: costAssumptions,
          growthModel,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      toast({
        title: "Financial model created",
        description: `Successfully created "${data.name}" model.`,
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

  // Handle revenue assumption changes
  const handleRevenueChange = (
    index: number,
    field: string,
    value: string | number
  ) => {
    const updated = [...revenueAssumptions];
    if (field === 'type' && (value === 'fixed' || value === 'variable' || value === 'recurring')) {
      updated[index] = { ...updated[index], [field]: value };
    } else if (field === 'frequency' && (value === 'monthly' || value === 'quarterly' || value === 'annually' || value === 'one-time')) {
      updated[index] = { ...updated[index], [field]: value };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setRevenueAssumptions(updated);
  };

  // Add a new revenue assumption
  const addRevenueAssumption = () => {
    setRevenueAssumptions([...revenueAssumptions, { ...defaultRevenueAssumption }]);
  };

  // Remove a revenue assumption
  const removeRevenueAssumption = (index: number) => {
    if (revenueAssumptions.length > 1) {
      setRevenueAssumptions(
        revenueAssumptions.filter((_, i) => i !== index)
      );
    }
  };

  // Handle cost assumption changes
  const handleCostChange = (
    index: number,
    field: string,
    value: string | number
  ) => {
    const updated = [...costAssumptions];
    if (field === 'type' && (value === 'fixed' || value === 'variable' || value === 'recurring')) {
      updated[index] = { ...updated[index], [field]: value };
    } else if (field === 'category' && (value === 'staffing' || value === 'marketing' || value === 'operations' || value === 'other')) {
      updated[index] = { ...updated[index], [field]: value };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setCostAssumptions(updated);
  };

  // Add a new cost assumption
  const addCostAssumption = () => {
    setCostAssumptions([...costAssumptions, { ...defaultCostAssumption }]);
  };

  // Remove a cost assumption
  const removeCostAssumption = (index: number) => {
    if (costAssumptions.length > 1) {
      setCostAssumptions(costAssumptions.filter((_, i) => i !== index));
    }
  };

  if (!currentProject) {
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
                    {revenueAssumptions.map((assumption, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-1 md:grid-cols-4 gap-4 pb-4 border-b"
                      >
                        <div>
                          <FormLabel>Name</FormLabel>
                          <Input
                            value={assumption.name}
                            onChange={(e) =>
                              handleRevenueChange(index, "name", e.target.value)
                            }
                            placeholder="Subscription Fee"
                          />
                        </div>

                        <div>
                          <FormLabel>Value ($)</FormLabel>
                          <Input
                            type="number"
                            value={assumption.value}
                            onChange={(e) =>
                              handleRevenueChange(
                                index,
                                "value",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            placeholder="99.99"
                          />
                        </div>

                        <div>
                          <FormLabel>Type</FormLabel>
                          <Select
                            value={assumption.type}
                            onValueChange={(value) =>
                              handleRevenueChange(index, "type", value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="fixed">Fixed</SelectItem>
                              <SelectItem value="variable">Variable</SelectItem>
                              <SelectItem value="recurring">Recurring</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <FormLabel>Frequency</FormLabel>
                          <Select
                            value={assumption.frequency}
                            onValueChange={(value) =>
                              handleRevenueChange(index, "frequency", value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="monthly">Monthly</SelectItem>
                              <SelectItem value="quarterly">Quarterly</SelectItem>
                              <SelectItem value="annually">Annually</SelectItem>
                              <SelectItem value="one-time">One-time</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex justify-end col-span-1 md:col-span-4">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeRevenueAssumption(index)}
                            disabled={revenueAssumptions.length <= 1}
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
                      onClick={addRevenueAssumption}
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
                    {costAssumptions.map((assumption, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-1 md:grid-cols-4 gap-4 pb-4 border-b"
                      >
                        <div>
                          <FormLabel>Name</FormLabel>
                          <Input
                            value={assumption.name}
                            onChange={(e) =>
                              handleCostChange(index, "name", e.target.value)
                            }
                            placeholder="Server Costs"
                          />
                        </div>

                        <div>
                          <FormLabel>Value ($)</FormLabel>
                          <Input
                            type="number"
                            value={assumption.value}
                            onChange={(e) =>
                              handleCostChange(
                                index,
                                "value",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            placeholder="500"
                          />
                        </div>

                        <div>
                          <FormLabel>Type</FormLabel>
                          <Select
                            value={assumption.type}
                            onValueChange={(value) =>
                              handleCostChange(index, "type", value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="fixed">Fixed</SelectItem>
                              <SelectItem value="variable">Variable</SelectItem>
                              <SelectItem value="recurring">Recurring</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <FormLabel>Category</FormLabel>
                          <Select
                            value={assumption.category}
                            onValueChange={(value) =>
                              handleCostChange(index, "category", value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="staffing">Staffing</SelectItem>
                              <SelectItem value="marketing">Marketing</SelectItem>
                              <SelectItem value="operations">Operations</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex justify-end col-span-1 md:col-span-4">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeCostAssumption(index)}
                            disabled={costAssumptions.length <= 1}
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
                      onClick={addCostAssumption}
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
