import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BarChart3, ChartLine, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
import { useProject } from "@/hooks/useProjects";
import { useModel, useDeleteModel } from "@/hooks/useModels";
import { toast } from "@/hooks/use-toast";
import ModelProjections from "@/components/models/ModelProjections";
import RevenueTrends from "@/components/models/RevenueTrends";
import CostTrends from "@/components/models/CostTrends";
import CategoryBreakdown from "@/components/models/CategoryBreakdown";
import FinancialMatrix from "@/components/models/FinancialMatrix";
import FinancialAnalysis from "@/components/models/FinancialAnalysis";

import ModelOverview from "@/components/models/ModelOverview";
import { MarketingChannelsForm } from "@/components/models/MarketingChannelsForm";
import { ModelAssumptions } from "@/types/models";
import { TrendDataPoint } from "@/types/trends";
import { formatDate } from "@/lib/utils";

const FinancialModelDetail = () => {
  const { projectId, modelId } = useParams<{ projectId: string; modelId: string }>();
  const navigate = useNavigate();
  
  // --- Call ALL hooks at the top level ---
  const [model, setModel] = useState<FinancialModel | null>(null);
  // Note: Not using any Zustand store functions to avoid infinite loops
  const [revenueData, setRevenueData] = useState<TrendDataPoint[]>([]);
  const [costData, setCostData] = useState<TrendDataPoint[]>([]);
  const [combinedFinancialData, setCombinedFinancialData] = useState<TrendDataPoint[]>([]);
  const [isFinancialDataReady, setIsFinancialDataReady] = useState<boolean>(false);

  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: fetchedModel, isLoading: modelLoading } = useModel(modelId);
  const deleteModel = useDeleteModel();
  
  // Memoize assumption props (call unconditionally)
  const assumptions = model?.assumptions;
  const memoizedCosts = useMemo(() => assumptions?.costs || [], [assumptions?.costs]);
  const memoizedMarketingSetup = useMemo(() => assumptions?.marketing || { allocationMode: 'channels' as 'channels' | 'highLevel', channels: [] }, [assumptions?.marketing]);
  const memoizedMetadata = useMemo(() => assumptions?.metadata, [assumptions?.metadata]);
  const memoizedGrowthModel = useMemo(() => assumptions?.growthModel, [assumptions?.growthModel]);
  const isWeeklyEvent = useMemo(() => memoizedMetadata?.type === "WeeklyEvent", [memoizedMetadata]);

  // Callbacks (call unconditionally)
  const updateModelAssumptions = useCallback(async (updatedFields: Partial<ModelAssumptions>) => {
    setModel(prevModel => {
      if (!prevModel || !prevModel.id) {
        toast({ variant: "destructive", title: "Error", description: "Cannot update a model that is not loaded." });
        return prevModel;
      }

      // Deep merge the new fields into the existing assumptions
      const newAssumptions: ModelAssumptions = {
        ...prevModel.assumptions,
        ...updatedFields,
        // Ensure nested objects are merged, not replaced
        marketing: {
          ...prevModel.assumptions.marketing,
          ...updatedFields.marketing,
        },
      };

      // Perform the database update
      db.financialModels.update(prevModel.id, {
        assumptions: newAssumptions,
        updatedAt: new Date()
      }).then(() => {
        toast({ title: "Assumptions Updated", description: "Your changes have been saved." });
      }).catch(error => {
        console.error("[FinancialModelDetail] Error saving assumptions:", error);
        toast({ variant: "destructive", title: "Error Saving", description: "Could not save your changes." });
      });

      // Return the new state immediately for a responsive UI
      return { ...prevModel, assumptions: newAssumptions, updatedAt: new Date() };
    });
  }, []); // This callback is now stable and has no dependencies.

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
          const revenue = period.revenue || 0;
          const costs = period.costs || 0;
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
    if (!modelId || !projectId) {
      toast({ variant: "destructive", title: "Error", description: "Model ID is missing, cannot delete." });
      return;
    }
    try {
      await deleteModel.mutateAsync({ modelId, projectId });
      navigate(`/projects/${projectId}`);
    } catch (error) {
      console.error("Error deleting model:", error);
      toast({
        variant: "destructive",
        title: "Error deleting model",
        description: error instanceof Error ? error.message : "An unknown error occurred."
      });
    }
  }, [modelId, projectId, navigate, deleteModel]);

  // Effects (call unconditionally)
  useEffect(() => {
    if (fetchedModel) {
      setModel(fetchedModel);
    }
  }, [fetchedModel]);

  useEffect(() => {
    if (revenueData.length > 0 && costData.length > 0) {
      combineFinancialData();
    }
  }, [revenueData, costData, combineFinancialData]);

  const loading = projectLoading || modelLoading || !model;

  // --- Conditional Returns (AFTER all hooks) --- 
  if (loading) { // Only check loading state
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
            <TabsTrigger value="analysis">Financial Analysis</TabsTrigger>
            <TabsTrigger value="marketing">Marketing</TabsTrigger>
            <TabsTrigger value="financial-matrix">Financial Matrix</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
            <TabsTrigger value="projections">Projections</TabsTrigger>
         </TabsList>

         <TabsContent value="overview" className="space-y-4">
           <ModelOverview model={model} projectId={projectId} /> 
         </TabsContent>

         <TabsContent value="analysis" className="space-y-4">
           <FinancialAnalysis model={model} isWeekly={isWeeklyEvent} />
         </TabsContent>

         <TabsContent value="marketing">
           <MarketingChannelsForm
             marketingSetup={memoizedMarketingSetup}
             updateAssumptions={updateModelAssumptions}
             modelTimeUnit={isWeeklyEvent ? 'Week' : 'Month'}
             metadata={memoizedMetadata}
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
