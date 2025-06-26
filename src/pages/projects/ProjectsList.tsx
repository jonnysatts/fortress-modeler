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
Unchanged lines  const [searchTerm, setSearchTerm] = useState('');

  const loadSharedProjects = useCallback(async () => {
    try {
      const response = await apiService.getSharedWithMeProjects();
      setSharedProjects(response.projects);
    } catch (error) {
      console.error('Failed to load shared projects:', error);
    }
  }, []);

  const loadPublicProjects = useCallback(async () => {
    try {
      const response = await apiService.getPublicProjects();
      setPublicProjects(response.projects);
    } catch (error) {
      console.error('Failed to load public projects:', error);
    }
  }, []);
Unchanged lines  const availableProjects = config.useCloudSync 
    ? projectsArray 
    : projectsArray.filter(project => typeof project.id === 'number');
  

  console.log('🔍 ProjectsList: availableProjects:', availableProjects.map(p => ({ id: p.id, name: p.name, idType: typeof p.id })));

  const filterProjects = (projectList: Project[]) => {
Unchanged lines    setShareDialogOpen(true);
  }

  const handleToggleVisibility = async (project: Project, isPublic: boolean) => {
  const handleToggleVisibility = async (project: Project, isPublic: boolean) => { // Added isPublic parameter
    // Refresh the lists after visibility change
    await loadProjects();
    if (isPublic) {
      await loadPublicProjects();
    }
  };

  return (
    <>
  
  return ( // Removed unnecessary fragment
    <> 
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-fortress-blue">Projects</h1>
Unchanged lines                      key={project.id} 
                      project={project} 
                      onShareClick={handleShareClick}
                      onToggleVisibility={handleToggleVisibility}
                    />
                  ))}
                </div>
              )}
Unchanged lines                    <ProjectCard 
                      key={project.id} 
                      project={project} 
                      onShareClick={handleShareClick}
                      onToggleVisibility={handleToggleVisibility}
                      permission={project.shared_by ? 'view' : 'edit'} 
                    />
                  ))}
Unchanged lines                  {filterProjects(publicProjects).map((project) => (
                    <ProjectCard 
                      key={project.id} 
                      project={project} 
                      onShareClick={handleShareClick}
                      onToggleVisibility={handleToggleVisibility}
                      permission="view" />
                  ))}
                </div>
Unchanged lines                  <ProjectCard 
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
