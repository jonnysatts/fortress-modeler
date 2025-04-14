import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from "react-router-dom";
import {
  Home,
  FolderKanban,
  LineChart,
  ShieldAlert,
  Settings,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
  Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import useStore from "@/store/useStore";

// Define props interface
interface SidebarProps {
  isCollapsed: boolean;
  toggleSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, toggleSidebar }) => {
  const location = useLocation();
  // Use the modular store with specific selectors
  const { projects, loading } = useStore(state => ({
    projects: state.projects,
    loading: state.loading
  }));
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    projects: true
  });

  const toggleSection = (section: string) => {
    if (isCollapsed) return;
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const isProjectsActive = location.pathname.startsWith('/projects');
  const currentProjectId = location.pathname.match(/\/projects\/(\d+)/)?.[1];

  // Update expanded sections based on current route
  useEffect(() => {
    if (isProjectsActive && !expandedSections.projects && !isCollapsed) {
      setExpandedSections(prev => ({ ...prev, projects: true }));
    }
  }, [location.pathname, isProjectsActive, expandedSections.projects, isCollapsed]);

  const mainNavItems = [
    { name: "Portfolio Dashboard", path: "/", icon: Home },
    { name: "Products", path: "/projects", icon: FolderKanban, expandable: true },
    { name: "Performance", path: "/performance", icon: Activity },
    { name: "Settings", path: "/settings", icon: Settings },
  ];

  return (
    <aside
      className={cn(
        "flex flex-col h-screen border-r border-gray-200 text-gray-800 transition-all duration-300 ease-in-out shadow-sm sidebar-container",
        isCollapsed ? "w-20" : "w-64"
      )}
      style={{
        backgroundColor: 'white',
        position: 'fixed',
        zIndex: 9000,
        boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)',
      }}
    >
      <div className="flex items-center justify-center h-16 border-b border-gray-200 bg-white">
        <span className={cn("font-bold text-xl text-fortress-blue", isCollapsed && "hidden")}>Fortress</span>
        <LineChart className={cn("h-6 w-6 text-fortress-blue", !isCollapsed && "hidden")} />
      </div>

      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto bg-white">
        {mainNavItems.map((item) => (
          <div key={item.name}>
            {item.expandable ? (
              <div>
                <button
                  onClick={() => toggleSection('projects')}
                  className={cn(
                    "flex items-center w-full px-4 py-2.5 rounded-md text-sm font-medium transition-colors bg-white relative",
                    isProjectsActive
                      ? "bg-fortress-blue/10 text-fortress-blue font-medium"
                      : "text-gray-600 hover:bg-gray-100 hover:text-fortress-blue",
                    isCollapsed ? "justify-center" : ""
                  )}
                  style={{ zIndex: 9005, backgroundColor: 'white', position: 'relative' }}
                >
                  <item.icon className={cn("h-5 w-5 text-gray-700", !isCollapsed && "mr-3")} />
                  {!isCollapsed && (
                    <>
                      <span className="flex-1">{item.name}</span>
                      {expandedSections.projects ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRightIcon className="h-4 w-4" />
                      )}
                    </>
                  )}
                </button>

                {!isCollapsed && expandedSections.projects && (
                  <div className="mt-1 ml-6 space-y-1 border-l border-gray-200 pl-3 rounded-r-md project-container" style={{ backgroundColor: '#f9fafb', position: 'relative', zIndex: 9010 }}>
                    {loading.isLoading ? (
                      // Loading state
                      <div className="flex items-center px-4 py-2 text-sm text-gray-500">
                        <div className="animate-pulse h-4 w-24 bg-gray-200 rounded"></div>
                      </div>
                    ) : projects.length === 0 ? (
                      // Empty state
                      <div className="flex items-center px-4 py-2 text-sm text-gray-500">
                        No products yet
                      </div>
                    ) : (
                      // Projects list
                      <>
                        {projects.slice(0, 5).map(project => (
                          <NavLink
                            key={project.id}
                            to={`/projects/${project.id}/summary`}
                            className={({ isActive }) =>
                              cn(
                                "flex items-center px-4 py-2 rounded-md text-sm transition-colors sidebar-item project-item",
                                isActive
                                  ? "bg-fortress-blue/5 text-fortress-blue font-medium nav-link-active"
                                  : "text-gray-700 hover:bg-gray-50 hover:text-fortress-blue font-medium"
                              )
                            }
                            style={{ zIndex: 9015, backgroundColor: '#f9fafb', position: 'relative' }}
                          >
                            {project.name.length > 20
                              ? `${project.name.substring(0, 20)}...`
                              : project.name}
                          </NavLink>
                        ))}

                        {projects.length > 5 && (
                          <NavLink
                            to="/projects"
                            className="flex items-center px-4 py-2 rounded-md text-sm text-gray-500 hover:bg-gray-100 hover:text-fortress-blue project-item"
                            style={{ zIndex: 9015, backgroundColor: '#f9fafb', position: 'relative' }}
                          >
                            View all ({projects.length})
                          </NavLink>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    "flex items-center px-4 py-2.5 rounded-md text-sm font-medium transition-colors sidebar-item relative bg-white",
                    isActive
                      ? "bg-fortress-blue/10 text-fortress-blue font-medium nav-link-active"
                      : "text-gray-600 hover:bg-gray-100 hover:text-fortress-blue",
                    isCollapsed ? "justify-center" : ""
                  )
                }
                style={{ zIndex: 9005, backgroundColor: 'white', position: 'relative' }}
              >
                <item.icon className={cn("h-5 w-5 text-gray-700", !isCollapsed && "mr-3")} />
                <span className={cn("font-medium", isCollapsed && "hidden")}>{item.name}</span>
              </NavLink>
            )}
          </div>
        ))}
      </nav>

      <div className="mt-auto p-4 border-t border-gray-200">
        <Button
          variant="ghost"
          className="w-full justify-center text-gray-500 hover:bg-gray-50 hover:text-fortress-blue"
          onClick={toggleSidebar}
        >
          {isCollapsed ? <ChevronsRight size={20} /> : <ChevronsLeft size={20} />}
          <span className="sr-only">{isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}</span>
        </Button>
      </div>
    </aside>
  );
};

export default Sidebar;
