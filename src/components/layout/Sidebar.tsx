import React, { useState } from 'react';
import { NavLink } from "react-router-dom";
import { Home, FolderKanban, LineChart, ShieldAlert, Settings, ChevronsLeft, ChevronsRight, Cloud, CloudOff, User, LogOut, RefreshCw, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { config } from "@/lib/config";
import { useAuth } from "@/hooks/useAuth";
import useStore from "@/store/useStore";

// Define props interface
interface SidebarProps {
  isCollapsed: boolean;
  toggleSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, toggleSidebar }) => {
  const { user, logout, isAuthenticated } = useAuth();
  const { syncWithCloud } = useStore();
  const [isSyncing, setIsSyncing] = useState(false);

  const navItems = [
    // The Dashboard route is the index route at "/" so the sidebar link should
    // navigate to the root path
    { name: "Dashboard", path: "/", icon: Home },
    { name: "Projects", path: "/projects", icon: FolderKanban },
    // Add other top-level sections if needed
    // { name: "Performance", path: "/performance", icon: LineChart },
    // { name: "Risk Management", path: "/risk", icon: ShieldAlert },
    { name: "Settings", path: "/settings", icon: Settings },
  ];

  const handleSync = async () => {
    if (isSyncing) return;
    
    try {
      setIsSyncing(true);
      await syncWithCloud();
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    // Adjust width based on collapsed state
    <aside 
      className={cn(
          "flex flex-col h-screen bg-gray-800 text-gray-100 transition-all duration-300 ease-in-out",
          isCollapsed ? "w-20" : "w-64"
      )}
    >
      <div className="flex items-center justify-center h-16 border-b border-gray-700">
        <span className={cn("font-bold text-xl", isCollapsed && "hidden")}>Fortress</span>
        {/* Optional: Show small logo when collapsed */}
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
      {/* Cloud Sync & User Section */}
      <div className="mt-auto border-t border-gray-700">
        {config.useCloudSync && (
          <div className="p-4 space-y-2">
            {/* Sync Status */}
            <div className={cn("flex items-center", isCollapsed ? "justify-center" : "justify-between")}>
              {!isCollapsed && (
                <div className="flex items-center space-x-2">
                  {(() => {
                    const isOfflineMode = localStorage.getItem('fortress_offline_mode') === 'true';
                    if (isOfflineMode) {
                      return (
                        <>
                          <Database className="h-4 w-4 text-yellow-400" />
                          <span className="text-xs text-gray-400">Offline Mode</span>
                        </>
                      );
                    } else if (isAuthenticated) {
                      return (
                        <>
                          <Cloud className="h-4 w-4 text-green-400" />
                          <span className="text-xs text-gray-400">Cloud Connected</span>
                        </>
                      );
                    } else {
                      return (
                        <>
                          <CloudOff className="h-4 w-4 text-red-400" />
                          <span className="text-xs text-gray-400">Offline Mode</span>
                        </>
                      );
                    }
                  })()}
                </div>
              )}
              
              {(() => {
                const isOfflineMode = localStorage.getItem('fortress_offline_mode') === 'true';
                if (isOfflineMode) {
                  return (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        localStorage.removeItem('fortress_offline_mode');
                        window.location.href = '/login?force=true';
                      }}
                      className="text-gray-300 hover:bg-gray-700 hover:text-white p-1"
                    >
                      <Cloud className="h-4 w-4" />
                      {!isCollapsed && <span className="ml-1 text-xs">Enable Cloud</span>}
                    </Button>
                  );
                } else if (isAuthenticated) {
                  return (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSync}
                      disabled={isSyncing}
                      className="text-gray-300 hover:bg-gray-700 hover:text-white p-1"
                    >
                      <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
                      {!isCollapsed && <span className="ml-1 text-xs">Sync</span>}
                    </Button>
                  );
                }
                return null;
              })()}
            </div>

            {/* User Info */}
            {isAuthenticated && user && !isCollapsed && (
              <div className="text-xs text-gray-400 truncate">
                <div className="flex items-center space-x-2">
                  <User className="h-3 w-3" />
                  <span className="truncate">{user.email}</span>
                </div>
              </div>
            )}

            {/* Logout Button */}
            {isAuthenticated && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className={cn(
                  "text-gray-300 hover:bg-gray-700 hover:text-white",
                  isCollapsed ? "w-full justify-center p-1" : "w-full justify-start"
                )}
              >
                <LogOut className="h-4 w-4" />
                {!isCollapsed && <span className="ml-2 text-xs">Logout</span>}
              </Button>
            )}
          </div>
        )}

        {/* Collapse Toggle Button */}
        <div className="p-4">
          <Button 
             variant="ghost" 
             className="w-full justify-center text-gray-300 hover:bg-gray-700 hover:text-white"
             onClick={toggleSidebar}
          >
             {isCollapsed ? <ChevronsRight size={20} /> : <ChevronsLeft size={20} />}
             <span className="sr-only">{isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}</span>
          </Button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
