import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
  isActive?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, className }) => {
  const navigate = useNavigate();

  const handleClick = (item: BreadcrumbItem) => {
    if (item.href && !item.isActive) {
      navigate(item.href);
    }
  };

  return (
    <nav className={cn("flex items-center space-x-1 text-sm", className)} aria-label="Breadcrumb">
      <ol className="flex items-center space-x-1">
        {items.map((item, index) => (
          <li key={index} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />
            )}
            
            {item.isActive ? (
              <span className="flex items-center px-2 py-1 text-foreground font-medium">
                {item.icon && <item.icon className="h-4 w-4 mr-1" />}
                {item.label}
              </span>
            ) : (
              <button
                onClick={() => handleClick(item)}
                className={cn(
                  "flex items-center px-2 py-1 rounded-md transition-colors",
                  "text-muted-foreground hover:text-foreground hover:bg-muted",
                  item.href ? "cursor-pointer" : "cursor-default"
                )}
                disabled={!item.href}
              >
                {item.icon && <item.icon className="h-4 w-4 mr-1" />}
                {item.label}
              </button>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

// Preset breadcrumb configurations
export const createHomeBreadcrumb = (): BreadcrumbItem => ({
  label: "Dashboard",
  href: "/",
  icon: Home,
});

export const createProjectsBreadcrumb = (): BreadcrumbItem => ({
  label: "Projects",
  href: "/projects",
});

export const createProjectBreadcrumb = (projectId: string, projectName: string): BreadcrumbItem => ({
  label: projectName,
  href: `/projects/${projectId}`,
});

export const createModelBreadcrumb = (
  projectId: string,
  modelId: string,
  modelName: string
): BreadcrumbItem => ({
  label: modelName,
  href: `/projects/${projectId}/models/${modelId}`,
});

export const createTabBreadcrumb = (tabName: string): BreadcrumbItem => ({
  label: tabName,
  isActive: true,
});