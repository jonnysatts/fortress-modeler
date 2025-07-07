import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, PlusCircle, TrendingUp, AlertTriangle, DollarSign, Target, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from "recharts";
import { useMyProjects } from "@/hooks/useProjects";
import { usePortfolioAnalytics, usePerformanceChartData, useRiskAnalysis, useVarianceIndicators } from "@/hooks/usePortfolioAnalytics";
import { KPICard, VarianceIndicator } from "@/components/dashboard/KPICard";

const EnhancedDashboard = () => {
  const navigate = useNavigate();
  const { data: projects = [], isLoading: projectsLoading } = useMyProjects();
  const { data: analytics, isLoading: analyticsLoading } = usePortfolioAnalytics();
  const { data: chartData, isLoading: chartLoading } = usePerformanceChartData();
  const { riskData, totalRisk, projectRisks } = useRiskAnalysis();
  const { indicators, dataCompleteness, projectsWithActuals, totalProjects } = useVarianceIndicators();

  const isLoading = projectsLoading || analyticsLoading;

  const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  const formatCurrency = (value: number) => `$${value.toLocaleString()}`;
  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-fortress-blue">Dashboard</h1>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-muted rounded h-32" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-muted rounded h-64" />
            <div className="bg-muted rounded h-64" />
          </div>
        </div>
      </div>
    );
  }

  const portfolioMetrics = analytics?.portfolioMetrics;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-fortress-blue">Portfolio Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Real-time insights from {projectsWithActuals} of {totalProjects} projects with actual data
          </p>
        </div>
        <Button onClick={() => navigate("/projects/new")} className="bg-fortress-emerald hover:bg-fortress-emerald/90">
          <PlusCircle className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>

      {/* Data Completeness Alert */}
      {dataCompleteness < 50 && totalProjects > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-amber-500 mr-3 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-800">Limited Actual Data</h4>
                <p className="text-sm text-amber-700 mt-1">
                  Only {projectsWithActuals} of {totalProjects} projects have actual performance data. 
                  Add actual data to your projects for more accurate insights.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <KPICard
          title="Actual Revenue"
          description="Total recorded revenue"
          value={portfolioMetrics?.totalActualRevenue || 0}
          projectedValue={portfolioMetrics?.totalProjectedRevenue}
          variance={portfolioMetrics?.revenueVariance}
          icon={<DollarSign className="h-8 w-8 text-green-600" />}
          formatValue={formatCurrency}
          hasActualData={projectsWithActuals > 0}
        />

        <KPICard
          title="Actual Costs"
          description="Total recorded costs"
          value={portfolioMetrics?.totalActualCosts || 0}
          projectedValue={portfolioMetrics?.totalProjectedCosts}
          variance={portfolioMetrics?.costVariance}
          icon={<Target className="h-8 w-8 text-red-600" />}
          formatValue={formatCurrency}
          hasActualData={projectsWithActuals > 0}
        />

        <KPICard
          title="Actual Profit"
          description="Total recorded profit"
          value={portfolioMetrics?.totalActualProfit || 0}
          projectedValue={portfolioMetrics?.totalProjectedProfit}
          variance={portfolioMetrics?.profitVariance}
          icon={<TrendingUp className="h-8 w-8 text-fortress-emerald" />}
          formatValue={formatCurrency}
          hasActualData={projectsWithActuals > 0}
        />

        <KPICard
          title="Portfolio Risk"
          description="Average risk score"
          value={totalRisk}
          icon={<AlertTriangle className="h-8 w-8 text-amber-500" />}
          formatValue={(v) => `${v.toFixed(0)}/100`}
          showVariance={false}
          hasActualData={true}
        />
      </div>

      {/* Variance Indicators */}
      {indicators.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Performance vs Projections</CardTitle>
            <CardDescription>How your actual performance compares to initial projections</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {indicators.map((indicator) => (
                <VarianceIndicator
                  key={indicator.metric}
                  metric={indicator.metric}
                  variance={indicator.variance}
                  actual={indicator.actual}
                  projected={indicator.projected}
                  status={indicator.status}
                  formatValue={formatCurrency}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Actual vs Projected Performance</CardTitle>
            <CardDescription>Revenue performance over time</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {chartData.length > 0 && !chartLoading ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                  <Tooltip 
                    formatter={(value, name) => [
                      `$${Number(value).toLocaleString()}`, 
                      name === 'actual' ? 'Actual Revenue' : 'Projected Revenue'
                    ]} 
                    contentStyle={{ 
                      backgroundColor: '#f8fafc', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="projected" fill="#e2e8f0" name="Projected" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="actual" fill="#10B981" name="Actual" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-center">
                <div>
                  <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-muted-foreground">No performance data yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Add actual data to your projects to see performance trends
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Project Risk Distribution</CardTitle>
            <CardDescription>Risk assessment across all projects</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {riskData.length > 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-full h-full flex flex-col">
                  <div className="flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={riskData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {riskData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value) => [`${value} projects`, '']} 
                          contentStyle={{ 
                            backgroundColor: '#f8fafc', 
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px' 
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-center">
                <div>
                  <AlertTriangle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-muted-foreground">No risk data available</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Risk analysis requires actual performance data
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Project Performance Summary */}
      {analytics?.projectPerformance && analytics.projectPerformance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Project Performance Summary</CardTitle>
            <CardDescription>Individual project performance vs projections</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.projectPerformance.slice(0, 5).map((project) => (
                <div 
                  key={project.projectId} 
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/projects/${project.projectId}`)}
                >
                  <div>
                    <h3 className="font-medium">{project.projectName}</h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>Revenue: {formatCurrency(project.actualRevenue)}</span>
                      <span>Profit: {formatCurrency(project.actualProfit)}</span>
                      {!project.hasActuals && (
                        <span className="text-amber-600 flex items-center">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          No actuals
                        </span>
                      )}
                    </div>
                  </div>
                  {project.hasActuals && (
                    <div className="flex items-center space-x-2">
                      <div className={`flex items-center text-xs px-2 py-1 rounded-full ${
                        project.revenueVariance >= 0 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {project.revenueVariance >= 0 ? '+' : ''}{project.revenueVariance.toFixed(1)}%
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {analytics.projectPerformance.length > 5 && (
                <Button variant="outline" className="w-full" onClick={() => navigate('/projects')}>
                  View All {analytics.projectPerformance.length} Projects
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Projects */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Projects</CardTitle>
            <CardDescription>Your most recently created projects</CardDescription>
          </CardHeader>
          <CardContent>
            {projects.length > 0 ? (
              <ul className="space-y-2">
                {projects.slice(0, 5).map((project) => (
                  <li 
                    key={project.id} 
                    className="p-3 border rounded-md hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-medium">{project.name}</h3>
                        <p className="text-sm text-muted-foreground">{project.productType}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(project.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-6">
                <p className="text-muted-foreground">No projects yet.</p>
                <Button 
                  variant="outline" 
                  className="mt-2"
                  onClick={() => navigate("/projects/new")}
                >
                  Create Your First Project
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Quality Status</CardTitle>
            <CardDescription>Track your data collection progress</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Projects with Actual Data</span>
                  <span>{projectsWithActuals}/{totalProjects}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-fortress-emerald h-2 rounded-full" 
                    style={{ width: `${dataCompleteness}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">{dataCompleteness.toFixed(0)}% complete</p>
              </div>
              
              {dataCompleteness < 100 && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <div className="flex items-start">
                    <Activity className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-800">Improve Your Analytics</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        Add actual performance data to {totalProjects - projectsWithActuals} more projects to get more accurate insights.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EnhancedDashboard;