import React from 'react';
import { usePortfolioRiskStats } from '@/hooks/useRisks';
import { useMyProjects } from '@/hooks/useProjects';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, 
  TrendingUp, 
  Activity, 
  ArrowLeft,
  Shield,
  Clock,
  Target
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * Portfolio-wide risk overview page
 * Shows comprehensive risk insights across all projects
 */
export function RisksOverview() {
  const navigate = useNavigate();
  const { data: projects = [], isLoading: projectsLoading } = useMyProjects();
  const { data: portfolioRiskStats, isLoading: riskStatsLoading } = usePortfolioRiskStats(
    projects.map(p => p.id)
  );

  const isLoading = projectsLoading || riskStatsLoading;

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRiskLevelIcon = (level: string) => {
    switch (level) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'high': return <TrendingUp className="h-4 w-4 text-orange-600" />;
      case 'medium': return <Activity className="h-4 w-4 text-yellow-600" />;
      case 'low': return <Shield className="h-4 w-4 text-green-600" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Portfolio Risk Overview</h1>
            <p className="text-gray-600 mt-1">
              Comprehensive risk analysis across all {projects.length} projects
            </p>
          </div>
        </div>
      </div>

      {/* Risk Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Risks</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{portfolioRiskStats?.totalRisks || 0}</div>
            <p className="text-xs text-muted-foreground">
              Across {projects.length} projects
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Risks</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {portfolioRiskStats?.criticalRisks || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Require immediate attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risks</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {portfolioRiskStats?.highRisks || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Need monitoring
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Risks</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{portfolioRiskStats?.recentRisks || 0}</div>
            <p className="text-xs text-muted-foreground">
              Added in last 30 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Overall Risk Level */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            {getRiskLevelIcon(portfolioRiskStats?.overallRiskLevel || 'low')}
            <span>Overall Portfolio Risk Level</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <Badge 
              variant="outline" 
              className={`${getRiskLevelColor(portfolioRiskStats?.overallRiskLevel || 'low')} text-sm px-3 py-1`}
            >
              {portfolioRiskStats?.overallRiskLevel?.toUpperCase() || 'LOW'}
            </Badge>
            <div className="text-sm text-gray-600">
              Based on highest risk level across all projects
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Urgent Actions */}
      {portfolioRiskStats?.urgentActions && portfolioRiskStats.urgentActions > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{portfolioRiskStats.urgentActions} urgent actions required</strong> - 
            Review critical and high-priority risks across your portfolio.
          </AlertDescription>
        </Alert>
      )}

      {/* Project-by-Project Risk Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-4 w-4" />
            <span>Risk Breakdown by Project</span>
          </CardTitle>
          <CardDescription>
            Click on any project to view detailed risk analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {projects.map((project) => (
              <div
                key={project.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => navigate(`/projects/${project.id}?tab=risks`)}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                  </div>
                  <div>
                    <h3 className="font-medium">{project.name}</h3>
                    <p className="text-sm text-gray-600">{project.productType}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-xs">
                    View Risks
                  </Badge>
                  <ArrowLeft className="h-4 w-4 text-gray-400 rotate-180" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Empty State */}
      {projects.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Shield className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Projects Found</h3>
            <p className="text-gray-600 text-center mb-4">
              Create your first project to start tracking risks and performance insights.
            </p>
            <Button onClick={() => navigate('/projects/new')}>
              Create Project
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}