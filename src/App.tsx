import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import React, { Suspense, lazy, useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import GlobalErrorBoundary from "@/components/common/GlobalErrorBoundary";
import PageLoader from "@/components/common/PageLoader";
import NavigationOverlay from "@/components/common/NavigationOverlay";
import useStore from "@/store/useStore";
import { db } from "@/lib/db";
import { devLog, appError } from "@/lib/logUtils";

// Direct import for performance analysis view
import PerfAnalysisView from "@/pages/product/PerfAnalysisView.tsx";

// Import performance monitoring page
const PerformanceMonitoring = lazy(() => import("@/pages/admin/PerformanceMonitoring.tsx"));

// Layouts
const PortfolioLayout = lazy(() => import("@/layouts/PortfolioLayout.tsx"));
const ProductLayout = lazy(() => import("@/layouts/ProductLayout.tsx"));

// Portfolio Pages
const PortfolioDashboard = lazy(() => import("@/pages/portfolio/index.tsx"));
const ProjectsList = lazy(() => import("@/pages/projects/ProjectsList.tsx"));
const NewProject = lazy(() => import("@/pages/projects/NewProject.tsx"));
const Settings = lazy(() => import("@/pages/Settings.tsx"));

// Product Pages
const ProductSummary = lazy(() => import("@/pages/product/summary.tsx"));
const ForecastBuilder = lazy(() => import("@/pages/product/ForecastBuilder.tsx"));
const ActualsTracker = lazy(() => import("@/pages/product/ActualsTracker.tsx"));
const RisksAndScenariosView = lazy(() => import("@/pages/product/RisksAndScenariosView.tsx"));
const MarketingAnalysis = lazy(() => import("@/pages/product/MarketingAnalysis.tsx"));

// Existing related pages (keeping for now)
const ProjectDetail = lazy(() => import("@/pages/projects/ProjectDetail.tsx"));
const EditProject = lazy(() => import("@/pages/projects/EditProject.tsx"));
const NewFinancialModel = lazy(() => import("@/pages/models/NewFinancialModel.tsx"));
const FinancialModelDetail = lazy(() => import("@/pages/models/FinancialModelDetail.tsx"));
const EditFinancialModel = lazy(() => import("@/pages/models/EditFinancialModel.tsx"));

const NotFound = lazy(() => import("@/pages/NotFound.tsx"));

// Create a performance-optimized query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000, // 10 minutes - increased to reduce unnecessary refetches
      gcTime: 30 * 60 * 1000, // 30 minutes - increased to keep data in cache longer
      refetchOnWindowFocus: import.meta.env.PROD ? false : false, // Disable in production and development
      retry: 1,
      refetchOnMount: 'always', // Always refetch on mount to ensure data freshness
      // Add structural sharing to optimize render performance
      structuralSharing: true,
    },
  },
});

// Store initializer component
const StoreInitializer = () => {
  const {
    loadProjects,
    loadProjectById,
    setCurrentProject
  } = useStore(state => ({
    loadProjects: state.loadProjects,
    loadProjectById: state.loadProjectById,
    setCurrentProject: state.setCurrentProject
  }));

  // Get persisted state from localStorage
  const getPersistedState = () => {
    try {
      const persistedString = localStorage.getItem('fortress-store');
      if (persistedString) {
        return JSON.parse(persistedString);
      }
    } catch (error) {
      console.error('Error reading persisted state:', error);
    }
    return null;
  };

  // Initialize store data
  useEffect(() => {
    const initializeStore = async () => {
      devLog('Initializing store...');

      // Load all projects from the database
      await loadProjects();

      // Get persisted state to restore specific projects
      const persistedState = getPersistedState();
      devLog('Persisted state:', persistedState);

      if (persistedState?.state?.currentProjectId) {
        try {
          // Restore the current project
          const currentProjectId = persistedState.state.currentProjectId;
          devLog(`Restoring current project ID: ${currentProjectId}`);

          const project = await loadProjectById(currentProjectId);
          if (project) {
            devLog(`Restored current project: ${project.name}`);
            setCurrentProject(project);
          } else {
            devLog(`Current project ID ${currentProjectId} not found in database`);
          }
        } catch (error) {
          appError('Failed to restore current project', error);
        }
      } else {
        // If no current project is persisted, try to set the first available project
        try {
          const projects = await db.projects.toArray();
          if (projects.length > 0) {
            const firstProject = projects[0];
            devLog(`Setting first available project as current: ${firstProject.name}`);
            setCurrentProject(firstProject);
          }
        } catch (error) {
          appError('Failed to set first project as current', error);
        }
      }
    };

    initializeStore();
  }, [loadProjects, loadProjectById, setCurrentProject]);

  return null;
};

const App = () => (
  <GlobalErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <NavigationOverlay />
          <ErrorBoundary>
            <StoreInitializer />
            <Suspense fallback={<PageLoader message="Loading application..." />}>
              <Routes>
                <Route path="/*" element={<PortfolioLayout />}>
                  <Route index element={<PortfolioDashboard />} />
                  <Route path="projects" element={<ProjectsList />} />
                  <Route path="projects/new" element={<NewProject />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="performance" element={<PerformanceMonitoring />} />
                </Route>
                <Route path="/projects/:projectId/*" element={<ProductLayout />}>
                  <Route index element={<Navigate to="summary" replace />} />
                  <Route path="summary" element={<ProductSummary />} />
                  <Route path="forecast-builder" element={<ForecastBuilder />} />
                  <Route path="actuals-tracker" element={<ActualsTracker />} />
                  <Route path="performance-analysis" element={<PerfAnalysisView />} />
                  <Route path="marketing-analysis" element={<MarketingAnalysis />} />
                  <Route path="risks-scenarios" element={<RisksAndScenariosView />} />
                  <Route path="edit-project" element={<EditProject />} />
                  <Route path="models/new" element={<NewFinancialModel />} />
                  <Route path="models/:modelId" element={<FinancialModelDetail />} />
                  <Route path="models/:modelId/edit" element={<EditFinancialModel />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </GlobalErrorBoundary>
);

export default App;
