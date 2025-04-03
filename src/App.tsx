import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "@/components/common/ErrorBoundary";

// Layouts
import PortfolioLayout from "@/layouts/PortfolioLayout";
import ProductLayout from "@/layouts/ProductLayout";

// Portfolio Pages
import PortfolioDashboard from "@/pages/portfolio";
import ProjectsList from "./pages/projects/ProjectsList";
import NewProject from "./pages/projects/NewProject";
import Settings from "./pages/Settings";

// Product Pages
import ProductSummary from "@/pages/product/summary";
import ProductAssumptions from "@/pages/product/assumptions";
import ProductInputs from "@/pages/product/inputs";
import ProductForecast from "@/pages/product/forecast";
import ProductActuals from "@/pages/product/actuals";
import ProductAnalysis from "@/pages/product/analysis";
import ProjectDetail from "./pages/projects/ProjectDetail";
import EditProject from "./pages/projects/EditProject";
import NewFinancialModel from "./pages/models/NewFinancialModel";
import FinancialModelDetail from "./pages/models/FinancialModelDetail";
import EditFinancialModel from "./pages/models/EditFinancialModel";

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
            {/* Portfolio Layout Routes */}
            <Route path="/*" element={<PortfolioLayout />}>
              <Route index element={<PortfolioDashboard />} />
              <Route path="projects" element={<ProjectsList />} />
              <Route path="projects/new" element={<NewProject />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            {/* Product Layout Routes */}
            <Route path="/products/:id/*" element={<ProductLayout />}>
              <Route path="summary" element={<ProductSummary />} />
              <Route path="assumptions" element={<ProductAssumptions />} />
              <Route path="inputs" element={<ProductInputs />} />
              <Route path="forecast" element={<ProductForecast />} />
              <Route path="actuals" element={<ProductActuals />} />
              <Route path="analysis" element={<ProductAnalysis />} />
              <Route path="risks" element={<FinancialModelDetail />} />
              <Route path="edit" element={<EditProject />} />
              <Route path="models/new" element={<NewFinancialModel />} />
              <Route path="models/:modelId" element={<FinancialModelDetail />} />
              <Route path="models/:modelId/edit" element={<EditFinancialModel />} />
            </Route>

            {/* Fallback Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ErrorBoundary>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
