import React from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import Breadcrumbs from '@/components/common/Breadcrumbs';
import useStore from '@/store/useStore';
import GlobalSearch from '@/components/common/GlobalSearch';
import { TypographyH3 } from '@/components/ui/typography';

// Define the type for breadcrumb items explicitly
interface BreadcrumbItem {
    label: string;
    href?: string; // Make href optional
}

const AppHeader: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { projectId, modelId } = useParams<{ projectId?: string; modelId?: string }>();
  const { currentProject, currentModel } = useStore();

  // Generate breadcrumb items based on current route (using /projects)
  const getBreadcrumbItems = (): BreadcrumbItem[] => { // Use the explicit type
    const items: BreadcrumbItem[] = [{ label: 'Portfolio Dashboard', href: '/' }];

    if (location.pathname.startsWith('/projects')) {
      items.push({ label: 'Products', href: '/projects' });

      if (projectId) {
        items.push({
          label: currentProject?.name || `Product ${projectId}`,
          href: `/projects/${projectId}/summary`
        });

        if (location.pathname.includes('/models/new')) {
          items.push({ label: 'New Forecast' }); // No href needed
        } else if (modelId) {
          items.push({
            label: currentModel?.name || 'Forecast Detail',
            href: `/projects/${projectId}/models/${modelId}`
          });
          if (location.pathname.includes('/edit')) {
            items.push({ label: 'Edit Forecast' }); // No href needed
          }
        } else if (location.pathname.includes('/edit-project')) {
          items.push({ label: 'Edit Project' }); // No href needed
        } else {
            const pathSegments = location.pathname.split('/');
            const lastSegment = pathSegments[pathSegments.length - 1];
            if (lastSegment && lastSegment !== projectId && !['summary', 'forecast-builder', 'actuals-tracker', 'performance-analysis', 'risks-scenarios'].includes(lastSegment)) {
                 // Only add if it's not one of the main views already covered
                 // and not the projectId itself
                 const viewLabel = lastSegment.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                 items.push({ label: viewLabel }); // No href needed
            }
        }
      } else if (location.pathname === '/projects/new') {
        items.push({ label: 'New Project' }); // No href needed
      }
    } else if (location.pathname === '/settings') {
      items.push({ label: 'Settings' }); // No href needed
    }

    return items.filter(item => item.label);
  };

  // Get page title based on current route (using /projects)
  const getPageTitle = () => {
    if (location.pathname === '/') return 'Portfolio Overview';
    if (location.pathname === '/projects') return 'Projects'; // Standardized
    if (location.pathname === '/projects/new') return 'New Project';

    // Extract the last part of the path for specific views
    const pathSegments = location.pathname.split('/');
    const view = pathSegments[pathSegments.length - (location.pathname.endsWith('/edit') ? 2 : 1)];
    const isEdit = location.pathname.endsWith('/edit');
    const isNewModel = location.pathname.includes('/models/new');

    if (projectId) {
        const baseName = currentProject?.name || `Project ${projectId}`;
        if (isNewModel) return `New Forecast for ${baseName}`;
        if (modelId) {
            const modelName = currentModel?.name || 'Forecast';
            return isEdit ? `Edit ${modelName}` : modelName;
        }
        if (view === 'edit-project') return `Edit ${baseName}`;
        // Derive title from view segment if available
        if (view && view !== projectId) {
            return `${baseName}: ${view.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`;
        }
        return baseName; // Default to project name (summary)
    }
    if (location.pathname === '/settings') return 'Settings';

    return 'Fortress'; // Fallback title
  };

  // Render appropriate action button based on context
  const renderActionButton = () => {
    if (location.pathname === '/projects') {
      return (
        <Button
          onClick={() => navigate('/projects/new')}
          className="bg-fortress-emerald hover:bg-fortress-emerald/90"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          New Project
        </Button>
      );
    }
    // Show "New Forecast" on project-level pages (summary, builder, etc.)
    // but not on model-specific pages or edit pages.
    if (projectId && !modelId && !location.pathname.includes('/edit') && !location.pathname.includes('models/new')) {
      return (
        <Button
          onClick={() => navigate(`/projects/${projectId}/models/new`)} // Use standardized path
          className="bg-fortress-emerald hover:bg-fortress-emerald/90"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          New Forecast
        </Button>
      );
    }
    // Removed duplicate condition
    return null;
  };

  return (
    <div className="flex flex-col space-y-4 mb-6">
      <div className="flex justify-between items-center">
        <Breadcrumbs items={getBreadcrumbItems()} className="mb-2" />
        <GlobalSearch />
      </div>

      <div className="flex justify-between items-center">
        <TypographyH3 className="text-fortress-blue">
          {getPageTitle()}
        </TypographyH3>
        {renderActionButton()}
      </div>
    </div>
  );
};

export default AppHeader;
