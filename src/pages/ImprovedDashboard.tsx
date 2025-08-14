import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3, 
  PlusCircle, 
  TrendingUp, 
  AlertTriangle, 
  Target, 
  DollarSign, 
  TrendingDown,
  Activity,
  ArrowRight,
  Calendar,
  ChevronRight,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, LineChart, Line, Area, AreaChart } from "recharts";
import { usePortfolioAnalytics, usePerformanceChartData, useVarianceIndicators } from "@/hooks/usePortfolioAnalytics";
import { KPICard, VarianceIndicator } from "@/components/dashboard/KPICard";
import { ForecastAccuracyCard } from "@/components/dashboard/ForecastAccuracyCard";
import { PortfolioHealthSummary } from "@/components/dashboard/ProjectHealthCard";
import { VarianceTrendSummary } from "@/components/dashboard/VarianceTrendChart";
import { RiskInsights } from "@/components/dashboard/RiskInsights";
import { useMyProjects } from "@/hooks/useProjects";
import { useForecastAccuracy } from "@/hooks/useForecastAccuracy";
import { useProjectHealth } from "@/hooks/useProjectHealth";
import { useVarianceTrends } from "@/hooks/useVarianceTrends";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";

// Enhanced KPI Card Component with better visual design
const EnhancedKPICard = ({ 
  title, 
  value, 
  change, 
  changeType = 'neutral', 
  icon, 
  description,
  trend = []
}: {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  description?: string;
  trend?: number[];
}) => {
  const changeColors = {
    positive: 'text-green-600 bg-green-50',
    negative: 'text-red-600 bg-red-50',
    neutral: 'text-gray-600 bg-gray-50'
  };

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200 overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="p-2 bg-fortress-emerald/10 rounded-lg">
            {icon}
          </div>
          {change && (
            <span className={cn(
              "text-xs font-medium px-2 py-1 rounded-full",
              changeColors[changeType]
            )}>
              {change}
            </span>
          )}
        </div>
        
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
        </div>

        {trend.length > 0 && (
          <div className="mt-4 h-8">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend.map((v, i) => ({ value: v, index: i }))}>
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="none" 
                  fill={changeType === 'positive' ? '#10b981' : changeType === 'negative' ? '#ef4444' : '#6b7280'}
                  fillOpacity={0.2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const ImprovedDashboard = () => {
  const navigate = useNavigate();
  const { data: projects = [], isLoading: projectsLoading } = useMyProjects();
  const [eventFilter, setEventFilter] = useState<'all' | 'weekly' | 'special'>('all');

  // Use enhanced analytics hooks
  const { data: analytics, isLoading: analyticsLoading } = usePortfolioAnalytics(eventFilter);
  const { data: chartData } = usePerformanceChartData(eventFilter);
  const { indicators, dataCompleteness, projectsWithActuals, totalProjects } = useVarianceIndicators(eventFilter);
  const { data: forecastAccuracy } = useForecastAccuracy();
  const { data: projectHealth } = useProjectHealth();
  const { data: varianceTrends } = useVarianceTrends();

  const isLoading = projectsLoading || analyticsLoading;
  const filteredProjects = eventFilter === 'all' ? projects : projects.filter(p => p.event_type === eventFilter);
  const portfolioMetrics = analytics?.portfolioMetrics;
  const hasActuals = (portfolioMetrics?.projectsWithActuals || 0) > 0;

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-muted rounded-lg h-40" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const formatCurrency = (value: number) => `$${Math.round(value).toLocaleString()}`;
  const formatPercent = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Monitor your portfolio performance and insights
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={eventFilter} onValueChange={(v) => setEventFilter(v as any)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="special">Special</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            onClick={() => navigate("/projects/new")} 
            className="bg-fortress-emerald hover:bg-fortress-emerald/90"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </div>
      </div>

      {/* Data Completeness Banner */}
      {hasActuals && dataCompleteness < 100 && (
        <Alert className="border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            <div className="flex items-center justify-between">
              <span>
                <strong>{projectsWithActuals} of {totalProjects}</strong> projects have actual performance data
              </span>
              <div className="flex items-center gap-2">
                <Progress value={dataCompleteness} className="w-24 h-2" />
                <span className="text-sm font-medium">{Math.round(dataCompleteness)}%</span>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <EnhancedKPICard
          title="Total Projects"
          value={filteredProjects.length.toString()}
          icon={<BarChart3 className="h-5 w-5 text-fortress-emerald" />}
          description={`${projectsWithActuals} with actual data`}
          changeType="neutral"
        />

        {portfolioMetrics && (
          <>
            <EnhancedKPICard
              title="Revenue"
              value={formatCurrency(
                hasActuals ? portfolioMetrics.totalActualRevenue : portfolioMetrics.totalProjectedRevenue
              )}
              change={hasActuals ? formatPercent(portfolioMetrics.revenueVariance) : undefined}
              changeType={portfolioMetrics.revenueVariance >= 0 ? 'positive' : 'negative'}
              icon={<DollarSign className="h-5 w-5 text-fortress-emerald" />}
              description={hasActuals ? "vs projected" : "Projected total"}
            />

            <EnhancedKPICard
              title="Costs"
              value={formatCurrency(
                hasActuals ? portfolioMetrics.totalActualCosts : portfolioMetrics.totalProjectedCosts
              )}
              change={hasActuals ? formatPercent(portfolioMetrics.costVariance) : undefined}
              changeType={portfolioMetrics.costVariance <= 0 ? 'positive' : 'negative'}
              icon={<TrendingDown className="h-5 w-5 text-red-500" />}
              description={hasActuals ? "vs projected" : "Projected total"}
            />

            <EnhancedKPICard
              title="Profit"
              value={formatCurrency(
                hasActuals ? portfolioMetrics.totalActualProfit : portfolioMetrics.totalProjectedProfit
              )}
              change={hasActuals ? formatPercent(portfolioMetrics.profitVariance) : undefined}
              changeType={portfolioMetrics.profitVariance >= 0 ? 'positive' : 'negative'}
              icon={<TrendingUp className="h-5 w-5 text-green-500" />}
              description={hasActuals ? "vs projected" : "Projected total"}
            />
          </>
        )}
      </div>

      {/* Performance Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Performance Overview</span>
              <Badge variant="outline" className="font-normal">
                <Activity className="h-3 w-3 mr-1" />
                Live Data
              </Badge>
            </CardTitle>
            <CardDescription>Actual vs Projected Revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {chartData && chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                    <Tooltip 
                      formatter={(value: any) => formatCurrency(value)}
                      contentStyle={{ 
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                      }}
                    />
                    <Legend />
                    <Bar 
                      dataKey="projected" 
                      fill="#cbd5e1" 
                      name="Projected" 
                      radius={[8, 8, 0, 0]} 
                    />
                    <Bar 
                      dataKey="actual" 
                      fill="#10b981" 
                      name="Actual" 
                      radius={[8, 8, 0, 0]} 
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full">
                  <BarChart3 className="h-12 w-12 text-gray-300 mb-4" />
                  <p className="text-muted-foreground text-center">
                    No performance data available
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-4"
                    onClick={() => navigate("/projects")}
                  >
                    Add Performance Data
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <RiskInsights 
          className="h-full" 
          primaryProjectId={filteredProjects[0]?.id}
        />
      </div>

      {/* Projects List Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Projects</CardTitle>
              <CardDescription>Your active projects and their performance</CardDescription>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate("/projects")}
            >
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredProjects.length > 0 ? (
            <div className="space-y-2">
              {filteredProjects.slice(0, 5).map((project) => {
                const perf = analytics?.projectPerformance?.find(p => p.projectId === project.id);
                return (
                  <div 
                    key={project.id}
                    className="group flex items-center justify-between p-4 rounded-lg border hover:border-fortress-emerald/50 hover:bg-fortress-emerald/5 cursor-pointer transition-all"
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-medium group-hover:text-fortress-emerald transition-colors">
                          {project.name}
                        </h3>
                        {perf?.hasActuals && (
                          <Badge variant="outline" className="text-xs">
                            <Target className="h-3 w-3 mr-1" />
                            {perf.periodsWithData} periods
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(project.updatedAt).toLocaleDateString()}
                        </span>
                        {perf && (
                          <>
                            <span>Revenue: {formatCurrency(perf.actualRevenue)}</span>
                            {perf.hasActuals && (
                              <span className={cn(
                                "font-medium",
                                perf.revenueVariance >= 0 ? "text-green-600" : "text-red-600"
                              )}>
                                {formatPercent(perf.revenueVariance)}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-fortress-emerald transition-colors" />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No projects yet</p>
              <Button onClick={() => navigate("/projects/new")}>
                Create Your First Project
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ImprovedDashboard;
