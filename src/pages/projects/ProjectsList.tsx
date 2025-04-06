
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Search } from "lucide-react";
import useStore from "@/store/useStore";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

const ProjectsList = () => {
  const navigate = useNavigate();
  const { projects, loadProjects, setCurrentProject } = useStore();

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleProjectClick = (projectId: number) => {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      setCurrentProject(project);
      navigate(`/projects/${projectId}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-fortress-blue">Products</h1>
        <Button
          onClick={() => navigate("/projects/new")}
          className="bg-fortress-emerald hover:bg-fortress-emerald/90"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          New Product
        </Button>
      </div>

      <div className="w-full max-w-md relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search products..."
          className="pl-10"
        />
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <FolderIcon className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold">No products found</h2>
          <p className="text-muted-foreground text-center max-w-md">
            Get started by creating your first product. You'll be able to define product details,
            create financial models, and track performance.
          </p>
          <Button
            onClick={() => navigate("/projects/new")}
            className="bg-fortress-emerald hover:bg-fortress-emerald/90"
          >
            Create Your First Product
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleProjectClick(project.id!)}
            >
              <CardHeader>
                <CardTitle className="text-lg">{project.name}</CardTitle>
                <CardDescription>{project.productType}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {project.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {project.description}
                    </p>
                  )}
                  <div className="flex justify-between text-xs text-muted-foreground pt-2">
                    <span>Created {format(new Date(project.createdAt), 'MMM d, yyyy')}</span>
                    <span>Updated {format(new Date(project.updatedAt), 'MMM d, yyyy')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

const FolderIcon = ({ className }: { className?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
    </svg>
  );
};

export default ProjectsList;
