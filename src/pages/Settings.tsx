
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Trash2, FileText, FileSpreadsheet, Presentation } from "lucide-react";
import { toast } from "sonner";
import { getProjects, db } from "@/lib/db";
import { exportToExcel, exportToPDF } from "@/lib/export";
import { exportEnhancedExcel } from "@/lib/enhanced-excel-export";
import { exportBoardReadyPDF, prepareBoardReadyData } from "@/lib/board-ready-export";
import { exportSimpleExcel, exportSimplePDF } from "@/lib/simple-export";
import { performFinancialAnalysis, generateCashFlowProjections } from "@/lib/financial-calculations";
import { useMyProjects } from "@/hooks/useProjects";
import { useModelsForProject } from "@/hooks/useModels";
import { SupabaseStorageService } from "@/services/implementations/SupabaseStorageService";
import { devLog } from "@/lib/devLog";

const Settings = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [backupReminders, setBackupReminders] = useState(true);
  const [backupFrequency, setBackupFrequency] = useState("weekly");
  const [isExporting, setIsExporting] = useState(false);

  const { data: projects = [], isLoading } = useMyProjects();
  
  // Helper function to get models for a project using cloud/local switching
  const getModelsForProject = async (projectId: string | number) => {
    const isCloudEnabled = () => import.meta.env.VITE_USE_SUPABASE_BACKEND === 'true';
    
    if (isCloudEnabled()) {
      console.log('🌤️ Getting models from Supabase for export');
      const supabaseStorage = new SupabaseStorageService();
      return await supabaseStorage.getModelsForProject(String(projectId));
    } else {
      console.log('💾 Getting models from IndexedDB for export');
      return await db.financialModels
        .where('projectId')
        .equals(projectId)
        .toArray();
    }
  };

  // Debug: log projects on component mount
  useEffect(() => {
    devLog('Settings component - Current projects:', projects);
  }, [projects]);

  const projectsArray = projects;

  // Test export function that works without projects
  const handleTestExport = async () => {
    try {
      setIsExporting(true);
      
      // Create a test project for export
      const testProject = {
        id: 1,
        name: "Test Export Project",
        description: "This is a test export to verify functionality",
        productType: "Test Product",
        createdAt: new Date(),
        updatedAt: new Date(),
        targetAudience: "Test users"
      };

      const testModels = [{
        id: 1,
        projectId: 1,
        name: "Test Financial Model",
        assumptions: {
          revenue: [
            { name: "Primary Revenue Stream", value: 10000, type: "recurring", frequency: "monthly" },
            { name: "Secondary Revenue", value: 5000, type: "variable", frequency: "monthly" }
          ],
          costs: [
            { name: "Operating Costs", value: 3000, type: "fixed", category: "operations" },
            { name: "Marketing Spend", value: 2000, type: "variable", category: "marketing" }
          ],
          growthModel: { type: "linear", rate: 0.05 }
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }];
      
      await exportSimpleExcel({
        project: testProject,
        models: testModels
      });
      
      toast.success("Test export completed", {
        description: "Test Excel file has been downloaded to verify export functionality.",
      });
      
    } catch (error) {
      console.error('Test export error:', error);
      toast.error("Test export failed", {
        description: `Error: ${error.message}`,
      });
    } finally {
      setIsExporting(false);
    }
  };
  
  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      
      if (projectsArray.length === 0) {
        toast.error("No data to export", {
          description: "Create some projects and financial models first.",
        });
        return;
      }
      
      const firstProject = projectsArray[0];
      devLog('Exporting project:', firstProject);
      
      const models = await getModelsForProject(firstProject.id!);

      devLog('Found models:', models);
      
      // Use simple, reliable Excel export first
      await exportSimpleExcel({
        project: firstProject,
        models
      });
      
      toast.success("Excel export completed", {
        description: "Your project data has been exported to Excel successfully.",
      });
      
    } catch (error) {
      console.error('Export error:', error);
      toast.error("Export failed", {
        description: `Error: ${error.message}. Please try again or check the console for details.`,
      });
    } finally {
      setIsExporting(false);
    }
  };
  
  const handleExportPDF = async () => {
    try {
      setIsExporting(true);
      
      if (projectsArray.length === 0) {
        toast.error("No data to export", {
          description: "Create some projects and financial models first.",
        });
        return;
      }
      
      const firstProject = projectsArray[0];
      const models = await getModelsForProject(firstProject.id!);
      
      // Use simple, reliable PDF export
      await exportSimplePDF({
        project: firstProject,
        models
      });
      
      toast.success("PDF export completed", {
        description: "Your project report has been exported to PDF successfully.",
      });
      
    } catch (error) {
      console.error('Export error:', error);
      toast.error("Export failed", {
        description: `Error: ${error.message}. Please try again or check the console for details.`,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportBoardReadyPDF = async () => {
    try {
      setIsExporting(true);
      
      if (projectsArray.length === 0) {
        toast.error("No data to export", {
          description: "Create some projects and financial models first.",
        });
        return;
      }
      
      const firstProject = projectsArray[0];
      const models = await getModelsForProject(firstProject.id!);
      
      if (models.length === 0) {
        toast.error("No financial models found", {
          description: "Create at least one financial model to generate a board-ready report.",
        });
        return;
      }
      
      try {
        // Try the enhanced board-ready export
        const reportData = await prepareBoardReadyData(firstProject, models, 36, 0.1);
        await exportBoardReadyPDF(reportData);
        
        toast.success("Executive report generated", {
          description: "Your board-ready executive financial report has been exported successfully.",
        });
      } catch (boardError) {
        console.warn('Board-ready export failed, falling back to enhanced PDF:', boardError);
        
        // Fallback to enhanced Excel export if board-ready fails
        await exportEnhancedExcel({
          project: firstProject,
          models,
          includeScenarios: true,
          includeSensitivity: true,
          periods: 36,
          discountRate: 0.1
        });
        
        toast.success("Enhanced Excel report generated", {
          description: "Board-ready PDF had issues, but your comprehensive Excel analysis has been exported.",
        });
      }
      
    } catch (error) {
      console.error('Board-ready export error:', error);
      toast.error("Export failed", {
        description: `Error: ${error.message}. Please try basic exports instead.`,
      });
    } finally {
      setIsExporting(false);
    }
  };
  
  const handleClearAllData = async () => {
    try {
      const isCloudEnabled = () => import.meta.env.VITE_USE_SUPABASE_BACKEND === 'true';
      
      if (isCloudEnabled()) {
        toast.error("Clear not available", {
          description: "Data clearing is not available in cloud mode. Use the Supabase dashboard to manage your data.",
        });
        return;
      }
      
      // Clear all tables (local mode only)
      await db.transaction('rw', [db.projects, db.financialModels, db.actualPerformance, db.risks, db.scenarios], async () => {
        await db.projects.clear();
        await db.financialModels.clear();
        await db.actualPerformance.clear();
        await db.risks.clear();
        await db.scenarios.clear();
      });
      
      // Refresh the store
      window.location.reload();
      
      toast.success("Data cleared", {
        description: "All application data has been cleared successfully.",
      });
    } catch (error) {
      console.error('Clear data error:', error);
      toast.error("Clear failed", {
        description: "There was an error clearing your data. Please try again.",
      });
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-fortress-blue">Settings</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>
              Customize the appearance of the application
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="dark-mode" className="text-base">Dark Mode</Label>
              <Switch
                id="dark-mode"
                checked={darkMode}
                onCheckedChange={setDarkMode}
              />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>
              Manage backup reminder notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="backup-reminders" className="text-base">Backup Reminders</Label>
              <Switch
                id="backup-reminders"
                checked={backupReminders}
                onCheckedChange={setBackupReminders}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="reminder-frequency">Reminder Frequency</Label>
              <Select
                value={backupFrequency}
                onValueChange={setBackupFrequency}
                disabled={!backupReminders}
              >
                <SelectTrigger id="reminder-frequency" className="w-full">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
        
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Data Management</CardTitle>
            <CardDescription>
              Export or clear your application data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  All data is stored locally in your browser. Export your financial models and analysis in multiple formats:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                  <li>• <strong>Test Export:</strong> Download sample Excel file to verify export functionality works</li>
                  <li>• <strong>Excel:</strong> Comprehensive project and financial model data export</li>
                  <li>• <strong>Basic PDF:</strong> Professional project report with revenue and cost breakdowns</li>
                  <li>• <strong>Executive Report:</strong> Advanced analysis with scenarios and metrics (Excel fallback if needed)</li>
                </ul>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <Button 
                  onClick={handleTestExport}
                  disabled={isExporting}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Download className="mr-2 h-4 w-4" />
                  {isExporting ? "Testing..." : "Test Export"}
                </Button>
                
                <Button 
                  onClick={handleExportExcel} 
                  disabled={isExporting || projectsArray.length === 0}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  {isExporting ? "Exporting..." : "Export Excel"}
                </Button>
                
                <Button 
                  onClick={handleExportPDF}
                  disabled={isExporting || projectsArray.length === 0}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  {isExporting ? "Exporting..." : "Basic PDF"}
                </Button>
                
                <Button 
                  onClick={handleExportBoardReadyPDF} 
                  disabled={isExporting || projectsArray.length === 0}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Presentation className="mr-2 h-4 w-4" />
                  {isExporting ? "Generating..." : "Executive Report"}
                </Button>
                
                <Button variant="destructive" onClick={handleClearAllData}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clear All Data
                </Button>
              </div>
              
              <div className="space-y-3">
                {projectsArray.length === 0 && (
                  <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <strong>Note:</strong> Create some projects and financial models first to enable full export functionality. 
                    Use "Test Export" to verify downloads work on your system.
                  </p>
                )}
                
                <p className="text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <strong>Debug Info:</strong> Projects found: {projectsArray.length}. 
                  Check browser console (F12) for detailed logging.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>About</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <h3 className="font-semibold">Fortress Financial Modeler</h3>
          <p className="text-sm text-muted-foreground">Version 1.0.0</p>
          <p className="text-sm text-muted-foreground">
            A local-first, web-based application for building and analyzing product financial models.
            All data is stored securely in your browser using IndexedDB.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
