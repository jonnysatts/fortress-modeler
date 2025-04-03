import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FinancialModel, ActualsPeriodEntry } from '@/lib/db';
import useStore from '@/store/useStore';
import { PerformanceAnalysis as PerformanceAnalysisComponent } from '@/components/product/PerformanceAnalysis';
import { TypographyH4, TypographyMuted } from '@/components/ui/typography';
import { AlertTriangle } from 'lucide-react';

// Restore original name
const PerfAnalysisView: React.FC = () => {
  console.log("[PerfAnalysisPage] Component attempting to mount/render"); 
  const { projectId } = useParams<{ projectId: string }>();
  const { currentProject, loadModelsForProject, loadActualsForProject } = useStore();
  const [models, setModels] = useState<FinancialModel[]>([]);
  const [actuals, setActuals] = useState<ActualsPeriodEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const loadData = async () => {
      console.log(`[PerfAnalysisPage Effect] Running for projectId: ${projectId}`);
      if (projectId) { 
        setIsLoading(true); 
        try {
          const projectIdNum = parseInt(projectId);
          if (isNaN(projectIdNum)) {
            console.error('[PerfAnalysisPage Effect] Invalid projectId:', projectId);
            setIsLoading(false); 
            return;
          }
          console.log(`[PerfAnalysisPage Effect] Fetching models for projectId: ${projectIdNum}`);
          const loadedModels = await loadModelsForProject(projectIdNum);
          console.log(`[PerfAnalysisPage Effect] Fetched ${loadedModels.length} models.`);
          console.log(`[PerfAnalysisPage Effect] Fetching actuals for projectId: ${projectIdNum}`);
          const loadedActuals = await loadActualsForProject(projectIdNum);
          console.log(`[PerfAnalysisPage Effect] Fetched ${loadedActuals.length} actuals.`);
          
          setModels(loadedModels);
          setActuals(loadedActuals);
          console.log(`[PerfAnalysisPage Effect] State updated.`);
          setIsLoading(false);
        } catch (error) {
          console.error('[PerfAnalysisPage Effect] Error loading data:', error);
          setIsLoading(false); 
        } finally {
          // Ensure loading is always set to false
          setIsLoading(false);
          console.log(`[PerfAnalysisPage Effect] Finished (finally), isLoading set to false.`);
        }
      } else {
          console.log(`[PerfAnalysisPage Effect] No projectId provided.`);
          setIsLoading(false);
      }
    };
    loadData();
  }, [projectId, loadModelsForProject, loadActualsForProject]); 
  
  console.log(`[PerfAnalysisPage Render] isLoading: ${isLoading}, Project: ${currentProject?.id}, Models: ${models.length}, Actuals: ${actuals.length}`);

  if (isLoading) {
    return <div className="py-8 text-center">Loading analysis data...</div>;
  }
  
  if (!currentProject) {
    return <div className="py-8 text-center">Product not found</div>;
  }
  
  if (models.length === 0) {
    return (
      <div className="py-8 text-center">
        <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
        <TypographyH4>No Forecasts Available</TypographyH4>
        <TypographyMuted className="mt-2">
          This product doesn't have any forecasts yet. Create a forecast to analyze performance.
        </TypographyMuted>
      </div>
    );
  }
  
  if (actuals.length === 0) {
    return (
      <div className="py-8 text-center">
        <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
        <TypographyH4>No Actuals Recorded</TypographyH4>
        <TypographyMuted className="mt-2">
          You need to record actual performance data before you can analyze performance against forecasts.
        </TypographyMuted>
      </div>
    );
  }
  
  return (
    <div>
      <div className="mb-6">
        <TypographyH4>Performance Analysis</TypographyH4>
        <TypographyMuted>
          Compare actual performance against forecasts
        </TypographyMuted>
      </div>
      
      {/* Render the actual component */}
      <PerformanceAnalysisComponent 
        financialModels={models} 
        actualsData={actuals} 
        projectId={projectId} 
      />
      
    </div>
  );
};

// Restore original export
export default PerfAnalysisView;
