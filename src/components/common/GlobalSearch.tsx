import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import useStore from '@/store/useStore';
import { Project, FinancialModel } from '@/lib/db';

const GlobalSearch: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<{
    projects: Project[];
    models: (FinancialModel & { projectName: string })[];
  }>({
    projects: [],
    models: [],
  });
  
  const navigate = useNavigate();
  const { projects } = useStore();
  
  // Handle keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(open => !open);
      }
    };
    
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);
  
  // Search functionality
  useEffect(() => {
    if (!searchTerm.trim() || !open) {
      setSearchResults({ projects: [], models: [] });
      return;
    }
    
    const term = searchTerm.toLowerCase();
    
    // Filter projects
    const filteredProjects = projects.filter(project => 
      project.name.toLowerCase().includes(term) || 
      (project.description && project.description.toLowerCase().includes(term))
    );
    
    // For models, we would need to load them all
    // This is a simplified version - in a real app, you might want to implement
    // a more efficient search mechanism
    const getModels = async () => {
      const allModels: (FinancialModel & { projectName: string })[] = [];
      
      for (const project of projects) {
        if (!project.id) continue;
        
        try {
          const models = await useStore.getState().loadModelsForProject(project.id);
          const modelsWithProject = models.map(model => ({
            ...model,
            projectName: project.name
          }));
          
          allModels.push(...modelsWithProject);
        } catch (error) {
          console.error(`Error loading models for project ${project.id}:`, error);
        }
      }
      
      const filteredModels = allModels.filter(model => 
        model.name.toLowerCase().includes(term)
      );
      
      setSearchResults(prev => ({ ...prev, models: filteredModels }));
    };
    
    setSearchResults(prev => ({ ...prev, projects: filteredProjects }));
    getModels();
  }, [searchTerm, projects, open]);
  
  const handleSelect = (type: 'project' | 'model', id: number, projectId?: number) => {
    setOpen(false);
    setSearchTerm('');
    
    if (type === 'project') {
      navigate(`/projects/${id}`);
    } else if (type === 'model' && projectId) {
      navigate(`/projects/${projectId}/models/${id}`);
    }
  };
  
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 relative w-full justify-start text-muted-foreground sm:pr-12 md:w-40 lg:w-64"
      >
        <Search className="mr-2 h-4 w-4" />
        <span className="hidden md:inline-flex">Search...</span>
        <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Search</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input 
              placeholder="Search projects, models..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
            
            {searchResults.projects.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-2">Projects</h3>
                <ul className="space-y-1">
                  {searchResults.projects.map(project => (
                    <li 
                      key={project.id}
                      className="px-2 py-1 rounded-md hover:bg-muted cursor-pointer"
                      onClick={() => handleSelect('project', project.id!)}
                    >
                      {project.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {searchResults.models.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-2">Financial Models</h3>
                <ul className="space-y-1">
                  {searchResults.models.map(model => (
                    <li 
                      key={model.id}
                      className="px-2 py-1 rounded-md hover:bg-muted cursor-pointer"
                      onClick={() => handleSelect('model', model.id!, model.projectId)}
                    >
                      {model.name} <span className="text-xs text-muted-foreground">({model.projectName})</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {searchTerm && searchResults.projects.length === 0 && searchResults.models.length === 0 && (
              <p className="text-center text-muted-foreground py-4">No results found</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default GlobalSearch;
