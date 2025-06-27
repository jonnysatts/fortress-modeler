
import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, Search, Globe, Users, User, Folder as FolderIcon } from "lucide-react";
import useStore from "@/store/useStore";
import { Input } from "@/components/ui/input";
import { config } from "@/lib/config";
import { ShareProjectDialog } from "@/components/ShareProjectDialog";
import { Project } from "@/lib/db";
import { toast } from "sonner";
import { ProjectCard } from "./ProjectCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { useMyProjects, useSharedProjects, usePublicProjects } from "@/hooks/useProjects";
import { useQueryClient } from "@tanstack/react-query";

const ProjectsList = () => {
  const navigate = useNavigate();
  const { setCurrentProject } = useStore();
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState('my-projects');
  const [searchTerm, setSearchTerm] = useState('');

  const queryClient = useQueryClient();

  const { data: myProjects = [], isLoading: isLoadingMyProjects, error: myProjectsError } = useMyProjects();
  const { data: sharedProjects = [], isLoading: isLoadingSharedProjects, error: sharedProjectsError } = useSharedProjects();
  const { data: publicProjects = [], isLoading: isLoadingPublicProjects, error: publicProjectsError } = usePublicProjects();

  // Filter out UUID projects if cloud sync is disabled
  const availableProjects = config.useCloudSync 
    ? myProjects 
    : myProjects.filter(project => typeof project.id === 'number');
  
  const filteredAvailableProjects = useMemo(() => {
    if (!searchTerm) return availableProjects;
    
    return availableProjects.filter(project => {
      if (!project?.name) return false;
      return project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
             (project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
             (project.productType && project.productType.toLowerCase().includes(searchTerm.toLowerCase()));
    });
  }, [availableProjects, searchTerm]);

  const filteredSharedProjects = useMemo(() => {
    if (!searchTerm) return sharedProjects;
    return sharedProjects.filter(project => {
      if (!project?.name) return false;
      return project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
             (project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
             (project.productType && project.productType.toLowerCase().includes(searchTerm.toLowerCase()));
    });
  }, [sharedProjects, searchTerm]);

  const filteredPublicProjects = useMemo(() => {
    if (!searchTerm) return publicProjects;
    return publicProjects.filter(project => {
      if (!project?.name) return false;
      return project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
             (project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
             (project.productType && project.productType.toLowerCase().includes(searchTerm.toLowerCase()));
    });
  }, [publicProjects, searchTerm]);

  function handleShareClick(project: Project, e: React.MouseEvent) {
    e.stopPropagation();
    setSelectedProject(project);
    setShareDialogOpen(true);
  }

  const handleToggleVisibility = async (project: Project, isPublic: boolean) => {
    // Invalidate relevant queries to refetch data
    queryClient.invalidateQueries({ queryKey: ['projects', 'my'] });
    if (isPublic) {
      queryClient.invalidateQueries({ queryKey: ['projects', 'public'] });
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
                My Projects ({isLoadingMyProjects ? '...' : filteredAvailableProjects.length})
              </TabsTrigger>
              <TabsTrigger value="shared" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Shared with Me ({isLoadingSharedProjects ? '...' : filteredSharedProjects.length})
              </TabsTrigger>
              <TabsTrigger value="public" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Public ({isLoadingPublicProjects ? '...' : filteredPublicProjects.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="my-projects" className="space-y-4">
              {isLoadingMyProjects ? (
                <div>Loading my projects...</div>
              ) : myProjectsError ? (
                <div className="text-red-500">Error loading my projects: {myProjectsError.message}</div>
              ) : filteredAvailableProjects.length === 0 ? (
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
              {isLoadingSharedProjects ? (
                <div>Loading shared projects...</div>
              ) : sharedProjectsError ? (
                <div className="text-red-500">Error loading shared projects: {sharedProjectsError.message}</div>
              ) : filteredSharedProjects.length === 0 ? (
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
              {isLoadingPublicProjects ? (
                <div>Loading public projects...</div>
              ) : publicProjectsError ? (
                <div className="text-red-500">Error loading public projects: {publicProjectsError.message}</div>
              ) : filteredPublicProjects.length === 0 ? (
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
            {isLoadingMyProjects ? (
              <div>Loading my projects...</div>
            ) : myProjectsError ? (
              <div className="text-red-500">Error loading my projects: {myProjectsError.message}</div>
            ) : filteredAvailableProjects.length === 0 ? (
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
            queryClient.invalidateQueries({ queryKey: ['projects', 'shared'] });
            toast.success('Project sharing updated');
          }}
        />
      )}
    </>
  );
};

export default ProjectsList;
