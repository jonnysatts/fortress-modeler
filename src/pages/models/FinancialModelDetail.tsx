import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BarChart3, ChartLine, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { FinancialModel, db } from "@/lib/db";
import useStore from "@/store/useStore";
import { toast } from "@/hooks/use-toast";
import ModelProjections from "@/components/models/ModelProjections";
import RevenueTrends from "@/components/models/RevenueTrends"; 
import CostTrends from "@/components/models/CostTrends";
import CategoryBreakdown from "@/components/models/CategoryBreakdown";
import FinancialMatrix from "@/components/models/FinancialMatrix";

const FinancialModelDetail = () => {
  const { projectId, modelId } = useParams<{ projectId: string; modelId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [model, setModel] = useState<FinancialModel | null>(null);
  const { loadProjectById, currentProject, setCurrentProject } = useStore();

  const [combinedFinancialData, setCombinedFinancialData] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [costData, setCostData] = useState<any[]>([]);
  const [isFinancialDataReady, setIsFinancialDataReady] = useState<boolean>(false);

  const combineFinancialData = useCallback(() => {
    if (revenueData.length === 0 || costData.length === 0) {
      return;
    }
    
    try {
      const periodMap = new Map();
      
      revenueData.forEach(revPeriod => {
        const periodKey = revPeriod.point;
        periodMap.set(periodKey, {
          point: periodKey,
          ...revPeriod
        });
      });
      
      costData.forEach(costPeriod => {
        const periodKey = costPeriod.point;
        const existingPeriod = periodMap.get(periodKey) || {};
        
        periodMap.set(periodKey, {
          ...existingPeriod,
          ...costPeriod
        });
      });
      
      const combined = Array.from(periodMap.values());
      combined.sort((a, b) => {
        const aNum = parseInt(a.point.replace(/[^0-9]/g, '')) || 0;
        const bNum = parseInt(b.point.replace(/[^0-9]/g, '')) || 0;
        return aNum - bNum;
      });
      
      setCombinedFinancialData(combined);
      setIsFinancialDataReady(true);
    } catch (error) {
      console.error("Error combining financial data:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "There was a problem combining financial data.",
      });
    }
  }, [revenueData, costData]);

  useEffect(() => {
    const loadData = async () => {
      if (!projectId || !modelId) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Missing project or model ID",
        });
        navigate("/projects");
        return;
      }

      setLoading(true);
      try {
        if (!currentProject || currentProject.id !== parseInt(projectId)) {
          const project = await loadProjectById(parseInt(projectId));
          if (!project) {
            toast({
              variant: "destructive",
              title: "Project not found",
              description: "The requested project could not be found.",
            });
            navigate("/projects");
            return;
          }
          setCurrentProject(project);
        }

        const financialModel = await db.financialModels.get(parseInt(modelId));
        if (financialModel) {
          setModel(financialModel);
        } else {
          toast({
            variant: "destructive",
            title: "Model not found",
            description: "The requested financial model could not be found.",
          });
          navigate(`/projects/${projectId}`);
        }
      } catch (error) {
        console.error("Error loading financial model:", error);
        toast({
          variant: "destructive",
          title: "Error loading model",
          description: "There was an error loading the financial model.",
        });
        navigate(`/projects/${projectId}`);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [projectId, modelId, navigate, currentProject, loadProjectById, setCurrentProject]);

  useEffect(() => {
    if (revenueData.length > 0 && costData.length > 0) {
      combineFinancialData();
    }
  }, [revenueData, costData, combineFinancialData]);

  const handleDeleteModel = async () => {
    if (!modelId) return;

    try {
      await db.financialModels.delete(parseInt(modelId));
      toast({
        title: "Model deleted",
        description: "The financial model has been successfully deleted.",
      });
      navigate(`/projects/${projectId}`);
    } catch (error) {
      console.error("Error deleting model:", error);
      toast({
        variant: "destructive",
        title: "Error deleting model",
        description: "There was an error deleting the financial model.",
      });
    }
  };

  if (loading || !model || !currentProject) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="h-10 w-10 border-4 border-fortress-emerald border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const hasRequiredData = model && 
    model.assumptions && 
    model.assumptions.revenue && 
    model.assumptions.costs && 
    model.assumptions.growthModel;

  if (!hasRequiredData) {
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
          <h1 className="text-3xl font-bold text-fortress-blue">{model?.name || "Model"}</h1>
        </div>
        <Card>
          <CardContent className="py-6">
            <div className="text-center py-10">
              <p className="text-lg font-medium text-red-500">
                This financial model data appears to be corrupted or incomplete.
              </p>
              <Button 
                className="mt-4" 
                onClick={() => navigate(`/projects/${projectId}`)}
              >
                Return to Project
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isWeeklyEvent = model.assumptions.metadata?.type === "WeeklyEvent";
  const shouldSpreadSetupCosts = isWeeklyEvent && 
    model.assumptions.metadata?.costs?.spreadSetupCosts === true;
  
  console.log("Model metadata:", model.assumptions.metadata);
  console.log("Should spread setup costs:", shouldSpreadSetupCosts);

  const calculateTotalRevenue = (model: FinancialModel): number => {
    try {
      if (model.assumptions.metadata?.type !== "WeeklyEvent") return 0;
      
      const metadata = model.assumptions.metadata;
      const weeks = metadata.weeks || 12;
      const initialRevenue = model.assumptions.revenue.reduce((sum, item) => sum + item.value, 0);
      let totalRevenue = 0;
      
      for (let week = 0; week < weeks; week++) {
        const growthFactor = Math.pow(1 + (model.assumptions.growthModel.rate || 0), week);
        totalRevenue += initialRevenue * growthFactor;
      }
      
      return Math.round(totalRevenue);
    } catch (error) {
      console.error("Error calculating total revenue:", error);
      return 0;
    }
  };

  const calculateTotalCosts = (model: FinancialModel): number => {
    try {
      if (model.assumptions.metadata?.type !== "WeeklyEvent") return 0;
      
      const metadata = model.assumptions.metadata;
      const weeks = metadata.weeks || 12;
      
      const shouldSpreadSetupCosts = metadata.costs?.spreadSetupCosts === true;
      
      const fixedCosts = model.assumptions.costs
        .filter(cost => cost.type?.toLowerCase() === "fixed")
        .reduce((sum, cost) => sum + cost.value, 0);
      
      const recurringAndVariableCosts = model.assumptions.costs
        .filter(cost => cost.type?.toLowerCase() !== "fixed")
        .reduce((sum, cost) => sum + cost.value, 0);
      
      let totalCosts = 0;
      
      if (shouldSpreadSetupCosts) {
        totalCosts += fixedCosts;
      } else {
        totalCosts += fixedCosts;
      }
      
      for (let week = 0; week < weeks; week++) {
        const growthFactor = Math.pow(1 + ((model.assumptions.growthModel.rate || 0) * 0.7), week);
        
        const weekCosts = recurringAndVariableCosts * growthFactor;
        
        if (shouldSpreadSetupCosts && week > 0) {
          totalCosts += weekCosts + (fixedCosts / weeks);
        } else {
          totalCosts += weekCosts;
        }
      }
      
      return Math.round(totalCosts);
    } catch (error) {
      console.error("Error calculating total costs:", error);
      return 0;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/projects/${projectId}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-fortress-blue">{model.name}</h1>
            <p className="text-muted-foreground">
              Created on {formatDate(model.createdAt)} • Last updated on{" "}
              {formatDate(model.updatedAt)}
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/projects/${projectId}/models/${modelId}/edit`)}
          >
            <Edit className="mr-1 h-4 w-4" />
            Edit
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="mr-1 h-4 w-4" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the
                  financial model and all associated data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteModel}
                  className="bg-red-500 hover:bg-red-600"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="financial-matrix">Financial Matrix</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
          <TabsTrigger value="projections">Projections</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Model Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium">Growth Model</h3>
                  <div className="flex items-center mt-1">
                    <Badge variant="outline" className="capitalize">
                      {model.assumptions.growthModel.type}
                    </Badge>
                    <span className="ml-2">
                      Rate: {model.assumptions.growthModel.rate * 100}%
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium">Revenue Streams</h3>
                  <div className="mt-1">
                    <p className="mb-1">{model.assumptions.revenue.length} streams</p>
                    <div className="space-y-1">
                      {model.assumptions.revenue.map((rev, idx) => (
                        <div key={idx} className="text-sm flex justify-between">
                          <span>{rev.name}</span>
                          <span className="font-medium">${rev.value.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium">Cost Categories</h3>
                  <div className="mt-1">
                    <p className="mb-1">{model.assumptions.costs.length} categories</p>
                    <div className="space-y-1">
                      {model.assumptions.costs.map((cost, idx) => (
                        <div key={idx} className="text-sm flex justify-between">
                          <span>{cost.name}</span>
                          <span className="font-medium">${cost.value.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {model.assumptions.metadata?.type === "WeeklyEvent" && (
                  <div>
                    <h3 className="text-sm font-medium">Event Type</h3>
                    <p className="mt-1">Weekly Event Series</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {model.assumptions.metadata.weeks} weeks, {" "}
                      {model.assumptions.metadata.initialWeeklyAttendance} initial attendees per week
                    </p>
                    {model.assumptions.metadata.growth?.attendanceGrowthRate > 0 && (
                      <p className="text-sm text-muted-foreground">
                        Attendance growth: {model.assumptions.metadata.growth.attendanceGrowthRate}% per week
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Key Metrics</CardTitle>
                <BarChart3 className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Initial Revenue</p>
                    <p className="text-2xl font-bold">
                      $
                      {model.assumptions.revenue
                        .reduce((sum, item) => sum + item.value, 0)
                        .toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Initial Costs</p>
                    <p className="text-2xl font-bold">
                      $
                      {model.assumptions.costs
                        .reduce((sum, item) => sum + item.value, 0)
                        .toLocaleString()}
                    </p>
                  </div>
                </div>

                {isWeeklyEvent && (
                  <div className="pt-2 border-t">
                    <h3 className="text-sm font-medium mb-2">Estimated Totals (All Periods)</h3>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-2 bg-green-50 rounded">
                        <p className="text-xs text-green-700">Total Revenue</p>
                        <p className="text-lg font-bold text-green-800">
                          ${calculateTotalRevenue(model).toLocaleString()}
                        </p>
                      </div>
                      <div className="p-2 bg-red-50 rounded">
                        <p className="text-xs text-red-700">Total Costs</p>
                        <p className="text-lg font-bold text-red-800">
                          ${calculateTotalCosts(model).toLocaleString()}
                        </p>
                      </div>
                      <div className="p-2 bg-blue-50 rounded">
                        <p className="text-xs text-blue-700">Total Profit</p>
                        <p className="text-lg font-bold text-blue-800">
                          ${(calculateTotalRevenue(model) - calculateTotalCosts(model)).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="financial-matrix">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="mr-2 h-5 w-5" />
                Combined Financial Matrix
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isFinancialDataReady ? (
                <FinancialMatrix 
                  model={model} 
                  trendData={combinedFinancialData} 
                  combinedView={true}
                  shouldSpreadSetupCosts={shouldSpreadSetupCosts}
                />
              ) : (
                <div className="flex justify-center items-center py-10">
                  <div className="flex flex-col items-center">
                    <div className="h-8 w-8 border-4 border-fortress-emerald border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-muted-foreground">
                      Loading financial data...
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      (Please view the Trends tab first if this takes too long)
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends">
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ChartLine className="mr-2 h-5 w-5" />
                  Revenue Trends Over Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RevenueTrends 
                  model={model} 
                  setCombinedData={setRevenueData} 
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ChartLine className="mr-2 h-5 w-5" />
                  Cost Trends Over Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CostTrends 
                  model={model} 
                  onUpdateCostData={setCostData} 
                  shouldSpreadSetupCosts={shouldSpreadSetupCosts}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="breakdown">
          <Card>
            <CardHeader>
              <CardTitle>Category Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <CategoryBreakdown model={model} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projections">
          <Card>
            <CardHeader>
              <CardTitle>Financial Projections</CardTitle>
            </CardHeader>
            <CardContent>
              <ModelProjections 
                model={model} 
                shouldSpreadSetupCosts={shouldSpreadSetupCosts}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FinancialModelDetail;
