import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import { Toaster } from "@/components/ui/toaster";
import { db, addDemoData } from "@/lib/db";
import useStore from "@/store/useStore";
import logger from "@/utils/logger";

const AppLayout = () => {
  const [initializing, setInitializing] = useState(true);
  const loadProjects = useStore((state) => state.loadProjects);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Initialize the database and load projects
  useEffect(() => {
    const init = async () => {
      try {
        await addDemoData(); // Add demo data if the database is empty
        await loadProjects();
      } catch (error) {
        logger.error("Error initializing app:", error);
      } finally {
        setInitializing(false);
      }
    };

    init();
  }, [loadProjects]);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-16 w-16 border-4 border-fortress-emerald border-t-fortress-blue rounded-full animate-spin"></div>
          <p className="text-lg font-medium text-fortress-blue">
            Initializing Fortress Financial Modeler...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      <Sidebar 
        isCollapsed={isSidebarCollapsed} 
        toggleSidebar={toggleSidebar}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main 
          className={`flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 dark:bg-gray-900 p-6 transition-all duration-300 ease-in-out 
                     ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}
        >
          <Outlet />
        </main>
      </div>
      <Toaster />
    </div>
  );
};

export default AppLayout;
