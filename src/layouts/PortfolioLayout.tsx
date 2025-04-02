import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "@/components/layout/Sidebar";
import AppHeader from "@/components/layout/AppHeader";
import ResponsiveContainer from "@/components/layout/ResponsiveContainer";
import { Toaster } from "@/components/ui/toaster";
import { db } from "@/lib/db";
import useStore from "@/store/useStore";
import ErrorBoundary from "@/components/common/ErrorBoundary";

const PortfolioLayout: React.FC = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { loadProjects } = useStore();

  // Load projects on initial render
  useEffect(() => {
    const initializeData = async () => {
      try {
        // Check if DB is initialized
        const isInitialized = await db.projects.count() > 0;
        
        // Load projects into store
        loadProjects();
        
        console.log("Projects loaded into store");
      } catch (error) {
        console.error("Error initializing data:", error);
      }
    };

    initializeData();
  }, [loadProjects]);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Toaster />
      <Sidebar isCollapsed={isSidebarCollapsed} toggleSidebar={toggleSidebar} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main 
          className={`flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 dark:bg-gray-900 transition-all duration-300 ease-in-out 
                     ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}
        >
          <ResponsiveContainer className="py-6">
            <ErrorBoundary>
              <AppHeader />
              <Outlet />
            </ErrorBoundary>
          </ResponsiveContainer>
        </main>
      </div>
    </div>
  );
};

export default PortfolioLayout;
