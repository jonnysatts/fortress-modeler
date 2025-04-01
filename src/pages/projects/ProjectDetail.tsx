import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Edit, Trash2, PlusCircle, BarChart3, AlertTriangle, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
import { db, getProject, FinancialModel } from "@/lib/db";
import { toast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ProjectDetail = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [financialModels, setFinancialModels] = useState<FinancialModel[]>([]);
  const { currentProject, setCurrentProject, deleteProject } = useStore();

  useEffect(() => {
    const fetchProject = async () => {
      if (!projectId) return;
      
      setLoading(true);
      try {
        const project = await getProject(parseInt(projectId));
        if (project) {
          setCurrentProject(project);
          
          // Load financial models for this project
          const models = await db.financialModels
            .where('projectId')
            .equals(parseInt(projectId))
            .toArray();
          
          setFinancialModels(models);
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

    fetchProject();
  }, [projectId, setCurrentProject, navigate]);

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

  // Format date for display
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

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="models">Financial Models</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="risks">Risk Assessment</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Project Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Product Type</p>
                    <p className="font-medium">{currentProject.productType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Target Audience</p>
                    <p className="font-medium">{currentProject.targetAudience || "Not specified"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Start Date</p>
                    <p className="font-medium">
                      {currentProject.timeline?.startDate
                        ? new Date(currentProject.timeline.startDate).toLocaleDateString()
                        : "Not specified"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">End Date</p>
                    <p className="font-medium">
                      {currentProject.timeline?.endDate
                        ? new Date(currentProject.timeline.endDate).toLocaleDateString()
                        : "Not specified"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Key Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Financial Models</p>
                    <p className="text-2xl font-bold">{financialModels.length}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Performance Entries</p>
                    <p className="text-2xl font-bold">0</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Identified Risks</p>
                    <p className="text-2xl font-bold">0</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Scenarios</p>
                    <p className="text-2xl font-bold">0</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recently Updated</CardTitle>
            </CardHeader>
            <CardContent>
              {financialModels.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="font-medium">Financial Models</h3>
                  <ul className="space-y-2">
                    {financialModels
                      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                      .slice(0, 3)
                      .map((model) => (
                        <li key={model.id} className="border-b pb-2">
                          <Link 
                            to={`/projects/${projectId}/models/${model.id}`}
                            className="text-fortress-blue hover:underline"
                          >
                            {model.name}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            Updated {formatDate(model.updatedAt)}
                          </p>
                        </li>
                      ))}
                  </ul>
                </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <p>No recent activity for this project.</p>
                </div>
              )}
            </CardContent>
          </Card>
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
          <Card>
            <CardHeader>
              <CardTitle>Performance Tracking</CardTitle>
              <CardDescription>
                Record and analyze actual performance data
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-center py-10">
                <div className="mb-4 flex justify-center">
                  <div className="rounded-full bg-muted p-4">
                    <BarChart3 className="h-6 w-6 text-muted-foreground" />
                  </div>
                </div>
                <h3 className="mb-1 text-lg font-medium">No performance data yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add performance data to track actual results against projections.
                </p>
                <Button className="bg-fortress-emerald hover:bg-fortress-emerald/90">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Performance Data
                </Button>
              </div>
            </CardContent>
          </Card>
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
