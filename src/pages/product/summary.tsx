import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { FinancialModel, ActualsPeriodEntry } from '@/lib/db';
import useStore from '@/store/useStore';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { generateForecastTimeSeries, ForecastPeriodData } from '@/lib/financialCalculations';
import { TypographyH4, TypographyMuted } from '@/components/ui/typography';
import ContentCard from '@/components/common/ContentCard';
import ChartContainer from '@/components/common/ChartContainer';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { Sparkline } from '@/components/ui/sparkline';

const ProductSummary: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { currentProject, loadModelsForProject, loadActualsForProject } = useStore();
  const [models, setModels] = useState<FinancialModel[]>([]);
  const [actuals, setActuals] = useState<ActualsPeriodEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Get the latest model (might be null initially)
  const latestModel = models.length > 0 ? models[0] : null;

  // Generate the forecast time series using useMemo
  const timeSeriesData: ForecastPeriodData[] = useMemo(() => {
    if (!latestModel) return [];
    return generateForecastTimeSeries(latestModel);
  }, [latestModel]);

  // Calculate key metrics from the generated time series
  const summaryMetrics = useMemo(() => {
      if (timeSeriesData.length === 0) {
          return { totalRevenue: 0, totalCosts: 0, totalProfit: 0, profitMargin: 0, breakeven: false };
      }
      const finalPeriod = timeSeriesData[timeSeriesData.length - 1];
      const totalRevenue = finalPeriod.cumulativeRevenue;
      const totalCosts = finalPeriod.cumulativeCost;
      const totalProfit = finalPeriod.cumulativeProfit;
      const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
      const breakeven = totalProfit >= 0;
      return { totalRevenue, totalCosts, totalProfit, profitMargin, breakeven };
  }, [timeSeriesData]);

  // Calculate warnings
  const { revenueConcentration, warnings } = useMemo(() => {
      const { totalRevenue, profitMargin, breakeven } = summaryMetrics;
      const revenueStreams = latestModel?.assumptions.revenue || [];
      let revenueConcentration = 0;
      if (totalRevenue > 0 && revenueStreams.length > 0) {
          const highestInitialRevenue = Math.max(0, ...revenueStreams.map(stream => stream.value ?? 0));
          revenueConcentration = (highestInitialRevenue / totalRevenue) * 100; 
      }
      
      const warnings = [];
      if (revenueConcentration > 80) warnings.push({ type: 'Revenue Concentration', message: 'Over 80% of revenue comes from a single source', severity: 'warning' });
      if (profitMargin < 20) warnings.push({ type: 'Low Profit Margin', message: 'Profit margin is below 20%', severity: 'warning' });
      if (!breakeven) warnings.push({ type: 'No Breakeven', message: 'Product does not reach breakeven point', severity: 'error' });
      if (actuals.length === 0) warnings.push({ type: 'No Actuals', message: 'No actual performance data has been recorded', severity: 'info' });

      return { revenueConcentration, warnings };
  }, [summaryMetrics, actuals, latestModel]);
  
  // Data loading useEffect remains here
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
    return <div className="py-8 text-center">Loading product data...</div>;
  }
  
  if (!currentProject) {
    return <div className="py-8 text-center">Product not found</div>;
  }
  
  if (!latestModel) {
    return (
      <div className="py-8 text-center">
        <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
        <TypographyH4>No Forecasts Available</TypographyH4>
        <TypographyMuted className="mt-2">
          This product doesn't have any forecasts yet. Create a forecast to see financial projections.
        </TypographyMuted>
      </div>
    );
  }
  
  // Use summaryMetrics values directly
  const { totalRevenue, totalCosts, totalProfit, profitMargin } = summaryMetrics;
  
  // Simplified breakdown data (can be enhanced later)
  const revenueData = (latestModel.assumptions.revenue || []).map(stream => ({
    name: stream.name,
    value: stream.value
  }));
  const costData = (latestModel.assumptions.costs || []).map(cost => ({
    name: cost.name,
    value: cost.value
  }));

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ContentCard title="Total Revenue">
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold">{formatCurrency(totalRevenue)}</div>
            <TrendingUp className="h-6 w-6 text-fortress-emerald" />
          </div>
        </ContentCard>
        
        <ContentCard title="Total Costs">
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold">{formatCurrency(totalCosts)}</div>
            <TrendingDown className="h-6 w-6 text-red-500" />
          </div>
        </ContentCard>
        
        <ContentCard title="Total Profit">
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold">{formatCurrency(totalProfit)}</div>
            {totalProfit >= 0 ? (
              <CheckCircle className="h-6 w-6 text-fortress-emerald" />
            ) : (
              <AlertTriangle className="h-6 w-6 text-red-500" />
            )}
          </div>
        </ContentCard>
        
        <ContentCard title="Profit Margin">
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold">{formatPercent(profitMargin)}</div>
            {profitMargin >= 20 ? (
              <CheckCircle className="h-6 w-6 text-fortress-emerald" />
            ) : (
              <AlertTriangle className="h-6 w-6 text-amber-500" />
            )}
          </div>
        </ContentCard>
      </div>
      
      {/* Warnings */}
      {warnings.length > 0 && (
        <ContentCard title="Warnings & Alerts">
          <ul className="space-y-3">
            {warnings.map((warning, index) => (
              <li key={index} className={`p-3 rounded-md ${
                warning.severity === 'error' ? 'bg-red-50 border border-red-200' :
                warning.severity === 'warning' ? 'bg-amber-50 border border-amber-200' :
                'bg-blue-50 border border-blue-200'
              }`}>
                <div className="flex items-start">
                  {warning.severity === 'error' ? (
                    <AlertTriangle className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
                  ) : warning.severity === 'warning' ? (
                    <AlertTriangle className="h-5 w-5 text-amber-500 mr-2 mt-0.5" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
                  )}
                  <div>
                    <h4 className={`font-medium ${
                      warning.severity === 'error' ? 'text-red-800' :
                      warning.severity === 'warning' ? 'text-amber-800' :
                      'text-blue-800'
                    }`}>{warning.type}</h4>
                    <p className={`text-sm ${
                      warning.severity === 'error' ? 'text-red-700' :
                      warning.severity === 'warning' ? 'text-amber-700' :
                      'text-blue-700'
                    }`}>
                      {warning.message}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </ContentCard>
      )}
      
      {/* Revenue & Cost Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartContainer
          title="Revenue Breakdown (Base Values)"
          description="By revenue stream assumption"
          height={300}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={val => formatCurrency(val)} />
              <YAxis type="category" dataKey="name" width={150} />
              <Tooltip formatter={(value) => [formatCurrency(value as number), 'Revenue']} />
              <Bar dataKey="value" fill="#10B981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
        
        <ChartContainer
          title="Cost Breakdown (Base Values)"
          description="By cost category assumption"
          height={300}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={costData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={val => formatCurrency(val)} />
              <YAxis type="category" dataKey="name" width={150} />
              <Tooltip formatter={(value) => [formatCurrency(value as number), 'Cost']} />
              <Bar dataKey="value" fill="#EF4444" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
      
      {/* Forecast Chart */}
      <ChartContainer
        title="Financial Forecast"
        description="Revenue, costs, and profit over time"
        height={400}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={timeSeriesData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="point" />
            <YAxis tickFormatter={val => formatCurrency(val)} />
            <Tooltip formatter={(value) => [formatCurrency(value as number), '']} />
            <Legend />
            <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#10B981" strokeWidth={2} />
            <Line type="monotone" dataKey="cost" name="Costs" stroke="#EF4444" strokeWidth={2} />
            <Line type="monotone" dataKey="profit" name="Profit" stroke="#1A2942" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>
      
      {/* Product Details */}
      <ContentCard title="Product Details">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium mb-2">Basic Information</h4>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Product Type</dt>
                <dd className="font-medium">{currentProject.productType}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Target Audience</dt>
                <dd className="font-medium">{currentProject.targetAudience || 'Not specified'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Created</dt>
                <dd className="font-medium">{new Date(currentProject.createdAt).toLocaleDateString()}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Last Updated</dt>
                <dd className="font-medium">{new Date(currentProject.updatedAt).toLocaleDateString()}</dd>
              </div>
            </dl>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">Forecast Information</h4>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Forecast Name</dt>
                <dd className="font-medium">{latestModel.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Growth Model</dt>
                <dd className="font-medium">{latestModel.assumptions.growthModel?.type || 'Not specified'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Growth Rate</dt>
                <dd className="font-medium">{formatPercent(latestModel.assumptions.growthModel?.rate || 0)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Revenue Streams</dt>
                <dd className="font-medium">{latestModel.assumptions.revenue?.length || 0}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Cost Categories</dt>
                <dd className="font-medium">{latestModel.assumptions.costs?.length || 0}</dd>
              </div>
            </dl>
          </div>
        </div>
      </ContentCard>
    </div>
  );
};

export default ProductSummary;
