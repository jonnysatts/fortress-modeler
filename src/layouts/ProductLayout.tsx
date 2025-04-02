import React, { useEffect } from "react";
import { Outlet, NavLink, useParams, useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/toaster";
import useStore from "@/store/useStore";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import { TypographyH3 } from "@/components/ui/typography";
import Breadcrumbs from "@/components/common/Breadcrumbs";

const ProductLayout: React.FC = () => {
  const { id: productId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentProject, loadProject, setCurrentProject } = useStore();
  
  useEffect(() => {
    if (productId) {
      const id = parseInt(productId);
      loadProject(id).then(project => {
        if (project) {
          setCurrentProject(project);
        } else {
          // Handle case where project doesn't exist
          navigate("/");
        }
      });
    }
  }, [productId, loadProject, setCurrentProject, navigate]);

  const steps = [
    { path: "summary", label: "Product Summary" },
    { path: "assumptions", label: "Assumptions" },
    { path: "inputs", label: "Revenue & Costs" },
    { path: "forecast", label: "Forecast" },
    { path: "actuals", label: "Actuals" },
    { path: "analysis", label: "Performance vs Forecast" },
    { path: "risks", label: "Risks & Scenarios" }
  ];

  // Get current step from URL
  const currentPath = location.pathname.split('/').pop() || 'summary';
  
  // Generate breadcrumb items
  const breadcrumbItems = [
    { label: "Portfolio Overview", href: "/" },
    { label: "Products", href: "/products" },
    { 
      label: currentProject?.name || `Product ${productId}`, 
      href: `/products/${productId}/summary` 
    },
    { 
      label: steps.find(step => step.path === currentPath)?.label || "Details"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Toaster />
      
      <header className="bg-white dark:bg-gray-800 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Breadcrumbs items={breadcrumbItems} className="mb-2" />
              <TypographyH3 className="text-fortress-blue">
                {currentProject?.name || "Product Details"}
              </TypographyH3>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate("/")}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Portfolio
            </Button>
          </div>
        </div>
      </header>
      
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row gap-6">
          <aside className="w-full md:w-60 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
            <nav>
              <ul className="space-y-2">
                {steps.map(step => (
                  <li key={step.path}>
                    <NavLink
                      to={`/products/${productId}/${step.path}`}
                      className={({ isActive }) =>
                        `block px-4 py-2 rounded-md transition-colors ${
                          isActive 
                            ? "bg-fortress-blue text-white font-medium" 
                            : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        }`
                      }
                    >
                      {step.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>
          
          <main className="flex-1 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </main>
        </div>
      </div>
    </div>
  );
};

export default ProductLayout;
