import React from 'react';
import { NavLink } from "react-router-dom";
import { Home, FolderKanban, LineChart, Settings, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Define props interface
interface SidebarProps {
  isCollapsed: boolean;
  toggleSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, toggleSidebar }) => {
  const navItems = [
    { name: "Dashboard", path: "/", icon: Home },
    { name: "Projects", path: "/projects", icon: FolderKanban },
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
      
      <nav className="flex-1 px-2 py-4 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
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
        ))}
      </nav>

      {/* Collapse Toggle Button */}
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