import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PlusCircle, Search, Folder as FolderIcon, Globe, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectCard } from "./ProjectCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { useMyProjects, useSharedProjects, usePublicProjects } from "@/hooks/useProjects";
import { isCloudModeEnabled } from "@/config/app.config";

const ProjectsList = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('my-projects');
  const cloudEnabled = isCloudModeEnabled();

  const { data: myProjects = [], isLoading: isLoadingMyProjects, error: myProjectsError } = useMyProjects();
  const { data: sharedProjects = [], isLoading: isLoadingSharedProjects, error: sharedProjectsError } = useSharedProjects();
  const { data: publicProjects = [], isLoading: isLoadingPublicProjects, error: publicProjectsError } = usePublicProjects();

  const filterProjects = (projects: any[]) => {
    if (!searchTerm) return projects;
    
    return projects.filter(project => {
      if (!project?.name) return false;
      return project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
             (project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
             (project.productType && project.productType.toLowerCase().includes(searchTerm.toLowerCase()));
    });
  };

  const filteredMyProjects = useMemo(() => filterProjects(myProjects), [myProjects, searchTerm]);
  const filteredSharedProjects = useMemo(() => filterProjects(sharedProjects), [sharedProjects, searchTerm]);
  const filteredPublicProjects = useMemo(() => filterProjects(publicProjects), [publicProjects, searchTerm]);

  return (
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
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {cloudEnabled ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="my-projects" className="gap-2">
              <FolderIcon className="h-4 w-4" />
              My Projects
            </TabsTrigger>
            <TabsTrigger value="shared" className="gap-2">
              <Users className="h-4 w-4" />
              Shared
            </TabsTrigger>
            <TabsTrigger value="public" className="gap-2">
              <Globe className="h-4 w-4" />
              Public
            </TabsTrigger>
          </TabsList>

          <TabsContent value="my-projects" className="space-y-4">
            {isLoadingMyProjects ? (
              <div>Loading projects...</div>
            ) : myProjectsError ? (
              <div className="text-red-500">Error loading projects: {myProjectsError.message}</div>
            ) : filteredMyProjects.length === 0 ? (
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
                {filteredMyProjects.map((project) => (
                  <ProjectCard 
                    key={project.id} 
                    project={project} 
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
                description="Projects that others have shared with you will appear here."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSharedProjects.map((project) => (
                  <ProjectCard 
                    key={project.id} 
                    project={project} 
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
                description="Public projects from the community will appear here."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPublicProjects.map((project) => (
                  <ProjectCard 
                    key={project.id} 
                    project={project} 
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      ) : (
        // Local mode - show only my projects
        isLoadingMyProjects ? (
          <div>Loading projects...</div>
        ) : myProjectsError ? (
          <div className="text-red-500">Error loading projects: {myProjectsError.message}</div>
        ) : filteredMyProjects.length === 0 ? (
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
            {filteredMyProjects.map((project) => (
              <ProjectCard 
                key={project.id} 
                project={project} 
              />
            ))}
          </div>
        )
      )}
    </div>
  );
};

export default ProjectsList;