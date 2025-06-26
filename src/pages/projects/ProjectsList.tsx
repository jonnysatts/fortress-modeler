
import { useEffect, useState } from "react";
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
import { PlusCircle, Search, Share2, MoreVertical, Globe, Users, User } from "lucide-react";
import useStore from "@/store/useStore";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { config } from "@/lib/config";
import { ShareProjectDialog } from "@/components/ShareProjectDialog";
import { ShareStatusBadge, ShareCountBadge } from "@/components/ShareStatusBadge";
import { PublicPrivateToggle } from "@/components/PublicPrivateToggle";
import { apiService } from "@/lib/api";
import { Project } from "@/lib/db";
import { toast } from "sonner";

const ProjectsList = () => {
  const navigate = useNavigate();
  const { projects, loadProjects, setCurrentProject } = useStore();
  const [sharedProjects, setSharedProjects] = useState<Project[]>([]);
  const [publicProjects, setPublicProjects] = useState<Project[]>([]);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState('my-projects');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadProjects();
    if (config.useCloudSync) {
      loadSharedProjects();
      loadPublicProjects();
    }
  }, [loadProjects]);

  const loadSharedProjects = async () => {
    try {
      const response = await apiService.getSharedWithMeProjects();
      setSharedProjects(response.projects);
    } catch (error) {
      console.error('Failed to load shared projects:', error);
    }
  };

  const loadPublicProjects = async () => {
    try {
      const response = await apiService.getPublicProjects();
      setPublicProjects(response.projects);
    } catch (error) {
      console.error('Failed to load public projects:', error);
    }
  };

  // Filter out UUID projects if cloud sync is disabled
  const availableProjects = config.useCloudSync 
    ? projects 
    : projects.filter(project => typeof project.id === 'number');
  
  console.log('🔍 ProjectsList: availableProjects:', availableProjects.map(p => ({ id: p.id, name: p.name, idType: typeof p.id })));

  const filterProjects = (projectList: Project[]) => {
    if (!searchTerm) return projectList;
    return projectList.filter(project =>
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.productType.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const handleProjectClick = (projectId: number | string) => {
    console.log('🔍 MANUAL FIX v2: Clicking project', projectId, 'timestamp:', Date.now());

    // IMMEDIATE NAVIGATION - this fixes the dead projects
    navigate(`/projects/${projectId}`);

    // Try to find and set project state (optional)
    const allProjects = [...availableProjects, ...sharedProjects, ...publicProjects];
    const project = allProjects.find(p => p.id === projectId || String(p.id) === String(projectId));
    if (project) {
      setCurrentProject(project);
    }
  };

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

  const ProjectCard = ({ project, permission = 'owner' }: { project: Project; permission?: 'owner' | 'view' | 'edit' }) => (
    <Card 
      className="hover:shadow-xl transition-all duration-300 cursor-pointer relative border-2 hover:border-fortress-emerald bg-gradient-to-r from-white to-blue-50/20 hover:from-blue-50/40 hover:to-fortress-emerald/10 shadow-md hover:shadow-lg transform hover:-translate-y-1"
      onClick={() => handleProjectClick(project.id!)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate font-bold text-fortress-blue">{project.name}</CardTitle>
            <CardDescription className="truncate text-fortress-slate">{project.productType}</CardDescription>
          </div>
          
          {permission === 'owner' && (
            <div className="flex items-center gap-1">
              {!config.useCloudSync && (
                <div className="text-xs px-3 py-1 bg-gradient-to-r from-fortress-emerald to-fortress-emerald/80 text-white rounded-full font-semibold shadow-sm">
                  🏠 Local Mode
                </div>
              )}
              {config.useCloudSync && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 hover:bg-fortress-emerald/20"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => handleShareClick(project, e)}>
                      <Share2 className="mr-2 h-4 w-4" />
                      Share Project
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <div className="px-2 py-1.5">
                      <PublicPrivateToggle
                        projectId={project.id!.toString()}
                        isPublic={project.is_public}
                        size="sm"
                        showLabel={true}
                        onToggle={(isPublic) => handleToggleVisibility(project, isPublic)}
                      />
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2 mt-3">
          {config.useCloudSync ? (
            <>
              <ShareStatusBadge project={project} permission={permission} size="sm" />
              {project.shared_by && (
                <div className="text-xs text-gray-500">
                  by {project.owner_email}
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center gap-3">
              <div className="text-xs px-3 py-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full font-medium shadow-sm">
                <User className="h-3 w-3 inline mr-1" />
                Owner
              </div>
              <div className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded font-mono">
                ID: {project.id}
              </div>
              <div className="text-xs px-2 py-1 bg-fortress-emerald/10 text-fortress-emerald rounded border border-fortress-emerald/20">
                📊 Active
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-2">
          {project.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {project.description}
            </p>
          )}
          <div className="flex justify-between text-xs text-muted-foreground pt-2">
            <span>Created {(() => {
              try {
                return project.createdAt ? format(new Date(project.createdAt), 'MMM d, yyyy') : 'Unknown';
              } catch {
                return 'Unknown';
              }
            })()}</span>
            <span>Updated {(() => {
              try {
                return project.updatedAt ? format(new Date(project.updatedAt), 'MMM d, yyyy') : 'Unknown';
              } catch {
                return 'Unknown';
              }
            })()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const EmptyState = ({ 
    icon: Icon, 
    title, 
    description, 
    action 
  }: { 
    icon: any; 
    title: string; 
    description: string; 
    action?: React.ReactNode; 
  }) => (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="text-muted-foreground text-center max-w-md">{description}</p>
      {action}
    </div>
  );

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
                My Projects ({filterProjects(availableProjects).length})
              </TabsTrigger>
              <TabsTrigger value="shared" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Shared with Me ({filterProjects(sharedProjects).length})
              </TabsTrigger>
              <TabsTrigger value="public" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Public ({filterProjects(publicProjects).length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="my-projects" className="space-y-4">
              {filterProjects(availableProjects).length === 0 ? (
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
                  {filterProjects(availableProjects).map((project) => (
                    <ProjectCard key={project.id} project={project} permission="owner" />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="shared" className="space-y-4">
              {filterProjects(sharedProjects).length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No shared projects"
                  description={searchTerm ? "No shared projects match your search." : "Projects that others share with you will appear here."}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filterProjects(sharedProjects).map((project) => (
                    <ProjectCard 
                      key={project.id} 
                      project={project} 
                      permission={project.shared_by ? 'view' : 'edit'} 
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="public" className="space-y-4">
              {filterProjects(publicProjects).length === 0 ? (
                <EmptyState
                  icon={Globe}
                  title="No public projects"
                  description={searchTerm ? "No public projects match your search." : "Public projects created by other users will appear here."}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filterProjects(publicProjects).map((project) => (
                    <ProjectCard key={project.id} project={project} permission="view" />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          // Non-cloud sync fallback
          <>
            {filterProjects(availableProjects).length === 0 ? (
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
                {filterProjects(availableProjects).map((project) => (
                  <ProjectCard key={project.id} project={project} permission="owner" />
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
