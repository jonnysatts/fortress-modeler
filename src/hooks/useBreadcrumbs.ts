import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  BreadcrumbItem, 
  createHomeBreadcrumb, 
  createProjectsBreadcrumb, 
  createProjectBreadcrumb, 
  createModelBreadcrumb,
  createTabBreadcrumb 
} from '@/components/navigation/Breadcrumb';

interface UseBreadcrumbsOptions {
  projectId?: string;
  projectName?: string;
  modelId?: string;
  modelName?: string;
  activeTab?: string;
}

export const useBreadcrumbs = (options: UseBreadcrumbsOptions = {}) => {
  const location = useLocation();
  const { projectId, projectName, modelId, modelName, activeTab } = options;

  const breadcrumbs = useMemo((): BreadcrumbItem[] => {
    const path = location.pathname;
    const breadcrumbItems: BreadcrumbItem[] = [];

    // Always start with home
    breadcrumbItems.push(createHomeBreadcrumb());

    // Handle different route patterns
    if (path.startsWith('/projects')) {
      // Projects root page
      if (path === '/projects') {
        breadcrumbItems.push({ ...createProjectsBreadcrumb(), isActive: true });
      }
      // New project page
      else if (path === '/projects/new') {
        breadcrumbItems.push(createProjectsBreadcrumb());
        breadcrumbItems.push(createTabBreadcrumb('New Project'));
      }
      // Project detail pages
      else if (projectId && projectName) {
        breadcrumbItems.push(createProjectsBreadcrumb());
        
        // Project edit page
        if (path === `/projects/${projectId}/edit`) {
          breadcrumbItems.push(createProjectBreadcrumb(projectId, projectName));
          breadcrumbItems.push(createTabBreadcrumb('Edit Project'));
        }
        // New model page
        else if (path === `/projects/${projectId}/models/new`) {
          breadcrumbItems.push(createProjectBreadcrumb(projectId, projectName));
          breadcrumbItems.push(createTabBreadcrumb('New Scenario'));
        }
        // Model detail pages
        else if (modelId && modelName) {
          breadcrumbItems.push(createProjectBreadcrumb(projectId, projectName));
          
          // Model edit page
          if (path === `/projects/${projectId}/models/${modelId}/edit`) {
            breadcrumbItems.push(createModelBreadcrumb(projectId, modelId, modelName));
            breadcrumbItems.push(createTabBreadcrumb('Edit Scenario'));
          }
          // Model detail page
          else {
            breadcrumbItems.push({ ...createModelBreadcrumb(projectId, modelId, modelName), isActive: true });
            
            // Add tab if specified
            if (activeTab) {
              breadcrumbItems.push(createTabBreadcrumb(getTabDisplayName(activeTab)));
            }
          }
        }
        // Project detail page
        else {
          breadcrumbItems.push({ ...createProjectBreadcrumb(projectId, projectName), isActive: true });
          
          // Add tab if specified
          if (activeTab) {
            breadcrumbItems.push(createTabBreadcrumb(getTabDisplayName(activeTab)));
          }
        }
      }
    }
    // Settings page
    else if (path === '/settings') {
      breadcrumbItems.push(createTabBreadcrumb('Settings'));
    }

    return breadcrumbItems;
  }, [location.pathname, projectId, projectName, modelId, modelName, activeTab]);

  return breadcrumbs;
};

// Helper function to convert tab values to display names
const getTabDisplayName = (tabValue: string): string => {
  const tabNames: Record<string, string> = {
    'overview': 'Overview',
    'models': 'Scenarios',
    'performance': 'Track Performance',
    'analysis': 'Insights',
    'risks': 'Risk Assessment',
    'setup': 'Setup',
    'projections': 'Projections',
    'track-actuals': 'Track Actuals',
  };

  return tabNames[tabValue] || tabValue;
};