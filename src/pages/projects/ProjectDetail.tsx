import { useEffect, useState, lazy, Suspense } from "react";
import { useNavigate, useParams, Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Edit, Trash2, PlusCircle, BarChart3, AlertTriangle, Building, Target, Loader2, Share2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { FinancialModel as DbFinancialModel, Project, setPrimaryFinancialModel } from "@/lib/db";
import { toast } from "sonner";
import { useProject, useDeleteProject, useSpecialEventForecasts, useSpecialEventActuals } from "@/hooks/useProjects";
import { useModelsForProject } from "@/hooks/useModels";
import { useActualsForProject } from "@/hooks/useActuals";
import { FinancialModel } from '@/lib/db';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ProjectOverview } from "@/components/projects/ProjectOverview";
import { ScenarioOverview } from "@/components/projects/ScenarioOverview";
import { ActualsDisplayTable } from "@/components/models/ActualsDisplayTable";
import { ModelComparison } from "@/components/models/ModelComparison";
import { Breadcrumb } from "@/components/navigation/Breadcrumb";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";
// Lazy load heavy components
const PerformanceAnalysis = lazy(() => import("@/components/models/PerformanceAnalysis").then(m => ({ default: m.PerformanceAnalysis })));
const ActualsInputForm = lazy(() => import("@/components/models/ActualsInputForm").then(m => ({ default: m.ActualsInputForm })));
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/utils";
import { ShareProjectModal } from "@/components/projects/ShareProjectModal";
import { isCloudModeEnabled } from "@/config/app.config";
import { RiskAssessmentTab } from "@/components/risk/RiskAssessmentTab";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { SpecialEventForecastForm } from "@/components/events/SpecialEventForecastForm";
import { SpecialEventActualForm } from "@/components/events/SpecialEventActualForm";
import { MilestoneTracker } from "@/components/events/MilestoneTracker";

// Loading component for lazy-loaded components
const ComponentLoader = ({ message = "Loading..." }: { message?: string }) => (
  <div className="min-h-[200px] flex items-center justify-center">
    <div className="animate-pulse space-y-4 w-full">
      <div className="h-4 bg-muted rounded w-48" />
      <div className="space-y-2">
        <div className="h-32 bg-muted rounded" />
        <div className="grid grid-cols-3 gap-4">
          <div className="h-20 bg-muted rounded" />
          <div className="h-20 bg-muted rounded" />
          <div className="h-20 bg-muted rounded" />
        </div>
      </div>
    </div>
  </div>
);

const ProjectDetail = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const [searchParams] = useSearchParams();
    const [selectedModelId, setSelectedModelId] = useState<string>('');
    const [updatingPrimaryModel, setUpdatingPrimaryModel] = useState<string | null>(null);
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [reportLoading, setReportLoading] = useState(false);

  const navigate = useNavigate();
  const { user } = useSupabaseAuth();

  const { data: project, isLoading: projectLoading, error: projectError } = useProject(projectId);
  const { data: financialModels = [], isLoading: modelsLoading } = useModelsForProject(projectId);
  const { data: actualsData = [], isLoading: actualsLoading } = useActualsForProject(projectId);
  const { data: specialForecasts = [] } = useSpecialEventForecasts(projectId);
  const { data: specialActuals = [] } = useSpecialEventActuals(projectId);
  const deleteProjectMutation = useDeleteProject();

  // Set default selected model when models load
  useEffect(() => {
    if (financialModels.length > 0 && !selectedModelId) {
      setSelectedModelId(financialModels[0].id);
    }
  }, [financialModels, selectedModelId]);

  const selectedModel = financialModels.find(m => m.id === selectedModelId) || financialModels[0];
  const [activeTab, setActiveTab] = useState("overview");

  // Handle URL tab parameter
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['overview', 'models', 'performance', 'analysis', 'risks'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Handle primary model selection
  const handleSetPrimaryModel = async (modelId: string) => {
    setUpdatingPrimaryModel(modelId);
    try {
      await setPrimaryFinancialModel(modelId);
      toast.success('Primary model updated successfully');
      // Trigger a refetch of models to get updated isPrimary flags
      window.location.reload(); // Simple approach - could use query invalidation instead
    } catch (error) {
      console.error('Failed to set primary model:', error);
      toast.error('Failed to update primary model');
    } finally {
      setUpdatingPrimaryModel(null);
    }
  };
  
  // Breadcrumb navigation
  const breadcrumbs = useBreadcrumbs({
    projectId: projectId,
    projectName: project?.name,
    activeTab: activeTab,
  });
  
  const loading = projectLoading || modelsLoading || actualsLoading;

  // Handle project not found error
  useEffect(() => {
    if (!projectId || projectId === 'undefined' || projectId === 'null') {
      console.error('Rendered with invalid projectId, redirecting.');
      navigate('/projects', { replace: true });
      return;
    }
    
    if (projectError) {
      console.error('Error fetching project details:', projectError);
      toast.error("Project not found", {
        description: "The requested project could not be found.",
      });
      navigate("/projects", { replace: true });
    }
  }, [projectId, projectError, navigate]);


  // Actuals cache invalidation is now handled by React Query mutations

  const handleDeleteProject = async () => {
    if (!project?.id) return;
    
    deleteProjectMutation.mutate(project.id, {
      onSuccess: () => {
        toast.success("Project deleted", {
          description: "The project has been successfully deleted.",
        });
        navigate("/projects");
      },
      onError: (error) => {
        console.error("Error deleting project:", error);
        toast.error("Failed to delete project", {
          description: "There was an error deleting the project. Please try again.",
        });
      }
    });
  };

  const handlePdfReport = async () => {
    if (!project) return;
    setReportLoading(true);
    try {
      const { ReportService } = await import('@/services/ReportService');
      await ReportService.generateSingleEventPDF({
        project,
        forecast: specialForecasts[0],
        actual: specialActuals[0],
      });
    } catch (error) {
      console.error('Report generation failed:', error);
      toast.error('Failed to generate report');
    } finally {
      setReportLoading(false);
    }
  };

  const handleCsvReport = async () => {
    if (!project) return;
    setReportLoading(true);
    try {
      const { ReportService } = await import('@/services/ReportService');
      ReportService.generateSingleEventCSV({
        project,
        forecast: specialForecasts[0],
        actual: specialActuals[0],
      });
    } catch (error) {
      console.error('CSV generation failed:', error);
      toast.error('Failed to generate report');
    } finally {
      setReportLoading(false);
    }
  };

  if (loading || !project) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="h-10 w-10 border-4 border-fortress-emerald border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <Breadcrumb items={breadcrumbs} />
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/projects")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Avatar className="h-16 w-16 border">
            <AvatarImage src={project.avatarImage} alt={`${project.name} avatar`} />
            <AvatarFallback>
               {project.name ? project.name.substring(0, 2).toUpperCase() : <Building size={24}/>}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-fortress-blue">{project.name}</h1>
            <div className="flex items-center mt-1 space-x-2">
              <Badge variant="outline" className="text-fortress-blue border-fortress-blue">
                {project.productType}
              </Badge>
              <p className="text-sm text-muted-foreground">
                Created on {formatDate(project.createdAt)}
              </p>
            </div>
          </div>
        </div>
        <div className="flex space-x-2 self-start sm:self-center">
          <Button 
            onClick={() => navigate(`/projects/${projectId}/models/new`)}
            className="bg-fortress-emerald hover:bg-fortress-emerald/90"
            size="sm"
          >
            <PlusCircle className="mr-1 h-4 w-4" />
            New Scenario
          </Button>
          {isCloudModeEnabled() && (
            <Button variant="outline" size="sm" onClick={() => setShareModalOpen(true)}>
              <Share2 className="mr-1 h-4 w-4" />
              Share
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => navigate(`/projects/${projectId}/edit`)}>
            <Edit className="mr-1 h-4 w-4" />
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={handlePdfReport} disabled={reportLoading}>
            <Download className="mr-1 h-4 w-4" />
            PDF Report
          </Button>
          <Button variant="outline" size="sm" onClick={handleCsvReport} disabled={reportLoading}>
            <Download className="mr-1 h-4 w-4" />
            CSV Report
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="mr-1 h-4 w-4" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the project and all associated data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteProject} className="bg-red-500 hover:bg-red-600">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {project.description && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm">{project.description}</p>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {project.event_type === 'special' ? (
            <>
              <TabsTrigger value="forecast">Forecast</TabsTrigger>
              <TabsTrigger value="actuals">Actuals</TabsTrigger>
              <TabsTrigger value="milestones">Milestones</TabsTrigger>
            </>
          ) : (
            <>
              <TabsTrigger value="models">Scenarios</TabsTrigger>
              <TabsTrigger value="performance">Track Performance</TabsTrigger>
              <TabsTrigger value="analysis">Insights</TabsTrigger>
            </>
          )}
          <TabsTrigger value="risks">Risk Assessment</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          {/* Conditional rendering: Single model vs Multi-model scenarios */}
          {financialModels.length <= 1 && project.event_type !== 'special' ? (
            <ProjectOverview
              project={project}
              models={financialModels}
              actualsData={actualsData}
              onCreateModel={() => navigate(`/projects/${projectId}/models/new`)}
              onViewModel={(modelId) => navigate(`/projects/${projectId}/models/${modelId}`)}
            />
          ) : (
            <ScenarioOverview
              project={project}
              models={financialModels}
              actualsData={actualsData}
              onCreateModel={() => navigate(`/projects/${projectId}/models/new`)}
              onViewModel={(modelId) => navigate(`/projects/${projectId}/models/${modelId}`)}
            />
          )}
        </TabsContent>

        {project.event_type === 'special' ? (
          <>
            <TabsContent value="forecast" className="space-y-4">
              <SpecialEventForecastForm projectId={project.id} />
            </TabsContent>
            <TabsContent value="actuals" className="space-y-4">
              <SpecialEventActualForm projectId={project.id} />
            </TabsContent>
            <TabsContent value="milestones" className="space-y-4">
              <MilestoneTracker projectId={project.id} />
            </TabsContent>
          </>
        ) : (
          <>
            <TabsContent value="models" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Financial Scenarios</CardTitle>
                  <CardDescription>
                    Compare and manage your financial scenarios and projections for this project.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  {financialModels.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Primary</TableHead>
                          <TableHead>Growth Scenario</TableHead>
                          <TableHead>Revenue Streams</TableHead>
                          <TableHead>Cost Categories</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {financialModels.map((model) => (
                          <TableRow key={model.id} className="cursor-pointer hover:bg-muted/50">
                            <TableCell className="font-medium">
                              <Link 
                                to={`/projects/${projectId}/models/${model.id}`}
                                className="text-fortress-blue hover:underline"
                              >
                                {model.name}
                              </Link>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                {model.isPrimary ? (
                                  <Badge variant="default" className="text-xs">
                                    <Target className="mr-1 h-3 w-3" />
                                    Primary
                                  </Badge>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleSetPrimaryModel(model.id);
                                    }}
                                    disabled={updatingPrimaryModel === model.id}
                                  >
                                    {updatingPrimaryModel === model.id ? (
                                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                    ) : (
                                      <Target className="mr-1 h-3 w-3" />
                                    )}
                                    Set Primary
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="capitalize">
                              {model.assumptions.growthModel.type}{" "}
                              ({(model.assumptions.growthModel.rate * 100).toFixed(0)}%)
                            </TableCell>
                            <TableCell>{model.assumptions.revenue.length}</TableCell>
                            <TableCell>{model.assumptions.costs.length}</TableCell>
                            <TableCell>{formatDate(model.createdAt)}</TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 w-8 p-0"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    navigate(`/projects/${projectId}/models/${model.id}`);
                                  }}
                                >
                                  <BarChart3 className="h-4 w-4" />
                                  <span className="sr-only">View</span>
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-10">
                      <div className="mb-4 flex justify-center">
                        <div className="rounded-full bg-muted p-4">
                          <BarChart3 className="h-6 w-6 text-muted-foreground" />
                        </div>
                      </div>
                      <h3 className="mb-1 text-lg font-medium">No financial scenarios yet</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Create your first financial scenario to start projecting revenue and costs.
                      </p>
                      <Button 
                        className="bg-fortress-emerald hover:bg-fortress-emerald/90"
                        onClick={() => navigate(`/projects/${projectId}/models/new`)}
                      >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        New Financial Scenario
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Model Comparison */}
              <ModelComparison
                models={financialModels}
                onViewModel={(modelId) => navigate(`/projects/${projectId}/models/${modelId}`)}
              />
            </TabsContent>
            
            <TabsContent value="performance" className="space-y-4">
              {financialModels.length > 0 ? (
                <>
                  {/* Model Selector */}
                  {financialModels.length > 1 && (
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center space-x-4">
                          <Label htmlFor="model-select" className="text-sm font-medium">
                            Track performance for:
                          </Label>
                          <Select value={selectedModelId} onValueChange={setSelectedModelId}>
                            <SelectTrigger id="model-select" className="w-64">
                              <SelectValue placeholder="Select a model" />
                            </SelectTrigger>
                            <SelectContent>
                              {financialModels.map((model) => (
                                <SelectItem key={model.id} value={model.id}>
                                  {model.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/projects/${projectId}/models/${selectedModelId}`)}
                          >
                            <BarChart3 className="mr-2 h-4 w-4" />
                            View Model Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                   <Suspense fallback={<ComponentLoader message="Loading actuals form..." />}>
                     <ActualsInputForm 
                        model={selectedModel} 
                        existingActuals={actualsData} 
                     />
                   </Suspense>
                   <ActualsDisplayTable 
                      model={selectedModel}
                      actualsData={actualsData} 
                   />
                </>
              ) : (
                <Card>
                  <CardHeader><CardTitle>Performance Tracking</CardTitle></CardHeader>
                  <CardContent><p className="text-muted-foreground">Create a financial model first to enable performance tracking.</p></CardContent>
                </Card>
              )}
            </TabsContent>
            
            <TabsContent value="analysis" className="space-y-4">
               <Suspense fallback={<ComponentLoader message="Loading performance analysis..." />}>
                 <PerformanceAnalysis 
                    financialModels={financialModels} 
                    actualsData={actualsData} 
                    projectId={projectId} 
                 />
               </Suspense>
            </TabsContent>
          </>
        )}
        
        <TabsContent value="risks" className="space-y-4">
          <RiskAssessmentTab 
            projectId={projectId || ''} 
            projectName={project.name}
            financialModels={financialModels.map(m => ({...m, periods: []}))}
            actualsData={actualsData}
            user={user}
          />
        </TabsContent>
      </Tabs>
      
      {project && (
        <ShareProjectModal 
          project={project}
          open={shareModalOpen}
          onOpenChange={setShareModalOpen}
        />
      )}
    </div>
  );
};

export default ProjectDetail;
