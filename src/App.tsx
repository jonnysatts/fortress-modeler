import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense } from "react";
import AppLayout from "./components/layout/AppLayout";
import AppLoader from "./components/AppLoader";
import { useAppLoader } from "./hooks/useAppLoader";
import ProtectedRoute from "./components/ProtectedRoute";
import { PerformanceMonitorWidget } from "./components/PerformanceMonitor";
import ErrorBoundary from "./components/ErrorBoundary";

// Lazy load components for code splitting
const Dashboard = lazy(() => import("./pages/SafeDashboard"));
const ProjectsList = lazy(() => import("./pages/projects/ProjectsList"));
const NewProject = lazy(() => import("./pages/projects/NewProject"));
const ProjectDetail = lazy(() => import("./pages/projects/ProjectDetail"));
const EditProject = lazy(() => import("./pages/projects/EditProject"));
const NewFinancialModel = lazy(() => import("./pages/models/NewFinancialModel"));
const FinancialModelDetail = lazy(() => import("./pages/models/FinancialModelDetail"));
const EditFinancialModel = lazy(() => import("./pages/models/EditFinancialModel"));
const Settings = lazy(() => import("./pages/Settings"));
const Migration = lazy(() => import("./pages/Migration"));
const AuthCallback = lazy(() => import("./pages/auth/AuthCallback"));
const Login = lazy(() => import("./pages/Login").then(module => ({ default: module.Login })));
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
        <Toaster />
        <Sonner />
        <ErrorBoundary context="App">
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
              {/* Auth routes - must be outside protected routes */}
              <Route path="login" element={<Login />} />
              <Route path="auth/callback" element={<AuthCallback />} />
              
              {/* Protected routes */}
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
                <Route path="migration" element={<Migration />} />
              </Route>
              <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </ErrorBoundary>
        <PerformanceMonitorWidget />
    </TooltipProvider>
  );
};

export default App;
