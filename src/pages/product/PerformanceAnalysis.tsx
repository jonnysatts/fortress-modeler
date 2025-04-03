import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FinancialModel, ActualsPeriodEntry } from '@/lib/db';
import useStore from '@/store/useStore';
import { PerformanceAnalysis } from '@/components/product/PerformanceAnalysis';
import { TypographyH4, TypographyMuted } from '@/components/ui/typography';
import { AlertTriangle } from 'lucide-react';

const ProductAnalysis: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { currentProject, loadModelsForProject, loadActualsForProject } = useStore();
  const [models, setModels] = useState<FinancialModel[]>([]);
  const [actuals, setActuals] = useState<ActualsPeriodEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const loadData = async () => {
      if (id) {
        setIsLoading(true);
        try {
          const projectId = parseInt(id);
          const loadedModels = await loadModelsForProject(projectId);
          const loadedActuals = await loadActualsForProject(projectId);
          
          setModels(loadedModels);
          setActuals(loadedActuals);
        } catch (error) {
          console.error('Error loading data:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    loadData();
  }, [id, loadModelsForProject, loadActualsForProject]);
  
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
      
      <PerformanceAnalysis 
        financialModels={models} 
        actualsData={actuals} 
        projectId={id} 
      />
    </div>
  );
};

export default ProductAnalysis;
