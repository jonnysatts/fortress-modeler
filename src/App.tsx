import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import React, { Suspense, lazy } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import LoadingSpinner from "@/components/common/LoadingSpinner";

// Layouts
const PortfolioLayout = lazy(() => import("@/layouts/PortfolioLayout"));
const ProductLayout = lazy(() => import("@/layouts/ProductLayout"));

// Portfolio Pages
const PortfolioDashboard = lazy(() => import("@/pages/portfolio"));
const ProjectsList = lazy(() => import("@/pages/projects/ProjectsList"));
const NewProject = lazy(() => import("@/pages/projects/NewProject"));
const Settings = lazy(() => import("@/pages/Settings"));

// Product Pages
const ProductSummary = lazy(() => import("@/pages/product/summary"));
const ForecastBuilder = lazy(() => import("@/pages/product/ForecastBuilder"));
// Around line 22-24
const ActualsTracker = lazy(() => import("@/pages/product/ActualsTracker")); // Point to NEW name
const PerformanceAnalysis = lazy(() => import("@/pages/product/PerformanceAnalysis")); // Point to NEW name
const RisksScenarios = lazy(() => import("@/pages/models/FinancialModelDetail"));

// Removed imports for ProductAssumptions, ProductInputs, ProductForecast

// Existing related pages (keeping for now)
const ProjectDetail = lazy(() => import("@/pages/projects/ProjectDetail"));
const EditProject = lazy(() => import("@/pages/projects/EditProject"));
const NewFinancialModel = lazy(() => import("@/pages/models/NewFinancialModel"));
const FinancialModelDetail = lazy(() => import("@/pages/models/FinancialModelDetail"));
const EditFinancialModel = lazy(() => import("@/pages/models/EditFinancialModel"));

const NotFound = lazy(() => import("@/pages/NotFound"));

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
                <Route path="projects/:projectId" element={<ProjectDetail />} />
                <Route path="settings" element={<Settings />} />
              </Route>

              {/* Product Layout Routes (Refactored) */}
              <Route path="/products/:id/*" element={<ProductLayout />}>
                <Route index element={<ProductSummary />} />
                <Route path="summary" element={<ProductSummary />} />
                <Route path="forecast-builder" element={<ForecastBuilder />} />
                <Route path="actuals-tracker" element={<ActualsTracker />} />
                <Route path="performance-analysis" element={<PerformanceAnalysis />} />
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
