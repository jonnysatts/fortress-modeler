
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, PlusCircle, TrendingUp, AlertTriangle, Target, DollarSign, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { usePortfolioAnalytics, usePerformanceChartData, useRiskAnalysis, useVarianceIndicators } from "@/hooks/usePortfolioAnalytics";
import { KPICard, VarianceIndicator } from "@/components/dashboard/KPICard";
import { ForecastAccuracyCard } from "@/components/dashboard/ForecastAccuracyCard";
import { PortfolioHealthSummary } from "@/components/dashboard/ProjectHealthCard";
import { VarianceTrendSummary } from "@/components/dashboard/VarianceTrendChart";
import { useMyProjects } from "@/hooks/useProjects";
import { useForecastAccuracy } from "@/hooks/useForecastAccuracy";
import { useProjectHealth } from "@/hooks/useProjectHealth";
import { useVarianceTrends } from "@/hooks/useVarianceTrends";

const Dashboard = () => {
  const navigate = useNavigate();
  const { data: projects = [], isLoading: projectsLoading } = useMyProjects();
  
  // Use enhanced analytics hooks
  const { data: analytics, isLoading: analyticsLoading, error: analyticsError } = usePortfolioAnalytics();
  const { data: chartData, isLoading: chartLoading } = usePerformanceChartData();
  const { riskData, totalRisk, isLoading: riskLoading } = useRiskAnalysis();
  const { indicators, dataCompleteness, projectsWithActuals, totalProjects } = useVarianceIndicators();
  const { data: forecastAccuracy, isLoading: forecastLoading, error: forecastError } = useForecastAccuracy();
  const { data: projectHealth, isLoading: healthLoading } = useProjectHealth();
  const { data: varianceTrends, isLoading: varianceLoading } = useVarianceTrends();

  const isLoading = projectsLoading || analyticsLoading;

  // Get metrics from analytics service
  const portfolioMetrics = analytics?.portfolioMetrics;
  const hasActuals = (portfolioMetrics?.projectsWithActuals || 0) > 0;
  

  const COLORS = ['#1A2942', '#3E5C89', '#10B981', '#334155'];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-fortress-blue">Dashboard</h1>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-muted rounded h-32" />
            ))}
          </div>
          <div className="bg-muted rounded h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-fortress-blue">Dashboard</h1>
          {hasActuals && (
            <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium">
              <Target className="h-3 w-3" />
              Actual Data Available ({dataCompleteness?.toFixed(0)}% complete)
            </div>
          )}
        </div>
        <Button onClick={() => navigate("/projects/new")} className="bg-fortress-emerald hover:bg-fortress-emerald/90">
          <PlusCircle className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>

      {/* Data Completeness Alert */}
      {portfolioMetrics && dataCompleteness !== undefined && dataCompleteness < 50 && totalProjects > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Only {projectsWithActuals} of {totalProjects} projects have actual data. 
            Add performance data to see variance insights and trends.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Projects KPI */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-fortress-emerald" />
              Total Projects
            </CardTitle>
            <CardDescription>Currently active projects</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">{projects.length}</div>
              {hasActuals && (
                <div className="text-xs text-green-600">
                  {projectsWithActuals} with actuals
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Revenue KPI */}
        {portfolioMetrics && (
          <KPICard
            title="Revenue"
            description={hasActuals ? "Actual vs projected revenue" : "Projected revenue"}
            value={hasActuals ? portfolioMetrics.totalActualRevenue : portfolioMetrics.totalProjectedRevenue}
            projectedValue={portfolioMetrics.totalProjectedRevenue}
            variance={portfolioMetrics.revenueVariance}
            icon={<DollarSign className="h-8 w-8 text-fortress-emerald" />}
            formatValue={(v) => `$${v.toLocaleString()}`}
            hasActualData={hasActuals}
            periodsCompared={portfolioMetrics.totalPeriodsWithActuals}
          />
        )}

        {/* Costs KPI */}
        {portfolioMetrics && (
          <KPICard
            title="Costs"
            description={hasActuals ? "Actual vs projected costs" : "Projected costs"}
            value={hasActuals ? portfolioMetrics.totalActualCosts : portfolioMetrics.totalProjectedCosts}
            projectedValue={portfolioMetrics.totalProjectedCosts}
            variance={portfolioMetrics.costVariance}
            icon={<TrendingDown className="h-8 w-8 text-red-500" />}
            formatValue={(v) => `$${v.toLocaleString()}`}
            hasActualData={hasActuals}
            periodsCompared={portfolioMetrics.totalPeriodsWithActuals}
          />
        )}

        {/* Profit KPI */}
        {portfolioMetrics && (
          <KPICard
            title="Profit"
            description={hasActuals ? "Actual vs projected profit" : "Projected profit"}
            value={hasActuals ? portfolioMetrics.totalActualProfit : portfolioMetrics.totalProjectedProfit}
            projectedValue={portfolioMetrics.totalProjectedProfit}
            variance={portfolioMetrics.profitVariance}
            icon={<TrendingUp className="h-8 w-8 text-fortress-emerald" />}
            formatValue={(v) => `$${v.toLocaleString()}`}
            hasActualData={hasActuals}
            periodsCompared={portfolioMetrics.totalPeriodsWithActuals}
          />
        )}
      </div>

      {/* Variance Indicators Section */}
      {hasActuals && indicators.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Performance vs Projections</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {indicators.map((indicator, index) => (
              <VarianceIndicator
                key={index}
                metric={indicator.metric}
                variance={indicator.variance}
                actual={indicator.actual}
                projected={indicator.projected}
                status={indicator.status}
              />
            ))}
          </div>
        </div>
      )}

      {/* Forecast Accuracy Section */}
      {hasActuals && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            {forecastLoading ? (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-medium">Forecast Accuracy</CardTitle>
                  <CardDescription>Loading accuracy metrics...</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="animate-pulse space-y-4">
                    <div className="h-12 bg-muted rounded"></div>
                    <div className="h-2 bg-muted rounded"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-4 bg-muted rounded w-1/2"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : forecastError ? (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-medium">Forecast Accuracy</CardTitle>
                  <CardDescription>Unable to load accuracy data</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    <AlertTriangle className="h-4 w-4 text-amber-500 inline mr-2" />
                    Failed to calculate forecast accuracy. Please try refreshing the page.
                  </div>
                </CardContent>
              </Card>
            ) : forecastAccuracy && forecastAccuracy.projectsAnalyzed > 0 ? (
              <ForecastAccuracyCard
                overallMAPE={forecastAccuracy.overallMAPE}
                accuracyTrend={forecastAccuracy.accuracyTrend}
                confidenceScore={forecastAccuracy.confidenceScore}
                projectsAnalyzed={forecastAccuracy.projectsAnalyzed}
                projectsWithPoorAccuracy={forecastAccuracy.projectsWithPoorAccuracy}
              />
            ) : null}
          </div>
          <div className="md:col-span-2">
            {/* Variance Trends Summary */}
            {varianceTrends && varianceTrends.varianceTrends.length > 0 && (
              <VarianceTrendSummary
                varianceTrends={varianceTrends.varianceTrends}
                title="Variance Trends"
              />
            )}
          </div>
        </div>
      )}

      {/* Advanced Analytics Section - Phase A2 & A3 */}
      {hasActuals && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Project Health Summary */}
          {projectHealth && (
            <PortfolioHealthSummary
              healthScores={projectHealth.healthScores}
              title="Portfolio Health"
            />
          )}
          
          {/* Space for additional analytics */}
          <div className="space-y-4">
            {projectHealth && projectHealth.allInsights.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-medium">Key Insights</CardTitle>
                  <CardDescription>
                    Critical insights across your portfolio
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {projectHealth.allInsights.slice(0, 3).map((insight, index) => (
                      <div 
                        key={index}
                        className={cn(
                          "p-3 rounded-lg border-l-4",
                          insight.severity === 'high' ? "border-red-500 bg-red-50" :
                          insight.severity === 'medium' ? "border-yellow-500 bg-yellow-50" :
                          "border-blue-500 bg-blue-50"
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">{insight.title}</h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              {insight.description}
                            </p>
                          </div>
                          <Badge 
                            variant="outline"
                            className={cn(
                              "text-xs ml-2",
                              insight.severity === 'high' ? "border-red-500 text-red-700" :
                              insight.severity === 'medium' ? "border-yellow-500 text-yellow-700" :
                              "border-blue-500 text-blue-700"
                            )}
                          >
                            {insight.severity}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {projectHealth.allInsights.length > 3 && (
                      <p className="text-xs text-muted-foreground text-center">
                        +{projectHealth.allInsights.length - 3} more insights available
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Actual vs Projected Performance</CardTitle>
            <CardDescription>Revenue comparison over time</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {chartData && chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => [
                      `$${value?.toLocaleString() || 0}`, 
                      name === 'actual' ? 'Actual Revenue' : 'Projected Revenue'
                    ]} 
                    contentStyle={{ 
                      backgroundColor: '#f8fafc', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="projected" fill="#94A3B8" name="Projected" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="actual" fill="#10B981" name="Actual" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-center">
                <div>
                  <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-muted-foreground">No performance data yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Add actual performance data to see variance charts
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Project Risk Analysis</CardTitle>
            <CardDescription>Based on variance and performance trends</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {riskData && riskData.length > 0 ? (
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
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
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
                  <div className="text-center mt-2">
                    <div className="text-sm text-muted-foreground">
                      Average Risk Score: {totalRisk?.toFixed(1) || 0}/100
                    </div>
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
            <CardDescription>Individual project metrics and variance analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.projectPerformance.slice(0, 5).map((project) => (
                <div 
                  key={project.projectId}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/projects/${project.projectId}`)}
                >
                  <div className="flex-1">
                    <h3 className="font-medium">{project.projectName}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Revenue: ${project.actualRevenue.toLocaleString()}</span>
                      <span>Profit: ${project.actualProfit.toLocaleString()}</span>
                      {project.hasActuals && (
                        <span className={`font-medium ${project.revenueVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {project.revenueVariance >= 0 ? '+' : ''}{project.revenueVariance.toFixed(1)}% variance
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {project.hasActuals ? (
                      <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs">
                        <Target className="h-3 w-3" />
                        {project.periodsWithData} periods
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 text-amber-800 text-xs">
                        <AlertTriangle className="h-3 w-3" />
                        No actuals
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
            <CardTitle>Analytics Status</CardTitle>
            <CardDescription>Portfolio data quality and completeness</CardDescription>
          </CardHeader>
          <CardContent>
            {portfolioMetrics ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Data Completeness</span>
                  <span className="font-medium">{dataCompleteness?.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-fortress-emerald h-2 rounded-full" 
                    style={{ width: `${dataCompleteness}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{projectsWithActuals} projects with actual data</span>
                  <span>{totalProjects} total projects</span>
                </div>
                {dataCompleteness && dataCompleteness < 50 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                    <div className="flex items-start">
                      <AlertTriangle className="h-4 w-4 text-amber-500 mr-2 mt-0.5" />
                      <div>
                        <p className="text-sm text-amber-700">
                          Add actual performance data to see variance insights and improved analytics.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-muted-foreground">Loading analytics...</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
