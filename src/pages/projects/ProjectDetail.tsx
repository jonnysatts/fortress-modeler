import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Edit, Trash2, PlusCircle, BarChart3, AlertTriangle, Building } from "lucide-react";
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
import useStore from "@/store/useStore";
import { db, FinancialModel, getActualsForProject } from "@/lib/db";
import { storageService } from "@/lib/hybrid-storage";
import { ActualsPeriodEntry } from "@/types/models";
import { toast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ActualsInputForm } from "@/components/models/ActualsInputForm";
import ModelOverview from "@/components/models/ModelOverview";
import { ActualsDisplayTable } from "@/components/models/ActualsDisplayTable";
import { PerformanceAnalysis } from "@/components/models/PerformanceAnalysis";
import { config } from "@/lib/config";

const ProjectDetail = () => {
    const { projectId } = useParams<{ projectId: string }>();
    console.log('🎨 ProjectDetail render - projectId:', projectId, 'timestamp:', Date.now());

  const navigate = useNavigate();

  // Guard against invalid project IDs
  useEffect(() => {
    if (!projectId || projectId === 'NaN' || projectId === '[object Object]' || projectId.includes('object')) {
      console.error('Invalid project ID:', projectId);
      navigate('/projects', { replace: true });
      return;
    }
  }, [projectId, navigate]);
  const [loading, setLoading] = useState(true);
  const [financialModels, setFinancialModels] = useState<FinancialModel[]>([]);
  const { currentProject, setCurrentProject, deleteProject, loadProjectById } = useStore();
  const [activeTab, setActiveTab] = useState("overview");

  const [actualsData, setActualsData] = useState<ActualsPeriodEntry[]>([]);
  const fetchActualsData = useCallback(async () => {
    if (!projectId) return;
    try {
      // Handle both integer IDs and UUID strings
      const numericId = isNaN(parseInt(projectId)) ? 0 : parseInt(projectId);
      const data = await getActualsForProject(numericId);
      setActualsData(data);
    } catch (error) {
      console.error("Error fetching actuals data:", error);
      // Don't show error toast for UUID projects (they won't have actuals data yet)
      if (!isNaN(parseInt(projectId))) {
        toast({ variant: "destructive", title: "Error Loading Actuals", description: "Could not load performance data." });
      }
      setActualsData([]);
    }
  }, [projectId]);

  useEffect(() => {
    console.log('🌀 ProjectDetail useEffect triggered - projectId:', projectId, 'timestamp:', Date.now());
    
    const fetchProjectAndRelatedData = async () => {
      if (!projectId) return;
      setLoading(true);
      try {
        // Handle both integer and UUID project IDs
        // Check if it's a UUID (contains hyphens and is 36 chars long)
        const isUUID = projectId.includes('-') && projectId.length === 36;
        let project = null;
        
        if (isUUID) {
          // For UUID projects, we need cloud API (check if cloud sync is enabled)
          if (config.useCloudSync) {
            console.log('🌐 Loading UUID project via cloud API');
            project = await loadProjectById(projectId);
          } else {
            // Cloud sync is disabled but trying to access UUID project - redirect to projects list
            toast({
              variant: "destructive",
              title: "Project unavailable",
              description: "This project requires cloud access. Please contact support.",
            });
            navigate("/projects");
            return;
          }
        } else {
          // For integer projects, use the old method
          console.log('🔢 Loading integer project');
          project = await loadProjectById(projectId);
        }
        
        if (project) {
          setCurrentProject(project);
          // Load financial models - for cloud projects, they should come from the API
          if (!isUUID && project.id) {
            // Local integer projects - load from IndexedDB
            if (!project) throw new Error('Project not loaded before fetching models');
            const models = await db.financialModels.where('projectId').equals(project.id).toArray();
            setFinancialModels(models);
          } else if (isUUID) {
            // For UUID projects, load models from the cloud API
            console.log('📱 Loading models for UUID project from cloud API');
            try {
              const models = await storageService.getModelsForProject(project.id!.toString());
              console.log('✅ Loaded', models.length, 'models from cloud API');
              setFinancialModels(models);
            } catch (error) {
              console.error('❌ Failed to load models from cloud:', error);
              setFinancialModels([]);
            }
          }
          fetchActualsData();
        } else {
          toast({
            variant: "destructive",
            title: "Project not found",
            description: "The requested project could not be found.",
          });
          navigate("/projects");
        }
      } catch (error) {
        console.error("Error fetching project:", error);
        toast({
          variant: "destructive",
          title: "Error loading project",
          description: "There was an error loading the project. Please try again.",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchProjectAndRelatedData();
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const handleActualsSaved = () => {
    fetchActualsData();
  };

  const handleDeleteProject = async () => {
    if (!currentProject?.id) return;
    
    try {
      await deleteProject(currentProject.id);
      toast({
        title: "Project deleted",
        description: "The project has been successfully deleted.",
      });
      navigate("/projects");
    } catch (error) {
      console.error("Error deleting project:", error);
      toast({
        variant: "destructive",
        title: "Failed to delete project",
        description: "There was an error deleting the project. Please try again.",
      });
    }
  };

  if (loading || !currentProject) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="h-10 w-10 border-4 border-fortress-emerald border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/projects")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Avatar className="h-16 w-16 border">
            <AvatarImage src={currentProject.avatarImage} alt={`${currentProject.name} avatar`} />
            <AvatarFallback>
               {currentProject.name.substring(0, 2).toUpperCase() || <Building size={24}/>}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold text-fortress-blue">{currentProject.name}</h1>
            <div className="flex items-center mt-1 space-x-2">
              <Badge variant="outline" className="text-fortress-blue border-fortress-blue">
                {currentProject.productType}
              </Badge>
              <p className="text-sm text-muted-foreground">
                Created on {new Date(currentProject.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
        <div className="flex space-x-2 self-start sm:self-center">
          <Button variant="outline" size="sm" onClick={() => navigate(`/projects/${projectId}/edit`)}>
            <Edit className="mr-1 h-4 w-4" />
            Edit
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

      {currentProject.description && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm">{currentProject.description}</p>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="models">Financial Models</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
          <TabsTrigger value="risks">Risk Assessment</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          {currentProject && financialModels.length > 0 ? (
             <ModelOverview 
                model={financialModels[0]} // Pass directly, types should match now
                projectId={projectId} 
                actualsData={actualsData} 
             />
          ) : (
              <div className="text-center py-10 text-muted-foreground">
                 {loading ? "Loading..." : "Create a financial model to see an overview."}
              </div>
          )}
        </TabsContent>
        
        <TabsContent value="models" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Financial Models</CardTitle>
                <CardDescription>
                  Create and manage financial models for this project
                </CardDescription>
              </div>
              <Button 
                className="bg-fortress-emerald hover:bg-fortress-emerald/90"
                onClick={() => navigate(`/projects/${projectId}/models/new`)}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                New Model
              </Button>
            </CardHeader>
            <CardContent className="pt-6">
              {financialModels.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Growth Model</TableHead>
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
                  <h3 className="mb-1 text-lg font-medium">No financial models yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create your first financial model to start projecting revenue and costs.
                  </p>
                  <Button 
                    className="bg-fortress-emerald hover:bg-fortress-emerald/90"
                    onClick={() => navigate(`/projects/${projectId}/models/new`)}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    New Financial Model
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="performance" className="space-y-4">
          {financialModels.length > 0 ? (
            <>
               <ActualsInputForm 
                  model={financialModels[0]} 
                  existingActuals={actualsData} 
                  onActualsSaved={handleActualsSaved} 
               />
               <ActualsDisplayTable 
                  model={financialModels[0]}
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
           <PerformanceAnalysis 
              financialModels={financialModels} 
              actualsData={actualsData} 
              projectId={projectId} 
           />
        </TabsContent>
        
        <TabsContent value="risks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Risk Assessment</CardTitle>
              <CardDescription>
                Identify and manage project risks
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-center py-10">
                <div className="mb-4 flex justify-center">
                  <div className="rounded-full bg-muted p-4">
                    <AlertTriangle className="h-6 w-6 text-muted-foreground" />
                  </div>
                </div>
                <h3 className="mb-1 text-lg font-medium">No risks identified yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Document potential risks to better manage your project.
                </p>
                <Button className="bg-fortress-emerald hover:bg-fortress-emerald/90">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Risk
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProjectDetail;
