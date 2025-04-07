import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import React, { Suspense, lazy } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import LoadingSpinner from "@/components/common/LoadingSpinner";

// --- Direct import for testing ---
import PerfAnalysisView from "@/pages/product/PerfAnalysisView.tsx";
// --- End Direct import ---

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
// Comment out lazy import
// const PerformanceAnalysisPage = lazy(() => import("@/pages/product/PerformanceAnalysis.tsx"));
const RisksScenarios = lazy(() => import("@/pages/models/FinancialModelDetail.tsx"));
const MarketingAnalysis = lazy(() => import("@/pages/product/MarketingAnalysis.tsx"));

// Removed imports for ProductAssumptions, ProductInputs, ProductForecast

// Existing related pages (keeping for now)
const ProjectDetail = lazy(() => import("@/pages/projects/ProjectDetail.tsx"));
const EditProject = lazy(() => import("@/pages/projects/EditProject.tsx"));
const NewFinancialModel = lazy(() => import("@/pages/models/NewFinancialModel.tsx"));
const FinancialModelDetail = lazy(() => import("@/pages/models/FinancialModelDetail.tsx"));
const EditFinancialModel = lazy(() => import("@/pages/models/EditFinancialModel.tsx"));

const NotFound = lazy(() => import("@/pages/NotFound.tsx"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <ErrorBoundary>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              {/* Portfolio Layout Routes */}
              <Route path="/*" element={<PortfolioLayout />}>
                <Route index element={<PortfolioDashboard />} />
                <Route path="projects" element={<ProjectsList />} />
                <Route path="projects/new" element={<NewProject />} />
                <Route path="settings" element={<Settings />} />
              </Route>

              {/* Product/Project Layout Routes (Standardizing on /projects/) */}
              <Route path="/projects/:projectId/*" element={<ProductLayout />}>
                <Route index element={<ProductSummary />} />
                <Route path="summary" element={<ProductSummary />} />
                <Route path="forecast-builder" element={<ForecastBuilder />} />
                <Route path="actuals-tracker" element={<ActualsTracker />} />
                <Route path="performance-analysis" element={<PerfAnalysisView />} />
                <Route path="marketing-analysis" element={<MarketingAnalysis />} />
                <Route path="risks-scenarios" element={<RisksScenarios />} />
                <Route path="edit-project" element={<EditProject />} />
                <Route path="models/new" element={<NewFinancialModel />} />
                <Route path="models/:modelId" element={<FinancialModelDetail />} />
                <Route path="models/:modelId/edit" element={<EditFinancialModel />} />
              </Route>

              {/* Fallback Route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
