import React from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import Breadcrumbs from '@/components/common/Breadcrumbs';
import useStore from '@/store/useStore';
import GlobalSearch from '@/components/common/GlobalSearch';
import { TypographyH3 } from '@/components/ui/typography';

const AppHeader: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { projectId, modelId } = useParams();
  const { currentProject, currentModel } = useStore();
  
  // Generate breadcrumb items based on current route
  const getBreadcrumbItems = () => {
    const items = [{ label: 'Dashboard', href: '/' }];
    
    if (location.pathname.startsWith('/projects')) {
      items.push({ label: 'Projects', href: '/projects' });
      
      if (projectId) {
        items.push({ 
          label: currentProject?.name || `Project ${projectId}`, 
          href: `/projects/${projectId}` 
        });
        
        if (location.pathname.includes('/models/new')) {
          items.push({ label: 'New Model' });
        } else if (modelId) {
          items.push({ 
            label: currentModel?.name || 'Financial Model', 
            href: `/projects/${projectId}/models/${modelId}` 
          });
          
          if (location.pathname.includes('/edit')) {
            items.push({ label: 'Edit' });
          }
        } else if (location.pathname.includes('/edit')) {
          items.push({ label: 'Edit Project' });
        }
      } else if (location.pathname === '/projects/new') {
        items.push({ label: 'New Project' });
      }
    } else if (location.pathname === '/settings') {
      items.push({ label: 'Settings' });
    } else if (location.pathname.startsWith('/modeling')) {
      items.push({ label: 'Modeling' });
    } else if (location.pathname.startsWith('/performance')) {
      items.push({ label: 'Performance' });
    } else if (location.pathname.startsWith('/risks')) {
      items.push({ label: 'Risks' });
    }
    
    return items;
  };
  
  // Get page title based on current route
  const getPageTitle = () => {
    if (location.pathname === '/') return 'Dashboard';
    if (location.pathname === '/projects') return 'Projects';
    if (location.pathname === '/projects/new') return 'New Project';
    if (projectId && !modelId && !location.pathname.includes('/new') && !location.pathname.includes('/edit')) {
      return currentProject?.name || 'Project Details';
    }
    if (location.pathname.includes('/models/new')) return 'New Financial Model';
    if (modelId && !location.pathname.includes('/edit')) return currentModel?.name || 'Financial Model';
    if (modelId && location.pathname.includes('/edit')) return 'Edit Financial Model';
    if (projectId && location.pathname.includes('/edit')) return 'Edit Project';
    if (location.pathname === '/settings') return 'Settings';
    if (location.pathname.startsWith('/modeling')) return 'Modeling';
    if (location.pathname.startsWith('/performance')) return 'Performance';
    if (location.pathname.startsWith('/risks')) return 'Risk Management';
    
    return '';
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
    
    if (projectId && !location.pathname.includes('/new') && !location.pathname.includes('/edit')) {
      return (
        <Button 
          onClick={() => navigate(`/projects/${projectId}/models/new`)} 
          className="bg-fortress-emerald hover:bg-fortress-emerald/90"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          New Model
        </Button>
      );
    }
    
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
