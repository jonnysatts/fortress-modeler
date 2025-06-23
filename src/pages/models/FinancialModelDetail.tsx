import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BarChart3, ChartLine, Edit, Trash2, Megaphone } from "lucide-react";
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
import { calculateTotalRevenue, calculateTotalCosts } from "@/lib/financialCalculations";
import { ModelOverview } from "@/components/models/ModelOverview";
import { MarketingChannelsForm } from "@/components/models/MarketingChannelsForm";
import { ModelAssumptions, MarketingSetup, RevenueStream, CostCategory } from "@/types/models";
import { TrendDataPoint } from "@/types/trends";

const FinancialModelDetail = () => {
  const { projectId, modelId } = useParams<{ projectId: string; modelId: string }>();
  const navigate = useNavigate();
  
  // --- Call ALL hooks at the top level --- 
  const [loading, setLoading] = useState(true);
  const [model, setModel] = useState<FinancialModel | null>(null);
  const { loadProjectById, currentProject, setCurrentProject } = useStore();
  const [revenueData, setRevenueData] = useState<TrendDataPoint[]>([]);
  const [costData, setCostData] = useState<TrendDataPoint[]>([]);
  const [combinedFinancialData, setCombinedFinancialData] = useState<TrendDataPoint[]>([]);
  const [isFinancialDataReady, setIsFinancialDataReady] = useState<boolean>(false);
  
  // Memoize assumption props (call unconditionally)
  const assumptions = model?.assumptions;
  const memoizedCosts = useMemo(() => assumptions?.costs || [], [assumptions?.costs]);
  const memoizedMarketingSetup = useMemo(() => assumptions?.marketing || { allocationMode: 'channels' as 'channels' | 'highLevel', channels: [] }, [assumptions?.marketing]);
  const memoizedMetadata = useMemo(() => assumptions?.metadata, [assumptions?.metadata]);
  const memoizedGrowthModel = useMemo(() => assumptions?.growthModel, [assumptions?.growthModel]);
  const isWeeklyEvent = useMemo(() => memoizedMetadata?.type === "WeeklyEvent", [memoizedMetadata]);

  // Callbacks (call unconditionally)
  const updateModelAssumptions = useCallback(async (updatedFields: Partial<ModelAssumptions>) => {
    console.log("[FinancialModelDetail] updateModelAssumptions called with:", JSON.stringify(updatedFields));
    
    if (!model || !model.id) {
        console.log("[FinancialModelDetail] updateModelAssumptions skipped: no model or model.id");
        return;
    }
    
    try {
      const currentAssumptions = model?.assumptions || { 
          revenue: [], 
          costs: [], 
          growthModel: { type: 'linear', rate: 0 }, 
          marketing: { channels: [] }
      };

      const newAssumptions = { ...currentAssumptions, ...updatedFields };

      if (updatedFields.marketing) {
         newAssumptions.marketing = {
            channels: [],
            ...currentAssumptions.marketing,
            ...updatedFields.marketing,
         };
      }
      
      if (!newAssumptions.revenue) newAssumptions.revenue = [];
      if (!newAssumptions.costs) newAssumptions.costs = [];
      if (!newAssumptions.growthModel) newAssumptions.growthModel = { type: 'linear', rate: 0 };
      if (!newAssumptions.marketing) newAssumptions.marketing = { channels: [] };
      if (!newAssumptions.marketing.channels) newAssumptions.marketing.channels = [];

      // *** Add specific log for marketing object before save ***
      if (newAssumptions.marketing) {
          console.log("[FinancialModelDetail] Marketing object being saved:", JSON.stringify(newAssumptions.marketing));
      } else {
          console.log("[FinancialModelDetail] No marketing object to save.");
      }
      
      const assumptionsToSave = newAssumptions as FinancialModel['assumptions'];

      console.log("[FinancialModelDetail] Attempting to save assumptions:", JSON.stringify(assumptionsToSave));

      await db.financialModels.update(model.id, { 
          assumptions: assumptionsToSave, 
          updatedAt: new Date() 
      });
      
      console.log("[FinancialModelDetail] db.financialModels.update successful for ID:", model.id);

      setModel(prevModel => prevModel ? { 
          ...prevModel, 
          assumptions: assumptionsToSave, 
          updatedAt: new Date() 
      } : null);
      
      toast({ title: "Assumptions Updated", description: "Marketing changes saved." });
      
    } catch (error) {
      console.error("[FinancialModelDetail] Error saving assumptions:", error);
      toast({ variant: "destructive", title: "Error Saving", description: "Could not save marketing changes." });
    }
  }, [model]); // Dependency might need refinement if model reference changes too often

  const combineFinancialData = useCallback(() => {
    if (revenueData.length === 0 || costData.length === 0) {
      return;
    }
    
    try {
      const periodMap = new Map<string, TrendDataPoint>();
      
      // Process revenue first
      revenueData.forEach(revPeriod => {
        const periodKey = revPeriod.point;
        periodMap.set(periodKey, { ...revPeriod });
      });
      
      // Merge cost data
      costData.forEach(costPeriod => {
        const periodKey = costPeriod.point;
        const existingPeriod = periodMap.get(periodKey) || { point: periodKey }; // Ensure base object exists
        
        // Merge cost properties, potentially overwriting if keys overlap (like 'point')
        periodMap.set(periodKey, {
          ...existingPeriod,
          ...costPeriod
        });
      });
      
      let combined = Array.from(periodMap.values());
      combined.sort((a, b) => {
        const aNum = parseInt(a.point.replace(/[^0-9]/g, '')) || 0;
        const bNum = parseInt(b.point.replace(/[^0-9]/g, '')) || 0;
        return aNum - bNum;
      });
      
      // --- Recalculate Profit and Cumulative Profit --- 
      let cumulativeProfit = 0;
      combined = combined.map(period => {
          const revenue = period.revenue || period.total || 0; // Handle different keys if necessary
          const costs = period.costs || period.total || 0; // Handle different keys
          const profit = revenue - costs;
          cumulativeProfit += profit;
          
          // Ensure standard keys exist for the matrix
          return {
              ...period,
              revenue: revenue, // Standardize key
              costs: costs,     // Standardize key
              profit: profit,
              cumulativeProfit: cumulativeProfit
          };
      });
      // --- End Recalculation ---
      
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

  const handleDeleteModel = useCallback(async () => {
    // Ensure modelId is defined before attempting delete
    if (!modelId) {
        toast({ variant: "destructive", title: "Error", description: "Model ID is missing, cannot delete." });
        return;
    }
    try {
      await db.financialModels.delete(parseInt(modelId));
      toast({ title: "Model deleted", description: "The financial model has been successfully deleted." });
      navigate(`/projects/${projectId}`);
    } catch (error) {
      console.error("Error deleting model:", error);
      toast({ variant: "destructive", title: "Error deleting model", description: "There was an error deleting the financial model." });
    }
  }, [modelId, projectId, navigate]);

  // Effects (call unconditionally)
  useEffect(() => {
    let isMounted = true; // Flag to prevent state updates on unmounted component
    const loadModelData = async () => {
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
        if (isMounted) {
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
        if (isMounted) setLoading(false);
      }
    };

    loadModelData();
    return () => { isMounted = false; }; // Cleanup function
  }, [projectId, modelId, navigate, currentProject, loadProjectById, setCurrentProject]); // Dependencies

  useEffect(() => {
    if (revenueData.length > 0 && costData.length > 0) {
      combineFinancialData();
    }
  }, [revenueData, costData, combineFinancialData]);

  // Helper functions (can be defined here)
  const formatDate = (dateString: string | Date | undefined): string => {
    if (!dateString) return "N/A";
    try {
        // Handle both string and Date objects
        const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
        if (isNaN(date.getTime())) return "Invalid Date"; 
        return date.toLocaleDateString("en-US", {
            year: "numeric", month: "short", day: "numeric",
        });
    } catch (error) {
        console.error("Error formatting date:", dateString, error);
        return "Error Date";
    }
  };

  // --- Conditional Returns (AFTER all hooks) --- 
  if (loading || !currentProject) { // Check currentProject as well for header info
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
         <div className="h-10 w-10 border-4 border-fortress-emerald border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  // Check specifically for model after loading finishes
  if (!model) {
      return (
        <div className="text-center py-10 text-red-500">Model not found or failed to load.</div>
      );
  }

  // Check for required assumptions AFTER confirming model exists
  const hasRequiredData = model.assumptions && 
    model.assumptions.revenue && 
    model.assumptions.costs && 
    model.assumptions.growthModel;

  if (!hasRequiredData) {
      return (
          <div className="text-center py-10 text-orange-500">Model data is incomplete. Please edit the model.</div>
      );
  }
  // --- End Conditional Returns ---

  // Now it's safe to use the data and memoized props
  console.log("[FinancialModelDetail Render] Passing marketingSetup:", memoizedMarketingSetup);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
         <div className="flex items-start gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/projects/${projectId}`)}><ArrowLeft className="h-4 w-4" /></Button>
            <div>
               <h1 className="text-3xl font-bold text-fortress-blue">{model.name}</h1>
               <p className="text-muted-foreground">
                 Created on {formatDate(model.createdAt)} • Last updated on{" "}
                 {formatDate(model.updatedAt)}
               </p>
            </div>
         </div>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={() => navigate(`/projects/${projectId}/models/${model.id}/edit`)} disabled={!model.id}><Edit className="mr-1 h-4 w-4" /> Edit</Button>
            <AlertDialog>
               <AlertDialogTrigger asChild><Button variant="destructive" size="sm" disabled={!model.id}><Trash2 className="mr-1 h-4 w-4" /> Delete</Button></AlertDialogTrigger>
               <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>This action cannot be undone. This will permanently delete the financial model.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                     <AlertDialogCancel>Cancel</AlertDialogCancel>
                     <AlertDialogAction onClick={handleDeleteModel} className="bg-red-500 hover:bg-red-600">Delete</AlertDialogAction>
                  </AlertDialogFooter>
               </AlertDialogContent>
            </AlertDialog>
          </div>
       </div>

      <Tabs defaultValue="overview" className="space-y-4">
         <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="marketing">Marketing</TabsTrigger>
            <TabsTrigger value="financial-matrix">Financial Matrix</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
            <TabsTrigger value="projections">Projections</TabsTrigger>
         </TabsList>

         <TabsContent value="overview" className="space-y-4">
           <ModelOverview model={model as any} projectId={projectId} /> 
         </TabsContent>

         <TabsContent value="marketing">
           <MarketingChannelsForm 
             marketingSetup={memoizedMarketingSetup} 
             updateAssumptions={updateModelAssumptions} 
             modelTimeUnit={isWeeklyEvent ? 'Week' : 'Month'} 
           />
         </TabsContent>

         <TabsContent value="financial-matrix">
             <Card>
               <CardHeader><CardTitle className="flex items-center"><BarChart3 className="mr-2 h-5 w-5" />Combined Financial Matrix</CardTitle></CardHeader>
               <CardContent>
                  {isFinancialDataReady ? (
                     <FinancialMatrix 
                       model={model} 
                       trendData={combinedFinancialData} 
                       combinedView={true}
                     />
                  ) : (
                     <div className="text-center py-10 text-muted-foreground">Loading financial data...</div> 
                  )}
               </CardContent>
             </Card>
         </TabsContent>

         <TabsContent value="trends">
           <div className="space-y-8">
             <Card>
                <CardHeader><CardTitle className="flex items-center"><ChartLine className="mr-2 h-5 w-5" />Revenue Trends Over Time</CardTitle></CardHeader>
                <CardContent>
                   <RevenueTrends model={model} setCombinedData={setRevenueData} />
                </CardContent>
             </Card>
             <Card>
                <CardHeader><CardTitle className="flex items-center"><ChartLine className="mr-2 h-5 w-5" />Cost Trends Over Time</CardTitle></CardHeader>
                <CardContent>
                   <CostTrends 
                      costs={memoizedCosts}
                      marketingSetup={memoizedMarketingSetup}
                      metadata={memoizedMetadata}
                      growthModel={memoizedGrowthModel}
                      model={model} 
                      onUpdateCostData={setCostData} 
                   />
                </CardContent>
             </Card>
           </div>
         </TabsContent>

          <TabsContent value="breakdown">
             <Card>
               <CardHeader><CardTitle>Category Breakdown</CardTitle></CardHeader>
               <CardContent>
                  {isFinancialDataReady ? (
                     <CategoryBreakdown 
                        model={model} 
                        revenueTrendData={revenueData}
                        costTrendData={costData}
                     />
                  ) : (
                     <div className="text-center py-10 text-muted-foreground">Loading breakdown data...</div> 
                  )}
               </CardContent>
             </Card>
         </TabsContent>

          <TabsContent value="projections">
             <Card>
               <CardHeader><CardTitle>Financial Projections</CardTitle></CardHeader>
               <CardContent>
                  <ModelProjections model={model} />
               </CardContent>
             </Card>
         </TabsContent>
      </Tabs>
    </div>
  );
};

export default FinancialModelDetail;
