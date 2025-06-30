import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense } from "react";
import AppLayout from "./components/layout/AppLayout";
import AppLoader from "./components/AppLoader";
import { useAppLoader } from "./hooks/useAppLoader";
import { AuthProvider } from "./hooks/useAuth";
import ProtectedRoute from "./components/ProtectedRoute";

// Lazy load components for code splitting
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ProjectsList = lazy(() => import("./pages/projects/ProjectsList"));
const NewProject = lazy(() => import("./pages/projects/NewProject"));
const ProjectDetail = lazy(() => import("./pages/projects/ProjectDetail"));
const EditProject = lazy(() => import("./pages/projects/EditProject"));
const NewFinancialModel = lazy(() => import("./pages/models/NewFinancialModel"));
const FinancialModelDetail = lazy(() => import("./pages/models/FinancialModelDetail"));
const EditFinancialModel = lazy(() => import("./pages/models/EditFinancialModel"));
const Settings = lazy(() => import("./pages/Settings"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Loading component for Suspense
const PageLoader = () => (
  <div className="min-h-[400px] p-6 space-y-6">
    <div className="animate-pulse space-y-4">
      <div className="h-8 bg-muted rounded w-64" />
      <div className="h-4 bg-muted rounded w-96" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="animate-pulse bg-muted rounded h-32" />
      ))}
    </div>
    <div className="animate-pulse bg-muted rounded h-64" />
  </div>
);


const App = () => {
  const { isLoading, currentMessage, progress } = useAppLoader();

  if (isLoading) {
    return <AppLoader message={currentMessage} progress={progress} />;
  }

  return (
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* All routes are public in local-only mode */}
              <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route index element={<Dashboard />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="projects" element={<ProjectsList />} />
                <Route path="projects/new" element={<NewProject />} />
                <Route path="projects/:projectId" element={<ProjectDetail />} />
                <Route path="projects/:projectId/edit" element={<EditProject />} />
                <Route path="projects/:projectId/models/new" element={<NewFinancialModel />} />
                <Route path="projects/:projectId/models/:modelId" element={<FinancialModelDetail />} />
                <Route path="projects/:projectId/models/:modelId/edit" element={<EditFinancialModel />} />
                <Route path="modeling" element={<Dashboard />} />
                <Route path="performance" element={<Dashboard />} />
                <Route path="risks" element={<Dashboard />} />
                <Route path="settings" element={<Settings />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  );
};

export default App;
