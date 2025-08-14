import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  BarChart3,
  Target,
  AlertTriangle,
  ChevronRight,
  Plus,
  Edit2,
  Copy,
  Trash2,
  Eye,
  Download,
  Share2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Enhanced Metric Card Component
const MetricCard = ({ 
  title, 
  value, 
  subtitle, 
  change, 
  changeType = 'neutral',
  icon,
  trend = []
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: React.ReactNode;
  trend?: number[];
}) => {
  const formatValue = (v: string | number) => {
    if (typeof v === 'number') {
      return `$${Math.round(v).toLocaleString()}`;
    }
    return v;
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="p-2 bg-slate-100 rounded-lg">
            {icon || <DollarSign className="h-5 w-5 text-slate-600" />}
          </div>
          {change && (
            <Badge 
              variant="outline" 
              className={cn(
                "font-normal",
                changeType === 'positive' && "border-green-200 bg-green-50 text-green-700",
                changeType === 'negative' && "border-red-200 bg-red-50 text-red-700",
                changeType === 'neutral' && "border-gray-200 bg-gray-50 text-gray-700"
              )}
            >
              {change}
            </Badge>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold tracking-tight">{formatValue(value)}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Scenario Card Component
const ScenarioCard = ({
  scenario,
  isPrimary = false,
  onView,
  onEdit,
  onDuplicate,
  onDelete,
  onSetPrimary
}: {
  scenario: any;
  isPrimary?: boolean;
  onView: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onSetPrimary: () => void;
}) => {
  return (
    <Card className={cn(
      "hover:shadow-md transition-all cursor-pointer",
      isPrimary && "ring-2 ring-fortress-emerald"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              {scenario.name}
              {isPrimary && (
                <Badge className="bg-fortress-emerald text-white">Primary</Badge>
              )}
            </CardTitle>
            <CardDescription>
              {scenario.growthType} growth • {scenario.revenueStreams} revenue streams
            </CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onView}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit}>
                <Edit2 className="mr-2 h-4 w-4" />
                Edit Scenario
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              {!isPrimary && (
                <DropdownMenuItem onClick={onSetPrimary}>
                  <Target className="mr-2 h-4 w-4" />
                  Set as Primary
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-red-600">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Revenue</p>
            <p className="font-semibold">${Math.round(scenario.revenue).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Profit</p>
            <p className="font-semibold">${Math.round(scenario.profit).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Margin</p>
            <p className="font-semibold">{scenario.margin}%</p>
          </div>
        </div>
        {scenario.variance && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">vs. Actual</span>
              <span className={cn(
                "font-medium",
                scenario.variance >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {scenario.variance >= 0 ? '+' : ''}{scenario.variance}%
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Empty State Component
const EmptyStateCard = ({
  title,
  description,
  icon,
  action
}: {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}) => {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12">
        {icon && (
          <div className="p-3 bg-slate-100 rounded-full mb-4">
            {icon}
          </div>
        )}
        <h3 className="font-semibold text-lg mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
          {description}
        </p>
        {action && (
          <Button onClick={action.onClick} variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            {action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export const ImprovedProjectOverview = ({ 
  project,
  scenarios = [],
  actuals = [],
  onCreateScenario,
  onViewScenario,
  onEditScenario
}: {
  project: any;
  scenarios?: any[];
  actuals?: any[];
  onCreateScenario: () => void;
  onViewScenario: (id: string) => void;
  onEditScenario: (id: string) => void;
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");

  // Calculate metrics
  const primaryScenario = scenarios.find(s => s.isPrimary) || scenarios[0];
  const hasActuals = actuals.length > 0;
  const performance = hasActuals ? -100 : null; // Calculate real performance

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{project.name}</h1>
            <Badge variant="outline">{project.event_type === 'weekly' ? 'Weekly Event' : 'Special Event'}</Badge>
            {hasActuals && (
              <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
                Behind Target
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            {project.description || 'A weekly games and pop culture themed Music Bingo event'}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button size="sm" onClick={() => navigate(`/projects/${project.id}/edit`)}>
            <Edit2 className="mr-2 h-4 w-4" />
            Edit
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Projected Revenue"
          value={primaryScenario?.revenue || 42000}
          subtitle="Across all scenarios"
          icon={<DollarSign className="h-5 w-5 text-green-600" />}
        />
        <MetricCard
          title="Projected Profit"
          value={primaryScenario?.profit || 39590}
          subtitle="94% margin"
          icon={<TrendingUp className="h-5 w-5 text-blue-600" />}
        />
        <MetricCard
          title="Actual Revenue"
          value={hasActuals ? 0 : "—"}
          subtitle={hasActuals ? "0 periods tracked" : "No data yet"}
          change={hasActuals ? "-100%" : undefined}
          changeType="negative"
          icon={<BarChart3 className="h-5 w-5 text-orange-600" />}
        />
        <MetricCard
          title="Performance"
          value={performance !== null ? `${performance}%` : "—"}
          subtitle="vs. projections"
          change={performance !== null ? `${Math.abs(performance)}% below` : undefined}
          changeType={performance !== null && performance < 0 ? "negative" : "neutral"}
          icon={<Target className="h-5 w-5 text-purple-600" />}
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="risks">Risks</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Financial Scenarios</CardTitle>
                <CardDescription>
                  Compare and manage your financial projections
                </CardDescription>
              </CardHeader>
              <CardContent>
                {scenarios.length > 0 ? (
                  <div className="space-y-3">
                    {scenarios.slice(0, 2).map((scenario) => (
                      <div
                        key={scenario.id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-slate-50 cursor-pointer"
                        onClick={() => onViewScenario(scenario.id)}
                      >
                        <div>
                          <p className="font-medium">{scenario.name}</p>
                          <p className="text-sm text-muted-foreground">
                            ${Math.round(scenario.profit).toLocaleString()} projected profit
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    ))}
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={onCreateScenario}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      New Scenario
                    </Button>
                  </div>
                ) : (
                  <EmptyStateCard
                    title="No scenarios yet"
                    description="Create your first financial scenario to start projecting"
                    icon={<BarChart3 className="h-6 w-6 text-muted-foreground" />}
                    action={{
                      label: "Create Scenario",
                      onClick: onCreateScenario
                    }}
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Latest updates and changes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 bg-blue-100 rounded">
                      <BarChart3 className="h-3 w-3 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Created financial model "Prudent Weekly Scenario"</p>
                      <p className="text-xs text-muted-foreground">7 days ago</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="scenarios" className="space-y-4">
          {scenarios.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {scenarios.map((scenario) => (
                <ScenarioCard
                  key={scenario.id}
                  scenario={scenario}
                  isPrimary={scenario.isPrimary}
                  onView={() => onViewScenario(scenario.id)}
                  onEdit={() => onEditScenario(scenario.id)}
                  onDuplicate={() => console.log('Duplicate', scenario.id)}
                  onDelete={() => console.log('Delete', scenario.id)}
                  onSetPrimary={() => console.log('Set primary', scenario.id)}
                />
              ))}
              <EmptyStateCard
                title="Add another scenario"
                description="Create alternative projections to compare"
                icon={<Plus className="h-6 w-6 text-muted-foreground" />}
                action={{
                  label: "New Scenario",
                  onClick: onCreateScenario
                }}
              />
            </div>
          ) : (
            <EmptyStateCard
              title="No scenarios created"
              description="Start by creating your first financial scenario"
              icon={<BarChart3 className="h-8 w-8 text-muted-foreground" />}
              action={{
                label: "Create First Scenario",
                onClick: onCreateScenario
              }}
            />
          )}
        </TabsContent>

        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Performance Tracking</CardTitle>
              <CardDescription>
                Track actual performance against projections
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmptyStateCard
                title="No performance data"
                description="Start tracking actuals to see performance metrics"
                icon={<Target className="h-8 w-8 text-muted-foreground" />}
                action={{
                  label: "Track Actuals",
                  onClick: () => setActiveTab("performance")
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights">
          <Card>
            <CardHeader>
              <CardTitle>Insights & Analytics</CardTitle>
              <CardDescription>
                Data-driven insights about your project
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Insights will appear here once you have enough data
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risks">
          <Card>
            <CardHeader>
              <CardTitle>Risk Assessment</CardTitle>
              <CardDescription>
                Identify and manage project risks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Risk assessment coming soon
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ImprovedProjectOverview;
