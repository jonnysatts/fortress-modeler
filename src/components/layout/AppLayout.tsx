import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import { Toaster } from "@/components/ui/toaster";
import { addDemoData } from "@/lib/db";
import { config } from "@/lib/config";
import { useSupabaseAuth as useAuth } from "@/hooks/useSupabaseAuth";

const AppLayout = () => {
  const [initializing, setInitializing] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { user } = useAuth();

  // Initialize the database
  useEffect(() => {
    const init = async () => {
      try {
        // Only initialize IndexedDB in local mode
        const isCloudMode = import.meta.env.VITE_USE_SUPABASE_BACKEND === 'true';
        
        if (!isCloudMode) {
          console.log('💾 Initializing IndexedDB for local mode');
          // Add demo data if the database is empty (local-only mode)
          await addDemoData();
        } else {
          console.log('🌤️ Cloud mode enabled, skipping IndexedDB initialization');
        }
        // No need to load projects here - components will load their own data via React Query
      } catch (error) {
        console.error("Error initializing app:", error);
      } finally {
        setInitializing(false);
      }
    };

    init();
    // This effect should run when the user's auth state changes,
    // as that determines which projects to load.
  }, [user]);

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
