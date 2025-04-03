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
  const { projectId, modelId, id: productId } = useParams();
  const { currentProject, currentModel } = useStore();

  // Generate breadcrumb items based on current route
  const getBreadcrumbItems = () => {
    const items = [{ label: 'Portfolio Overview', href: '/' }];

    if (location.pathname.startsWith('/projects')) {
      items.push({ label: 'Products', href: '/projects' });

      if (projectId) {
        items.push({
          label: currentProject?.name || `Product ${projectId}`,
          href: `/products/${projectId}/summary`
        });

        if (location.pathname.includes('/models/new')) {
          items.push({ label: 'New Forecast' });
        } else if (modelId) {
          items.push({
            label: currentModel?.name || 'Product Forecast',
            href: `/products/${projectId}/models/${modelId}`
          });

          if (location.pathname.includes('/edit')) {
            items.push({ label: 'Edit' });
          }
        } else if (location.pathname.includes('/edit')) {
          items.push({ label: 'Edit Product' });
        }
      } else if (location.pathname === '/projects/new') {
        items.push({ label: 'New Product' });
      }
    } else if (location.pathname.startsWith('/products')) {
      items.push({ label: 'Products', href: '/projects' });

      if (productId) {
        items.push({
          label: currentProject?.name || `Product ${productId}`,
          href: `/products/${productId}/summary`
        });
      }
    } else if (location.pathname === '/settings') {
      items.push({ label: 'Settings' });
    } else if (location.pathname.startsWith('/performance')) {
      items.push({ label: 'Performance' });
    } else if (location.pathname.startsWith('/risks')) {
      items.push({ label: 'Risks' });
    }

    return items;
  };

  // Get page title based on current route
  const getPageTitle = () => {
    if (location.pathname === '/') return 'Portfolio Overview';
    if (location.pathname === '/projects') return 'Products';
    if (location.pathname === '/projects/new') return 'New Product';
    if (projectId && !modelId && !location.pathname.includes('/new') && !location.pathname.includes('/edit')) {
      return currentProject?.name || 'Product Details';
    }
    if (productId && location.pathname.includes('/summary')) {
      return currentProject?.name || 'Product Summary';
    }
    if (location.pathname.includes('/models/new')) return 'New Product Forecast';
    if (modelId && !location.pathname.includes('/edit')) return currentModel?.name || 'Product Forecast';
    if (modelId && location.pathname.includes('/edit')) return 'Edit Product Forecast';
    if (projectId && location.pathname.includes('/edit')) return 'Edit Product';
    if (productId && location.pathname.includes('/edit')) return 'Edit Product';
    if (location.pathname === '/settings') return 'Settings';
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
          New Product
        </Button>
      );
    }

    if (projectId && !location.pathname.includes('/new') && !location.pathname.includes('/edit')) {
      return (
        <Button
          onClick={() => navigate(`/products/${projectId}/models/new`)}
          className="bg-fortress-emerald hover:bg-fortress-emerald/90"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          New Forecast
        </Button>
      );
    }

    if (productId && !location.pathname.includes('/new') && !location.pathname.includes('/edit')) {
      return (
        <Button
          onClick={() => navigate(`/products/${productId}/models/new`)}
          className="bg-fortress-emerald hover:bg-fortress-emerald/90"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          New Forecast
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
