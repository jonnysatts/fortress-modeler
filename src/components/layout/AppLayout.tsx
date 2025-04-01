
import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import { Toaster } from "@/components/ui/toaster";
import { db, addDemoData } from "@/lib/db";
import useStore from "@/store/useStore";

const AppLayout = () => {
  const [initializing, setInitializing] = useState(true);
  const loadProjects = useStore((state) => state.loadProjects);

  // Initialize the database and load projects
  useEffect(() => {
    const init = async () => {
      try {
        await addDemoData(); // Add demo data if the database is empty
        await loadProjects();
      } catch (error) {
        console.error("Error initializing app:", error);
      } finally {
        setInitializing(false);
      }
    };

    init();
  }, [loadProjects]);

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
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto py-6">
          <Outlet />
        </div>
      </main>
      <Toaster />
    </div>
  );
};

export default AppLayout;
