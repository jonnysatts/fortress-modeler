import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import AppLayout from "./components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import ProjectsList from "./pages/projects/ProjectsList";
import NewProject from "./pages/projects/NewProject";
import ProjectDetail from "./pages/projects/ProjectDetail";
import EditProject from "./pages/projects/EditProject";
import NewFinancialModel from "./pages/models/NewFinancialModel";
import FinancialModelDetail from "./pages/models/FinancialModelDetail";
import EditFinancialModel from "./pages/models/EditFinancialModel";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<AppLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="projects" element={<ProjectsList />} />
              <Route path="projects/new" element={<NewProject />} />
              <Route path="projects/:projectId" element={<ProjectDetail />} />
              <Route path="projects/:projectId/edit" element={<EditProject />} />
              <Route path="projects/:projectId/models/new" element={<NewFinancialModel />} />
              <Route path="projects/:projectId/models/:modelId" element={<FinancialModelDetail />} />
              <Route path="projects/:projectId/models/:modelId/edit" element={<EditFinancialModel />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="performance" element={<Dashboard />} />
              <Route path="risks" element={<Dashboard />} />
              <Route path="settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ErrorBoundary>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
