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
  ChevronRight as ChevronRightIcon
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
  const { projects } = useStore();
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
    { name: "Dashboard", path: "/", icon: Home },
    { name: "Projects", path: "/projects", icon: FolderKanban, expandable: true },
    { name: "Performance", path: "/performance", icon: LineChart },
    { name: "Risk Management", path: "/risks", icon: ShieldAlert },
    { name: "Settings", path: "/settings", icon: Settings },
  ];

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-gray-800 text-gray-100 transition-all duration-300 ease-in-out",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      <div className="flex items-center justify-center h-16 border-b border-gray-700">
        <span className={cn("font-bold text-xl", isCollapsed && "hidden")}>Fortress</span>
        <LineChart className={cn("h-6 w-6", !isCollapsed && "hidden")} />
      </div>

      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {mainNavItems.map((item) => (
          <div key={item.name}>
            {item.expandable ? (
              <div>
                <button
                  onClick={() => toggleSection('projects')}
                  className={cn(
                    "flex items-center w-full px-4 py-2.5 rounded-md text-sm font-medium transition-colors",
                    isProjectsActive
                      ? "bg-gray-700 text-white"
                      : "text-gray-300 hover:bg-gray-700 hover:text-white",
                    isCollapsed ? "justify-center" : ""
                  )}
                >
                  <item.icon className={cn("h-5 w-5", !isCollapsed && "mr-3")} />
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
                  <div className="mt-1 ml-6 space-y-1">
                    <NavLink
                      to="/projects"
                      className={({ isActive }) =>
                        cn(
                          "flex items-center px-4 py-2 rounded-md text-sm transition-colors",
                          isActive && location.pathname === "/projects"
                            ? "bg-gray-700 text-white"
                            : "text-gray-300 hover:bg-gray-700 hover:text-white"
                        )
                      }
                    >
                      All Projects
                    </NavLink>

                    {projects.slice(0, 5).map(project => (
                      <NavLink
                        key={project.id}
                        to={`/projects/${project.id}`}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center px-4 py-2 rounded-md text-sm transition-colors",
                            isActive
                              ? "bg-gray-700 text-white"
                              : "text-gray-300 hover:bg-gray-700 hover:text-white"
                          )
                        }
                      >
                        {project.name.length > 20
                          ? `${project.name.substring(0, 20)}...`
                          : project.name}
                      </NavLink>
                    ))}

                    {projects.length > 5 && (
                      <NavLink
                        to="/projects"
                        className="flex items-center px-4 py-2 rounded-md text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                      >
                        View all ({projects.length})
                      </NavLink>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    "flex items-center px-4 py-2.5 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-gray-700 text-white"
                      : "text-gray-300 hover:bg-gray-700 hover:text-white",
                    isCollapsed ? "justify-center" : ""
                  )
                }
              >
                <item.icon className={cn("h-5 w-5", !isCollapsed && "mr-3")} />
                <span className={cn(isCollapsed && "hidden")}>{item.name}</span>
              </NavLink>
            )}
          </div>
        ))}
      </nav>

      <div className="mt-auto p-4 border-t border-gray-700">
        <Button
          variant="ghost"
          className="w-full justify-center text-gray-300 hover:bg-gray-700 hover:text-white"
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
