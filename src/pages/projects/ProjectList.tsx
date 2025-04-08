import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PlusCircle, Building, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import useStore from "@/store/useStore";

const ProjectList = () => {
  const navigate = useNavigate();
  const {
    projects,
    loadProjects,
    error,
    loading
  } = useStore(state => ({
    projects: state.projects,
    loadProjects: state.loadProjects,
    error: state.error,
    loading: state.loading
  }));

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-fortress-blue">Projects</h1>
        <Button onClick={() => navigate("/projects/new")}>
          <PlusCircle className="mr-2 h-4 w-4" /> Create New Project
        </Button>
      </div>

      {/* Error state */}
      {error.isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error.message || 'Failed to load projects. Please try again.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Loading state */}
      {loading.isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="flex flex-col">
              <CardHeader className="flex flex-row items-start gap-4 space-y-0">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </CardHeader>
              <CardContent className="flex-grow">
                <Skeleton className="h-24 w-full" />
              </CardContent>
              <CardFooter className="flex justify-between">
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-8 w-24" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">No projects found.</p>
            <Button className="mt-4" onClick={() => navigate("/projects/new")}>
              Create Your First Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Card key={project.id} className="flex flex-col">
              <CardHeader className="flex flex-row items-start gap-4 space-y-0">
                <Avatar className="h-12 w-12 border">
                  <AvatarImage src={project.avatarImage} alt={`${project.name} avatar`} />
                  <AvatarFallback>
                    {project.name.substring(0, 2).toUpperCase() || <Building size={20}/>}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <CardTitle>{project.name}</CardTitle>
                  <CardDescription className="line-clamp-2 mt-1">
                    {project.description || "No description available."}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="flex-grow">
                {/* Can add other details here if needed */}
              </CardContent>
              <CardFooter className="flex justify-between text-xs text-muted-foreground">
                <span>Updated: {formatDate(project.updatedAt)}</span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(`/projects/${project.id}/summary`)}
                >
                  View Project
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectList;