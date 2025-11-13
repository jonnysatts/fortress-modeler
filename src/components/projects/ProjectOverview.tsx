import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  BarChart3,
  PlusCircle,
  Activity,
  Calendar
} from "lucide-react";
import { FinancialModel, Project } from '@/lib/db';
import { ActualsPeriodEntry } from '@/types/models';
import { 
  calculateProjectAggregateMetrics, 
  generateModelSummaries, 
  getRecentProjectActivity,
  calculateProjectKPIs 
} from '@/lib/project-aggregation';
import { formatDistanceToNow } from 'date-fns';

interface ProjectOverviewProps {
  project: Project;
  models: FinancialModel[];
  actualsData: ActualsPeriodEntry[];
  onCreateModel: () => void;
  onViewModel: (modelId: string) => void;
}

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  trendValue 
}) => {
  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (trend === 'down') return <TrendingDown className="h-4 w-4 text-red-600" />;
    return null;
  };

  const getTrendColor = () => {
    if (trend === 'up') return 'text-green-600';
    if (trend === 'down') return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <div className="text-sm font-medium text-muted-foreground">
            {title}
          </div>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex items-center space-x-2">
          <div className="text-2xl font-bold">{value}</div>
          {trendValue && (
            <div className={`flex items-center space-x-1 text-sm ${getTrendColor()}`}>
              {getTrendIcon()}
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground pt-1">
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export const ProjectOverview: React.FC<ProjectOverviewProps> = ({
  project,
  models,
  actualsData,
  onCreateModel,
  onViewModel,
}) => {
  const aggregateMetrics = calculateProjectAggregateMetrics(models, actualsData);
  const modelSummaries = generateModelSummaries(models, actualsData);
  const recentActivity = getRecentProjectActivity(models, actualsData);
  const kpis = calculateProjectKPIs(models, actualsData);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getPerformanceStatusBadge = () => {
    if (kpis.performanceStatus === 'ahead') {
      return <Badge variant="default" className="bg-green-100 text-green-800">Ahead of Target</Badge>;
    }
    if (kpis.performanceStatus === 'behind') {
      return <Badge variant="destructive">Behind Target</Badge>;
    }
    return <Badge variant="secondary">On Track</Badge>;
  };

  if (models.length === 0) {
    return (
      <div className="text-center py-10">
        <div className="mb-4 flex justify-center">
          <div className="rounded-full bg-muted p-4">
            <BarChart3 className="h-8 w-8 text-muted-foreground" />
          </div>
        </div>
        <h3 className="mb-2 text-xl font-medium">Welcome to {project.name}</h3>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          Get started by creating your first financial scenario to begin tracking projections and performance.
        </p>
        <Button 
          onClick={onCreateModel}
          className="bg-fortress-emerald hover:bg-fortress-emerald/90"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Create First Financial Scenario
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Project Summary Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {project.name}
                {getPerformanceStatusBadge()}
              </CardTitle>
              <CardDescription>
                {project.description || 'Project overview and key metrics'}
              </CardDescription>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <div>{aggregateMetrics.modelCount} financial scenario{aggregateMetrics.modelCount !== 1 ? 's' : ''}</div>
              <div>{aggregateMetrics.periodsTracked} period{aggregateMetrics.periodsTracked !== 1 ? 's' : ''} tracked</div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Projected Revenue"
          value={formatCurrency(aggregateMetrics.totalProjectedRevenue)}
          icon={DollarSign}
          subtitle="Across all scenarios"
        />
        <StatCard
          title="Projected Profit"
          value={formatCurrency(aggregateMetrics.netProjectedProfit)}
          icon={Target}
          trend={aggregateMetrics.netProjectedProfit > 0 ? 'up' : 'down'}
          subtitle={`${Math.round(kpis.profitMargin)}% margin`}
        />
        <StatCard
          title="Actual Revenue"
          value={formatCurrency(aggregateMetrics.totalActualRevenue)}
          icon={TrendingUp}
          trend={kpis.revenueVariance > 0 ? 'up' : kpis.revenueVariance < 0 ? 'down' : 'neutral'}
          trendValue={`${kpis.revenueVariance > 0 ? '+' : ''}${Math.round(kpis.revenueVariance)}%`}
        />
        <StatCard
          title="Performance"
          value={`${aggregateMetrics.overallVariancePercent > 0 ? '+' : ''}${aggregateMetrics.overallVariancePercent}%`}
          icon={Activity}
          trend={aggregateMetrics.overallVariancePercent > 0 ? 'up' : aggregateMetrics.overallVariancePercent < 0 ? 'down' : 'neutral'}
          subtitle="vs. projections"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Models Summary */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Financial Scenarios</CardTitle>
              <Button size="sm" onClick={onCreateModel}>
                <PlusCircle className="mr-2 h-4 w-4" />
                New Scenario
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {modelSummaries.length > 0 ? (
              <div className="space-y-3">
                {modelSummaries.map((model) => (
                  <div
                    key={model.id}
                    className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => onViewModel(model.id)}
                  >
                    <div>
                      <div className="font-medium">{model.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatCurrency(model.netProfit)} projected profit
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-medium ${
                        model.variancePercent > 0 ? 'text-green-600' : 
                        model.variancePercent < 0 ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {model.variancePercent > 0 ? '+' : ''}{model.variancePercent}%
                      </div>
                      <div className="text-xs text-muted-foreground">variance</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                No scenarios created yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.slice(0, 5).map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="mt-1">
                      {activity.type === 'model_created' ? (
                        <BarChart3 className="h-4 w-4 text-blue-600" />
                      ) : (
                        <Activity className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm">{activity.description}</div>
                      <div className="text-xs text-muted-foreground flex items-center mt-1">
                        <Calendar className="h-3 w-3 mr-1" />
                        {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                No recent activity
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Progress Indicators */}
      {aggregateMetrics.periodsTracked > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Progress Tracking</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Data Completeness</span>
                  <span>{Math.round(kpis.dataCompleteness)}%</span>
                </div>
                <Progress value={kpis.dataCompleteness} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};