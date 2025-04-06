import React, { useState, useEffect } from "react";
import { Outlet, NavLink, useParams, useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import useStore from "@/store/useStore";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import { TypographyH3 } from "@/components/ui/typography";
import Breadcrumbs from "@/components/common/Breadcrumbs";
import Sidebar from "@/components/layout/Sidebar";
import AppHeader from "@/components/layout/AppHeader";
import ResponsiveContainer from "@/components/layout/ResponsiveContainer";
import { Toaster } from "@/components/ui/toaster";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const ProductLayout: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentProject, loadProjectById, setCurrentProject, loadProjects } = useStore();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Load projects and current project
  useEffect(() => {
    loadProjects();

    const projectIdNum = projectId ? parseInt(projectId) : NaN;
    if (!isNaN(projectIdNum)) {
      loadProjectById(projectIdNum).then(project => {
        if (project) {
          setCurrentProject(project);
        } else {
          navigate("/");
        }
      });
    } else {
      navigate("/");
    }
  }, [projectId, loadProjectById, setCurrentProject, navigate, loadProjects]);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const steps = [
    { path: "summary", label: "Product Summary" },
    { path: "forecast-builder", label: "Forecast Builder" },
    { path: "actuals-tracker", label: "Actuals Tracker" },
    { path: "performance-analysis", label: "Performance Analysis" },
    { path: "risks-scenarios", label: "Risks & Scenarios" }
  ];

  const projectIdNum = projectId ? parseInt(projectId) : NaN;

  const currentPath = location.pathname.split('/').pop() || 'summary';

  const breadcrumbItems = [
    { label: "Portfolio Overview", href: "/" },
    { label: "Projects", href: "/projects" },
    {
      label: currentProject?.name || `Project ${projectId}`,
      href: `/projects/${projectId}/summary`
    },
    {
      label: steps.find(step => step.path === currentPath)?.label || "Details"
    }
  ];

  return (
    <div className="flex h-screen overflow-hidden">
      <Toaster />
      <Sidebar isCollapsed={isSidebarCollapsed} toggleSidebar={toggleSidebar} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 dark:bg-gray-900 transition-all duration-300 ease-in-out">
          <ResponsiveContainer className="py-6">
            <ErrorBoundary>
              <header className="bg-white dark:bg-gray-800 border-b mb-6 rounded-lg shadow-sm">
                <div className="px-4 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Breadcrumbs items={breadcrumbItems} className="mb-2" />
                      <div className="flex items-center gap-3">
                        {currentProject && (
                          <Avatar className="h-10 w-10 border">
                             <AvatarImage src={currentProject.avatarImage} alt={`${currentProject.name} avatar`} />
                             <AvatarFallback>
                               {currentProject.name.substring(0, 2).toUpperCase()}
                             </AvatarFallback>
                           </Avatar>
                        )}
                        <TypographyH3 className="text-fortress-blue">
                          {currentProject?.name || "Product Details"}
                        </TypographyH3>
                      </div>
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

              <div className="flex flex-col md:flex-row gap-6">
                <aside className="w-full md:w-60 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                  <nav>
                    <ul className="space-y-2">
                      {steps.map(step => (
                        <li key={step.path}>
                          <NavLink
                            to={`/projects/${projectId}/${step.path}`}
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

                <main className="flex-1 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm min-w-0">
                  <Outlet />
                </main>
              </div>
            </ErrorBoundary>
          </ResponsiveContainer>
        </main>
      </div>
    </div>
  );
};

export default ProductLayout;
