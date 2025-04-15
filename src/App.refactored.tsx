/**
 * App (Refactored)
 * 
 * This component includes the refactored scenario module in the application routes.
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import PortfolioLayout from '@/layouts/PortfolioLayout';
import ProductLayout from '@/layouts/ProductLayout';
import PortfolioPage from '@/pages/portfolio/PortfolioPage';
import ProductSummary from '@/pages/product/ProductSummary';
import FinancialModelDetail from '@/pages/models/FinancialModelDetail';
import ScenariosViewRefactored from '@/pages/product/ScenariosViewRefactored';
import RisksAndScenariosView from '@/pages/product/RisksAndScenariosView';
import PerfAnalysisView from '@/pages/product/PerfAnalysisView';
import ActualsTrackerPage from '@/pages/product/ActualsTrackerPage';
import ForecastBuilderPage from '@/pages/product/ForecastBuilderPage';
import ProjectList from '@/pages/projects/ProjectList';

function App() {
  return (
    <Router>
      <Routes>
        {/* Portfolio Routes */}
        <Route path="/" element={<PortfolioLayout />}>
          <Route index element={<PortfolioPage />} />
          <Route path="projects" element={<ProjectList />} />
        </Route>

        {/* Product Routes */}
        <Route path="/projects/:projectId" element={<ProductLayout />}>
          <Route index element={<ProductSummary />} />
          <Route path="models/:modelId" element={<FinancialModelDetail />} />
          <Route path="scenarios" element={<ScenariosViewRefactored />} />
          <Route path="scenarios/:scenarioId" element={<ScenariosViewRefactored />} />
          <Route path="risks" element={<RisksAndScenariosView />} />
          <Route path="performance" element={<PerfAnalysisView />} />
          <Route path="actuals" element={<ActualsTrackerPage />} />
          <Route path="forecast" element={<ForecastBuilderPage />} />
        </Route>

        {/* Fallback Route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      
      <Toaster />
    </Router>
  );
}

export default App;
