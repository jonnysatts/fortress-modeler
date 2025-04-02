import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, PlusCircle, TrendingUp, AlertTriangle, FolderIcon, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useStore from '@/store/useStore';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from 'recharts';
import ChartContainer from '@/components/common/ChartContainer';
import ContentCard from '@/components/common/ContentCard';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { TypographyH4, TypographyMuted } from '@/components/ui/typography';
import { Project, FinancialModel } from '@/lib/db';
import { Badge } from '@/components/ui/badge';
import { Sparkline, SparklinePoint } from '@/components/ui/sparkline';

const PortfolioDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { projects, loadProjects } = useStore();
  const [projectsWithMetrics, setProjectsWithMetrics] = useState<Array<Project & { 
    totalRevenue: number;
    totalProfit: number;
    profitMargin: number;
    hasActuals: boolean;
    revenueConcentration: number;
    breakeven: boolean;
    sparklineData: number[];
  }>>([]);
  
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);
  
  useEffect(() => {
    const getProjectMetrics = async () => {
      const projectMetrics = await Promise.all(projects.map(async (project) => {
        // Load models for this project
        const models = await useStore.getState().loadModelsForProject(project.id!);
        const actuals = await useStore.getState().loadActualsForProject(project.id!);
        
        // Get the latest model
        const latestModel = models.length > 0 ? models[0] : null;
        
        // Calculate metrics
        let totalRevenue = 0;
        let totalProfit = 0;
        let profitMargin = 0;
        let revenueConcentration = 0;
        let breakeven = false;
        let sparklineData: number[] = [];
        
        if (latestModel?.assumptions) {
          // Calculate total revenue from the model
          const { revenue = [], costs = [] } = latestModel.assumptions;
          
          // Calculate total revenue
          totalRevenue = revenue.reduce((sum, stream) => sum + stream.value, 0);
          
          // Calculate revenue concentration (highest revenue source as % of total)
          if (totalRevenue > 0) {
            const highestRevenue = Math.max(...revenue.map(stream => stream.value));
            revenueConcentration = (highestRevenue / totalRevenue) * 100;
          }
          
          // Calculate total costs
          const totalCosts = costs.reduce((sum, cost) => sum + cost.value, 0);
          
          // Calculate profit and margin
          totalProfit = totalRevenue - totalCosts;
          profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
          
          // Determine if project breaks even
          breakeven = totalProfit >= 0;
          
          // Generate sparkline data (simplified for demo)
          sparklineData = Array.from({ length: 12 }, (_, i) => {
            const growth = latestModel.assumptions.growthModel?.rate || 0.05;
            return totalRevenue * Math.pow(1 + growth, i);
          });
        }
        
        return {
          ...project,
          totalRevenue,
          totalProfit,
          profitMargin,
          hasActuals: actuals.length > 0,
          revenueConcentration,
          breakeven,
          sparklineData
        };
      }));
      
      // Sort by profit (descending)
      projectMetrics.sort((a, b) => b.totalProfit - a.totalProfit);
      
      setProjectsWithMetrics(projectMetrics);
    };
    
    if (projects.length > 0) {
      getProjectMetrics();
    }
  }, [projects]);
  
  // Calculate portfolio totals
  const portfolioTotals = projectsWithMetrics.reduce((totals, project) => {
    return {
      revenue: totals.revenue + project.totalRevenue,
      profit: totals.profit + project.totalProfit,
      projectsWithActuals: totals.projectsWithActuals + (project.hasActuals ? 1 : 0),
      projectsWithWarnings: totals.projectsWithWarnings + (
        project.revenueConcentration > 80 || 
        project.profitMargin < 20 || 
        !project.breakeven ? 1 : 0
      )
    };
  }, { revenue: 0, profit: 0, projectsWithActuals: 0, projectsWithWarnings: 0 });
  
  // Prepare data for charts
  const topProjects = projectsWithMetrics.slice(0, 5);
  const projectRevenueData = topProjects.map(project => ({
    name: project.name,
    revenue: project.totalRevenue
  }));
  
  const projectProfitData = topProjects.map(project => ({
    name: project.name,
    profit: project.totalProfit
  }));
  
  const COLORS = ['#1A2942', '#3E5C89', '#10B981', '#334155'];
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ContentCard
          title="Total Products"
          description="Currently active products"
        >
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold">{projects.length}</div>
            <FolderIcon className="h-8 w-8 text-fortress-blue" />
          </div>
        </ContentCard>

        <ContentCard
          title="Total Revenue (YTD)"
          description="Across all products"
        >
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold">{formatCurrency(portfolioTotals.revenue)}</div>
            <TrendingUp className="h-8 w-8 text-fortress-emerald" />
          </div>
        </ContentCard>

        <ContentCard
          title="Products with Warnings"
          description="Requiring attention"
        >
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold">{portfolioTotals.projectsWithWarnings}</div>
            <AlertTriangle className="h-8 w-8 text-amber-500" />
          </div>
        </ContentCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartContainer
          title="Revenue by Product"
          description="Top 5 products by revenue"
          height={320}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={projectRevenueData}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={val => formatCurrency(val)} />
              <Tooltip 
                formatter={(value) => [formatCurrency(value as number), 'Revenue']} 
                contentStyle={{ 
                  backgroundColor: '#f8fafc', 
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px'
                }}
              />
              <Bar dataKey="revenue" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>

        <ChartContainer
          title="Profit by Product"
          description="Top 5 products by profit"
          height={320}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={projectProfitData}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={val => formatCurrency(val)} />
              <Tooltip 
                formatter={(value) => [formatCurrency(value as number), 'Profit']} 
                contentStyle={{ 
                  backgroundColor: '#f8fafc', 
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px'
                }}
              />
              <Bar dataKey="profit" fill="#1A2942" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      <ContentCard
        title="Product Performance"
        description="All products sorted by profit"
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="py-2 px-4 text-left">Product</th>
                <th className="py-2 px-4 text-right">Revenue</th>
                <th className="py-2 px-4 text-right">Profit</th>
                <th className="py-2 px-4 text-right">Margin</th>
                <th className="py-2 px-4 text-center">Trend</th>
                <th className="py-2 px-4 text-center">Status</th>
                <th className="py-2 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {projectsWithMetrics.map(project => (
                <tr key={project.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="font-medium">{project.name}</div>
                    <div className="text-xs text-muted-foreground">{project.productType}</div>
                  </td>
                  <td className="py-3 px-4 text-right">{formatCurrency(project.totalRevenue)}</td>
                  <td className="py-3 px-4 text-right">{formatCurrency(project.totalProfit)}</td>
                  <td className="py-3 px-4 text-right">{formatPercent(project.profitMargin)}</td>
                  <td className="py-3 px-4">
                    <div className="flex justify-center">
                      <Sparkline 
                        data={project.sparklineData} 
                        width={100} 
                        height={30} 
                        color={project.totalProfit >= 0 ? "#10B981" : "#EF4444"} 
                      />
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1 justify-center">
                      {project.revenueConcentration > 80 && (
                        <Badge variant="warning" className="text-xs">Revenue Concentration</Badge>
                      )}
                      {project.profitMargin < 20 && (
                        <Badge variant="destructive" className="text-xs">Low Margin</Badge>
                      )}
                      {!project.breakeven && (
                        <Badge variant="destructive" className="text-xs">No Breakeven</Badge>
                      )}
                      {!project.hasActuals && (
                        <Badge variant="outline" className="text-xs">No Actuals</Badge>
                      )}
                      {project.hasActuals && 
                       project.revenueConcentration <= 80 && 
                       project.profitMargin >= 20 && 
                       project.breakeven && (
                        <Badge variant="success" className="text-xs">Healthy</Badge>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => navigate(`/products/${project.id}/summary`)}
                    >
                      <ArrowUpRight className="h-4 w-4" />
                      <span className="sr-only">View</span>
                    </Button>
                  </td>
                </tr>
              ))}
              {projectsWithMetrics.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted-foreground">
                    No products found. Create your first product to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="mt-4 flex justify-end">
          <Button 
            onClick={() => navigate("/projects/new")} 
            className="bg-fortress-emerald hover:bg-fortress-emerald/90"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            New Product
          </Button>
        </div>
      </ContentCard>
    </div>
  );
};

export default PortfolioDashboard;
