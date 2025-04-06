import React, { useState, useEffect } from "react";
import { Outlet, NavLink, useParams, useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft, Pencil, Download, FileJson, FileSpreadsheet, FileText, MenuSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import useStore from "@/store/useStore";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import { TypographyH3 } from "@/components/ui/typography";
import Breadcrumbs from "@/components/common/Breadcrumbs";
import Sidebar from "@/components/layout/Sidebar";
import ResponsiveContainer from "@/components/layout/ResponsiveContainer";
import { Toaster } from "@/components/ui/toaster";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const ProductLayout: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentProject, loadProjectById, setCurrentProject, loadProjects } = useStore();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Get export actions and state from store
  const { 
      triggerExport, 
      triggerFullExport, 
      exportFunctions 
  } = useStore(
    (state) => ({ 
      triggerExport: state.triggerExport, 
      triggerFullExport: state.triggerFullExport, 
      exportFunctions: state.exportFunctions 
    })
  );

  // Get available report keys from the store state
  const availableReportKeys = Object.keys(exportFunctions);

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
    { path: "summary", label: "Forecast Summary" },
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
              <header className="bg-white dark:bg-gray-800 border-b mb-4 rounded-lg shadow-sm">
                <div className="px-4 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {currentProject && (
                        <Avatar className="h-10 w-10 border">
                           <AvatarImage src={currentProject.avatarImage} alt={`${currentProject.name} avatar`} />
                           <AvatarFallback>
                             {currentProject.name.substring(0, 2).toUpperCase()}
                           </AvatarFallback>
                         </Avatar>
                      )}
                      <div>
                        <Breadcrumbs items={breadcrumbItems} className="mb-1 text-xs" />
                        <TypographyH3 className="text-fortress-blue">
                          {currentProject?.name || "Product Details"}
                        </TypographyH3>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => navigate(`/projects/${projectId}/forecast-builder`)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit Inputs
                      </Button>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                             <Download className="mr-2 h-4 w-4" />
                             Export Report
                           </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56"> 
                           <DropdownMenuSub>
                              <DropdownMenuSubTrigger>
                                <MenuSquare className="mr-2 h-4 w-4" />
                                <span>Full Product Report</span>
                              </DropdownMenuSubTrigger>
                              <DropdownMenuPortal>
                                <DropdownMenuSubContent>
                                   {/* Call triggerFullExport from store */}
                                  <DropdownMenuItem onClick={() => triggerFullExport('pdf')}>PDF</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => triggerFullExport('xlsx')}>Excel (XLSX)</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => triggerFullExport('json')}>JSON</DropdownMenuItem>
                                </DropdownMenuSubContent>
                              </DropdownMenuPortal>
                           </DropdownMenuSub>

                           {availableReportKeys.length > 0 && <DropdownMenuSeparator />} 

                           {/* Dynamically add sections based on registered functions */}
                           {availableReportKeys.map(reportKey => (
                              <DropdownMenuSub key={reportKey}>
                                <DropdownMenuSubTrigger>
                                  <MenuSquare className="mr-2 h-4 w-4" />
                                  {/* Improve naming if needed, e.g., format key */}
                                  <span>Export {reportKey}</span> 
                                </DropdownMenuSubTrigger>
                                <DropdownMenuPortal>
                                  <DropdownMenuSubContent>
                                     {/* Call triggerExport from store with key */}
                                    <DropdownMenuItem onClick={() => triggerExport(reportKey, 'pdf')}>PDF</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => triggerExport(reportKey, 'xlsx')}>Excel (XLSX)</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => triggerExport(reportKey, 'json')}>JSON</DropdownMenuItem>
                                  </DropdownMenuSubContent>
                                </DropdownMenuPortal>
                            </DropdownMenuSub>
                           ))}
                         </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              </header>

              <nav className="mb-6">
                <div className="flex space-x-1 border-b">
                    {steps.map(step => (
                       <NavLink
                         key={step.path}
                         to={`/projects/${projectId}/${step.path}`}
                         className={({ isActive }) =>
                           cn(
                             "px-4 py-2 text-sm font-medium transition-colors border-b-2",
                             isActive
                               ? "border-fortress-blue text-fortress-blue"
                               : "border-transparent text-muted-foreground hover:text-gray-700 hover:border-gray-300 dark:hover:text-gray-200 dark:hover:border-gray-600"
                           )
                         }
                       >
                         {step.label}
                       </NavLink>
                     ))}
                </div>
              </nav>

              <main className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm min-w-0">
                 <Outlet />
              </main>
            </ErrorBoundary>
          </ResponsiveContainer>
        </main>
      </div>
    </div>
  );
};

export default ProductLayout;
