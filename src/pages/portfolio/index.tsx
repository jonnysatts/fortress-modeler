import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3, PlusCircle, TrendingUp, AlertTriangle, FolderIcon, ArrowUpRight,
  DollarSign, TrendingDown, BarChart2, PieChart as PieChartIcon, Activity, Target,
  Building
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import useStore from '@/store/useStore';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
  AreaChart, Area, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import ChartContainer from '@/components/common/ChartContainer';
import ContentCard from '@/components/common/ContentCard';
import { formatCurrency, formatPercent, cn } from '@/lib/utils';
import { TypographyH4, TypographyMuted } from '@/components/ui/typography';
import { Project, FinancialModel } from '@/lib/db';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sparkline, SparklinePoint } from '@/components/ui/sparkline';
import { generateForecastTimeSeries, ForecastPeriodData } from '@/lib/financialCalculations';
import { dataColors } from '@/lib/colors';
import MetricCard from '@/components/ui/metric-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

// Define type for projects with calculated metrics
interface ProjectWithMetrics extends Project {
  totalRevenue: number;
  totalProfit: number;
  profitMargin: number;
  hasActuals: boolean;
  revenueConcentration: number;
  breakeven: boolean;
  sparklineData: number[];
  growthRate?: number;
  forecastAccuracy?: number;
  costEfficiency?: number;
  marketingROI?: number;
  monthlyTrend?: { month: string; revenue: number; profit: number }[];
  healthScore?: number;
  riskLevel?: 'low' | 'medium' | 'high';
}

const PortfolioDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { projects, loadProjects } = useStore();
  const [projectsWithMetrics, setProjectsWithMetrics] = useState<ProjectWithMetrics[]>([]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    const getProjectMetrics = async () => {
      const projectMetricsPromises = projects.map(async (project) => {
        const models = await useStore.getState().loadModelsForProject(project.id!);
        const actuals = await useStore.getState().loadActualsForProject(project.id!);

        const latestModel = models.length > 0 ? models[0] : null;

        let totalRevenue = 0;
        let totalProfit = 0;
        let profitMargin = 0;
        let revenueConcentration = 0;
        let breakeven = false;
        let sparklineData: number[] = [];
        let growthRate = 0;
        let forecastAccuracy = 0;
        let costEfficiency = 0;
        let marketingROI = 0;
        let monthlyTrend: { month: string; revenue: number; profit: number }[] = [];
        let healthScore = 0;
        let riskLevel: 'low' | 'medium' | 'high' = 'medium';

        if (latestModel) {
          // Generate forecast using the new function
          const timeSeriesData = generateForecastTimeSeries(latestModel);

          if (timeSeriesData.length > 0) {
            const finalPeriod = timeSeriesData[timeSeriesData.length - 1];
            totalRevenue = finalPeriod.cumulativeRevenue;
            totalProfit = finalPeriod.cumulativeProfit;
            profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
            breakeven = totalProfit >= 0;

            // Use cumulative profit for sparkline
            sparklineData = timeSeriesData.map(p => p.cumulativeProfit);

            // Calculate growth rate (comparing first and last period revenue)
            if (timeSeriesData.length > 1) {
              const firstPeriod = timeSeriesData[0];
              const lastPeriod = timeSeriesData[timeSeriesData.length - 1];
              if (firstPeriod.revenue > 0) {
                growthRate = ((lastPeriod.revenue - firstPeriod.revenue) / firstPeriod.revenue) * 100;
              }
            }

            // Generate monthly trend data (simplified for demo)
            monthlyTrend = timeSeriesData.slice(0, 6).map((period, index) => ({
              month: `Month ${index + 1}`,
              revenue: period.revenue,
              profit: period.profit
            }));

            // Calculate cost efficiency (profit per dollar spent)
            const totalCosts = finalPeriod.cumulativeCosts;
            costEfficiency = totalCosts > 0 ? (totalProfit / totalCosts) * 100 : 0;

            // Keep revenue concentration calculation
            const { revenue = [], marketing } = latestModel.assumptions;
            if (totalRevenue > 0 && revenue.length > 0) {
               const highestInitialRevenue = Math.max(...revenue.map(stream => stream.value));
               revenueConcentration = (highestInitialRevenue / totalRevenue) * 100;
            }

            // Calculate marketing ROI if marketing data exists
            if (marketing && marketing.allocationMode !== 'none') {
              let marketingCost = 0;
              if (marketing.allocationMode === 'highLevel' && marketing.totalBudget) {
                marketingCost = marketing.totalBudget;
              } else if (marketing.allocationMode === 'channels' && marketing.channels) {
                marketingCost = marketing.channels.reduce((sum, channel) => sum + (channel.weeklyBudget || 0), 0) * 52; // Annualized
              }

              marketingROI = marketingCost > 0 ? (totalRevenue / marketingCost) * 100 : 0;
            }

            // Calculate health score (0-100) based on multiple factors
            const profitScore = Math.min(100, Math.max(0, profitMargin * 2)); // 0-50% margin maps to 0-100
            const growthScore = Math.min(100, Math.max(0, growthRate + 50)); // -50% to +50% maps to 0-100
            const efficiencyScore = Math.min(100, Math.max(0, costEfficiency * 2)); // 0-50% efficiency maps to 0-100

            healthScore = Math.round((profitScore * 0.4) + (growthScore * 0.3) + (efficiencyScore * 0.3));

            // Determine risk level
            if (healthScore >= 70) riskLevel = 'low';
            else if (healthScore >= 40) riskLevel = 'medium';
            else riskLevel = 'high';

            // Calculate forecast accuracy if actuals exist
            if (actuals.length > 0) {
              // Simple implementation - can be enhanced
              forecastAccuracy = 80 + (Math.random() * 15); // Placeholder: 80-95%
            }
          }
        }

        return {
          ...project,
          totalRevenue,
          totalProfit,
          profitMargin,
          hasActuals: actuals.length > 0,
          revenueConcentration,
          breakeven,
          sparklineData,
          growthRate,
          forecastAccuracy,
          costEfficiency,
          marketingROI,
          monthlyTrend,
          healthScore,
          riskLevel
        };
      });

      const calculatedMetrics = await Promise.all(projectMetricsPromises);
      calculatedMetrics.sort((a, b) => b.totalProfit - a.totalProfit);
      setProjectsWithMetrics(calculatedMetrics);
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
      ),
      avgProfitMargin: totals.avgProfitMargin + (project.profitMargin || 0),
      avgGrowthRate: totals.avgGrowthRate + (project.growthRate || 0),
      avgHealthScore: totals.avgHealthScore + (project.healthScore || 0),
      highRiskCount: totals.highRiskCount + (project.riskLevel === 'high' ? 1 : 0),
      mediumRiskCount: totals.mediumRiskCount + (project.riskLevel === 'medium' ? 1 : 0),
      lowRiskCount: totals.lowRiskCount + (project.riskLevel === 'low' ? 1 : 0)
    };
  }, {
    revenue: 0,
    profit: 0,
    projectsWithActuals: 0,
    projectsWithWarnings: 0,
    avgProfitMargin: 0,
    avgGrowthRate: 0,
    avgHealthScore: 0,
    highRiskCount: 0,
    mediumRiskCount: 0,
    lowRiskCount: 0
  });

  // Calculate averages
  if (projectsWithMetrics.length > 0) {
    portfolioTotals.avgProfitMargin = portfolioTotals.avgProfitMargin / projectsWithMetrics.length;
    portfolioTotals.avgGrowthRate = portfolioTotals.avgGrowthRate / projectsWithMetrics.length;
    portfolioTotals.avgHealthScore = portfolioTotals.avgHealthScore / projectsWithMetrics.length;
  }

  // Prepare data for charts
  const topProjects = projectsWithMetrics.slice(0, 5);

  // Revenue chart data
  const projectRevenueData = topProjects.map(project => ({
    name: project.name,
    revenue: project.totalRevenue
  }));

  // Profit chart data
  const projectProfitData = topProjects.map(project => ({
    name: project.name,
    profit: project.totalProfit
  }));

  // Profit margin chart data
  const projectMarginData = topProjects.map(project => ({
    name: project.name,
    margin: project.profitMargin
  }));

  // Growth rate chart data
  const projectGrowthData = topProjects.map(project => ({
    name: project.name,
    growth: project.growthRate || 0
  }));

  // Health score distribution data
  const healthDistributionData = [
    { name: 'High Risk', value: portfolioTotals.highRiskCount, color: dataColors.status.danger },
    { name: 'Medium Risk', value: portfolioTotals.mediumRiskCount, color: dataColors.status.warning },
    { name: 'Low Risk', value: portfolioTotals.lowRiskCount, color: dataColors.status.success }
  ];

  // Performance metrics radar chart data
  const performanceMetricsData = topProjects.map(project => ({
    name: project.name,
    profitMargin: Math.max(0, project.profitMargin),
    growthRate: Math.max(0, (project.growthRate || 0) + 50), // Normalize: -50% to +50% → 0 to 100
    costEfficiency: Math.max(0, project.costEfficiency || 0),
    marketingROI: Math.max(0, project.marketingROI || 0),
    healthScore: project.healthScore || 0
  }));

  // Monthly trend data for portfolio
  const portfolioTrendData = [];
  if (topProjects.length > 0 && topProjects[0].monthlyTrend) {
    // Initialize with months
    topProjects[0].monthlyTrend.forEach(item => {
      portfolioTrendData.push({
        month: item.month,
        revenue: 0,
        profit: 0
      });
    });

    // Sum up values from all projects
    topProjects.forEach(project => {
      if (project.monthlyTrend) {
        project.monthlyTrend.forEach((item, index) => {
          if (index < portfolioTrendData.length) {
            portfolioTrendData[index].revenue += item.revenue;
            portfolioTrendData[index].profit += item.profit;
          }
        });
      }
    });
  }

  // Define chart colors
  const COLORS = dataColors.series;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-fortress-blue">Portfolio Dashboard</h1>
        <Button
          onClick={() => navigate("/projects/new")}
          className="bg-fortress-emerald hover:bg-fortress-emerald/90"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          New Product
        </Button>
      </div>

      {/* Key Metrics Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Products"
          value={projects.length}
          icon={<FolderIcon className="h-5 w-5 text-fortress-blue" />}
          description="Active products in portfolio"
        />

        <MetricCard
          title="Total Revenue"
          value={formatCurrency(portfolioTotals.revenue)}
          icon={<DollarSign className="h-5 w-5 text-green-500" />}
          status={portfolioTotals.revenue > 0 ? 'positive' : 'neutral'}
          description="Year-to-date revenue"
          isCurrency
        />

        <MetricCard
          title="Total Profit"
          value={formatCurrency(portfolioTotals.profit)}
          change={portfolioTotals.avgProfitMargin}
          icon={<TrendingUp className="h-5 w-5 text-blue-500" />}
          status={portfolioTotals.profit > 0 ? 'positive' : 'negative'}
          description="Year-to-date profit"
          isCurrency
        />

        <MetricCard
          title="Risk Assessment"
          value={portfolioTotals.projectsWithWarnings}
          icon={<AlertTriangle className="h-5 w-5 text-amber-500" />}
          status={portfolioTotals.projectsWithWarnings > 0 ? 'negative' : 'positive'}
          description="Products requiring attention"
        />
      </div>

      {/* Portfolio Health Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Health Overview</CardTitle>
          <CardDescription>Key performance indicators across all products</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col space-y-2">
              <span className="text-sm font-medium text-muted-foreground">Average Profit Margin</span>
              <div className="flex items-center">
                <span className="text-2xl font-bold mr-2">{formatPercent(portfolioTotals.avgProfitMargin)}</span>
                {portfolioTotals.avgProfitMargin >= 30 ? (
                  <Badge variant="success">Healthy</Badge>
                ) : portfolioTotals.avgProfitMargin >= 15 ? (
                  <Badge variant="warning">Moderate</Badge>
                ) : (
                  <Badge variant="destructive">Low</Badge>
                )}
              </div>
              <div className="w-full bg-muted rounded-full h-2.5 mt-1">
                <div
                  className={cn(
                    "h-2.5 rounded-full",
                    portfolioTotals.avgProfitMargin >= 30 ? "bg-green-500" :
                    portfolioTotals.avgProfitMargin >= 15 ? "bg-amber-500" : "bg-red-500"
                  )}
                  style={{ width: `${Math.min(100, Math.max(0, portfolioTotals.avgProfitMargin * 2))}%` }}
                ></div>
              </div>
            </div>

            <div className="flex flex-col space-y-2">
              <span className="text-sm font-medium text-muted-foreground">Average Growth Rate</span>
              <div className="flex items-center">
                <span className="text-2xl font-bold mr-2">{formatPercent(portfolioTotals.avgGrowthRate)}</span>
                {portfolioTotals.avgGrowthRate >= 10 ? (
                  <Badge variant="success">Strong</Badge>
                ) : portfolioTotals.avgGrowthRate >= 0 ? (
                  <Badge variant="warning">Stable</Badge>
                ) : (
                  <Badge variant="destructive">Declining</Badge>
                )}
              </div>
              <div className="w-full bg-muted rounded-full h-2.5 mt-1">
                <div
                  className={cn(
                    "h-2.5 rounded-full",
                    portfolioTotals.avgGrowthRate >= 10 ? "bg-green-500" :
                    portfolioTotals.avgGrowthRate >= 0 ? "bg-amber-500" : "bg-red-500"
                  )}
                  style={{ width: `${Math.min(100, Math.max(0, (portfolioTotals.avgGrowthRate + 50) * 1))}%` }}
                ></div>
              </div>
            </div>

            <div className="flex flex-col space-y-2">
              <span className="text-sm font-medium text-muted-foreground">Portfolio Health Score</span>
              <div className="flex items-center">
                <span className="text-2xl font-bold mr-2">{Math.round(portfolioTotals.avgHealthScore)}</span>
                {portfolioTotals.avgHealthScore >= 70 ? (
                  <Badge variant="success">Healthy</Badge>
                ) : portfolioTotals.avgHealthScore >= 40 ? (
                  <Badge variant="warning">Moderate</Badge>
                ) : (
                  <Badge variant="destructive">At Risk</Badge>
                )}
              </div>
              <div className="w-full bg-muted rounded-full h-2.5 mt-1">
                <div
                  className={cn(
                    "h-2.5 rounded-full",
                    portfolioTotals.avgHealthScore >= 70 ? "bg-green-500" :
                    portfolioTotals.avgHealthScore >= 40 ? "bg-amber-500" : "bg-red-500"
                  )}
                  style={{ width: `${Math.min(100, Math.max(0, portfolioTotals.avgHealthScore))}%` }}
                ></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for different chart views */}
      <Tabs defaultValue="performance" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="comparison">Comparison</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ChartContainer
              title="Revenue by Product"
              description="Top 5 products by revenue"
              height={320}
              allowExpand
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectRevenueData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={dataColors.grid} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={val => formatCurrency(val)} />
                  <Tooltip
                    formatter={(value) => [formatCurrency(value as number), 'Revenue']}
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="revenue" fill={dataColors.revenue} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>

            <ChartContainer
              title="Profit by Product"
              description="Top 5 products by profit"
              height={320}
              allowExpand
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectProfitData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={dataColors.grid} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={val => formatCurrency(val)} />
                  <Tooltip
                    formatter={(value) => [formatCurrency(value as number), 'Profit']}
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="profit" fill={dataColors.profit} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ChartContainer
              title="Portfolio Risk Distribution"
              description="Products by risk level"
              height={320}
              allowExpand
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={healthDistributionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {healthDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [value, 'Products']}
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>

            <ChartContainer
              title="Performance Metrics"
              description="Key metrics by product"
              height={320}
              allowExpand
            >
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={performanceMetricsData}>
                  <PolarGrid stroke={dataColors.grid} />
                  <PolarAngleAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} />
                  {topProjects.slice(0, 3).map((project, index) => (
                    <Radar
                      key={project.id}
                      name={project.name}
                      dataKey={Object.keys(performanceMetricsData[0]).filter(key => key !== 'name')[index % 5]}
                      stroke={COLORS[index % COLORS.length]}
                      fill={COLORS[index % COLORS.length]}
                      fillOpacity={0.2}
                    />
                  ))}
                  <Legend />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </TabsContent>

        {/* Comparison Tab */}
        <TabsContent value="comparison" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ChartContainer
              title="Profit Margin Comparison"
              description="Profit margin by product"
              height={320}
              allowExpand
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectMarginData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={dataColors.grid} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={val => formatPercent(val)} />
                  <Tooltip
                    formatter={(value) => [formatPercent(value as number), 'Profit Margin']}
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="margin" fill={dataColors.series[2]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>

            <ChartContainer
              title="Growth Rate Comparison"
              description="Growth rate by product"
              height={320}
              allowExpand
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectGrowthData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={dataColors.grid} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={val => formatPercent(val)} />
                  <Tooltip
                    formatter={(value) => [formatPercent(value as number), 'Growth Rate']}
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="growth" fill={dataColors.series[3]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          <ChartContainer
            title="Portfolio Revenue & Profit Trend"
            description="Monthly performance across all products"
            height={400}
            allowExpand
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={portfolioTrendData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={dataColors.grid} />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={val => formatCurrency(val)} />
                <Tooltip
                  formatter={(value) => [formatCurrency(value as number), '']}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}
                />
                <Legend />
                <Area type="monotone" dataKey="revenue" stroke={dataColors.revenue} fill={dataColors.revenue} fillOpacity={0.2} />
                <Area type="monotone" dataKey="profit" stroke={dataColors.profit} fill={dataColors.profit} fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-xl font-bold">Product Performance</CardTitle>
            <CardDescription>All products sorted by profit</CardDescription>
          </div>
          <Button
            onClick={() => navigate("/projects/new")}
            className="bg-fortress-emerald hover:bg-fortress-emerald/90"
            size="sm"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            New Product
          </Button>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="py-3 px-4 text-left font-medium">Product</th>
                  <th className="py-3 px-4 text-right font-medium">Revenue</th>
                  <th className="py-3 px-4 text-right font-medium">Profit</th>
                  <th className="py-3 px-4 text-right font-medium">Margin</th>
                  <th className="py-3 px-4 text-center font-medium">Health</th>
                  <th className="py-3 px-4 text-center font-medium">Trend</th>
                  <th className="py-3 px-4 text-center font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {projectsWithMetrics.map(project => (
                  <tr key={project.id} className="border-b hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border">
                          <AvatarImage src={project.avatarImage} alt={`${project.name} avatar`} />
                          <AvatarFallback>
                            {project.name.substring(0, 2).toUpperCase() || <Building size={16}/>}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{project.name}</div>
                          <div className="text-xs text-muted-foreground">{project.productType}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono">{formatCurrency(project.totalRevenue)}</td>
                    <td className="py-3 px-4 text-right font-mono">{formatCurrency(project.totalProfit)}</td>
                    <td className="py-3 px-4 text-right font-mono">{formatPercent(project.profitMargin)}</td>
                    <td className="py-3 px-4 text-center">
                      {project.healthScore !== undefined && (
                        <div className="flex items-center justify-center">
                          <div
                            className={cn(
                              "h-2.5 w-16 rounded-full",
                              project.healthScore >= 70 ? "bg-green-500" :
                              project.healthScore >= 40 ? "bg-amber-500" : "bg-red-500"
                            )}
                            style={{ width: `${Math.min(64, Math.max(16, project.healthScore / 100 * 64))}px` }}
                          ></div>
                          <span className="ml-2 text-xs font-medium">{project.healthScore}</span>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-1 justify-center mt-1">
                        {project.riskLevel === 'high' && (
                          <Badge variant="destructive" className="text-xs">High Risk</Badge>
                        )}
                        {project.riskLevel === 'medium' && (
                          <Badge variant="warning" className="text-xs">Medium Risk</Badge>
                        )}
                        {project.riskLevel === 'low' && (
                          <Badge variant="success" className="text-xs">Low Risk</Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-center">
                        <Sparkline
                          data={project.sparklineData}
                          width={100}
                          height={30}
                          color={project.totalProfit >= 0 ? dataColors.positive : dataColors.negative}
                          strokeWidth={1.5}
                          fillOpacity={0.2}
                        />
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/projects/${project.id}/summary`)}
                        className="hover:bg-muted/50"
                      >
                        View Details
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

        </CardContent>
      </Card>
    </div>
  );
};

export default PortfolioDashboard;
