
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PlusCircle, Search, Globe, Users, User, Folder as FolderIcon } from "lucide-react";
import useStore from "@/store/useStore";
import { Input } from "@/components/ui/input";
import { config } from "@/lib/config";
import { ShareProjectDialog } from "@/components/ShareProjectDialog";
import { apiService } from "@/lib/api";
import { Project } from "@/lib/db";
import { toast } from "sonner";
import { ProjectCard } from "./ProjectCard";
import { EmptyState } from "@/components/ui/EmptyState";

const ProjectsList = () => {
  const navigate = useNavigate();
  const { projects, loadProjects, setCurrentProject } = useStore();
  const [sharedProjects, setSharedProjects] = useState<Project[]>([]);
  const [publicProjects, setPublicProjects] = useState<Project[]>([]);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState('my-projects');
  const [searchTerm, setSearchTerm] = useState('');

  // Helper function to check if user is authenticated
  const isAuthenticated = () => {
    try {
      const token = localStorage.getItem('auth_token');
      const userData = localStorage.getItem('user_data');
      return !!(token && userData);
    } catch (error) {
      console.error("Could not get auth data from localStorage", error);
    }
    return false;
  };

  const loadSharedProjects = useCallback(async () => {
    if (!isAuthenticated()) {
      console.log('Not authenticated, skipping shared projects load');
      return;
    }
    try {
      const response = await apiService.getSharedWithMeProjects();
      setSharedProjects(response.projects);
    } catch (error) {
      console.error('Failed to load shared projects:', error);
      // If we get a 401, clear the shared projects array
      if (error instanceof Error && error.message.includes('401')) {
        setSharedProjects([]);
      }
    }
  }, []);

  const loadPublicProjects = useCallback(async () => {
    if (!isAuthenticated()) {
      console.log('Not authenticated, skipping public projects load');
      return;
    }
    try {
      const response = await apiService.getPublicProjects();
      setPublicProjects(response.projects);
    } catch (error) {
      console.error('Failed to load public projects:', error);
      // If we get a 401, clear the public projects array
      if (error instanceof Error && error.message.includes('401')) {
        setPublicProjects([]);
      }
    }
  }, []);

  useEffect(() => {
    loadProjects();
    if (config.useCloudSync && isAuthenticated()) {
      loadSharedProjects();
      loadPublicProjects();
    }
  }, [loadProjects, loadSharedProjects, loadPublicProjects]);

  // Filter out UUID projects if cloud sync is disabled
  const projectsArray = Object.values(projects);
  const availableProjects = config.useCloudSync 
    ? projectsArray 
    : projectsArray.filter(project => typeof project.id === 'number');
  
  // Simple inline filtering to avoid function hoisting issues
  const filteredAvailableProjects = React.useMemo(() => {
    console.log('🔍 filtering availableProjects:', availableProjects.length, 'searchTerm:', searchTerm);
    if (!searchTerm) return availableProjects;
    
    return availableProjects.filter(project => {
      if (!project?.name) return false;
      return project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
             (project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
             (project.productType && project.productType.toLowerCase().includes(searchTerm.toLowerCase()));
    });
  }, [availableProjects, searchTerm]);

  const filteredSharedProjects = React.useMemo(() => {
    if (!searchTerm) return sharedProjects;
    return sharedProjects.filter(project => {
      if (!project?.name) return false;
      return project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
             (project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
             (project.productType && project.productType.toLowerCase().includes(searchTerm.toLowerCase()));
    });
  }, [sharedProjects, searchTerm]);

  const filteredPublicProjects = React.useMemo(() => {
    if (!searchTerm) return publicProjects;
    return publicProjects.filter(project => {
      if (!project?.name) return false;
      return project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
             (project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
             (project.productType && project.productType.toLowerCase().includes(searchTerm.toLowerCase()));
    });
  }, [publicProjects, searchTerm]);
  
  console.log('🔍 ProjectsList: availableProjects:', availableProjects.map(p => ({ id: p.id, name: p.name, idType: typeof p.id })));
  console.log('🔍 ProjectsList: first few projects:', availableProjects.slice(0, 3).map(p => ({ id: p.id, name: p.name, productType: p.productType })));
  console.log('🔍 ProjectsList: searchTerm:', searchTerm);
  console.log('🔍 ProjectsList: filtered projects count:', filteredAvailableProjects.length);
  console.log('🔍 ProjectsList: projects object from store:', Object.keys(projects).length, 'keys');
  console.log('🔍 ProjectsList: config.useCloudSync:', config.useCloudSync);

  function handleShareClick(project: Project, e: React.MouseEvent) {
    e.stopPropagation();
    setSelectedProject(project);
    setShareDialogOpen(true);
  }

  const handleToggleVisibility = async (project: Project, isPublic: boolean) => {
    // Refresh the lists after visibility change
    await loadProjects();
    if (isPublic) {
      await loadPublicProjects();
    }
  };


  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-fortress-blue">Projects</h1>
          <Button 
            onClick={() => navigate("/projects/new")} 
            className="bg-fortress-emerald hover:bg-fortress-emerald/90"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </div>
        
        <div className="w-full max-w-md relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search projects..." 
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {config.useCloudSync ? (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="my-projects" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                My Projects ({filteredAvailableProjects.length})
              </TabsTrigger>
              <TabsTrigger value="shared" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Shared with Me ({filteredSharedProjects.length})
              </TabsTrigger>
              <TabsTrigger value="public" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Public ({filteredPublicProjects.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="my-projects" className="space-y-4">
              {filteredAvailableProjects.length === 0 ? (
                <EmptyState
                  icon={FolderIcon}
                  title="No projects found"
                  description={searchTerm ? "No projects match your search." : "Get started by creating your first project. You'll be able to define product details, create financial models, and track performance."}
                  action={!searchTerm && (
                    <Button 
                      onClick={() => navigate("/projects/new")} 
                      className="bg-fortress-emerald hover:bg-fortress-emerald/90"
                    >
                      Create Your First Project
                    </Button>
                  )}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredAvailableProjects.map((project) => (
                    <ProjectCard 
                      key={project.id} 
                      project={project} 
                      onShareClick={handleShareClick}
                      onToggleVisibility={handleToggleVisibility}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="shared" className="space-y-4">
              {filteredSharedProjects.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No shared projects"
                  description={searchTerm ? "No shared projects match your search." : "Projects that others share with you will appear here."}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredSharedProjects.map((project) => (
                    <ProjectCard 
                      key={project.id} 
                      project={project} 
                      onShareClick={handleShareClick}
                      onToggleVisibility={handleToggleVisibility}
                      permission={project.shared_by ? 'view' : 'edit'} 
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="public" className="space-y-4">
              {filteredPublicProjects.length === 0 ? (
                <EmptyState
                  icon={Globe}
                  title="No public projects"
                  description={searchTerm ? "No public projects match your search." : "Public projects created by other users will appear here."}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredPublicProjects.map((project) => (
                    <ProjectCard 
                      key={project.id} 
                      project={project} 
                      onShareClick={handleShareClick}
                      onToggleVisibility={handleToggleVisibility}
                      permission="view" />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          // Non-cloud sync fallback
          <>
            {filteredAvailableProjects.length === 0 ? (
              <EmptyState
                icon={FolderIcon}
                title="No projects found"
                description={searchTerm ? "No projects match your search." : "Get started by creating your first project. You'll be able to define product details, create financial models, and track performance."}
                action={!searchTerm && (
                  <Button 
                    onClick={() => navigate("/projects/new")} 
                    className="bg-fortress-emerald hover:bg-fortress-emerald/90"
                  >
                    Create Your First Project
                  </Button>
                )}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAvailableProjects.map((project) => (
                  <ProjectCard 
                    key={project.id} 
                    project={project} 
                    onShareClick={handleShareClick}
                    onToggleVisibility={handleToggleVisibility}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Share Dialog */}
      {selectedProject && (
        <ShareProjectDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          projectId={selectedProject.id!.toString()}
          projectName={selectedProject.name}
          onShareSuccess={() => {
            loadSharedProjects();
            toast.success('Project sharing updated');
          }}
        />
      )}
    </>
  );
};

export default ProjectsList;
