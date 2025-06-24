
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Trash2, FileText, FileSpreadsheet } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { getProjects, db } from "@/lib/db";
import { exportToExcel, exportToPDF } from "@/lib/export";
import { performFinancialAnalysis, generateCashFlowProjections } from "@/lib/financial-calculations";
import useStore from "@/store/useStore";

const Settings = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [backupReminders, setBackupReminders] = useState(true);
  const [backupFrequency, setBackupFrequency] = useState("weekly");
  const [isExporting, setIsExporting] = useState(false);
  
  const { projects } = useStore();
  
  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      
      if (projects.length === 0) {
        toast({
          title: "No data to export",
          description: "Create some projects and financial models first.",
          variant: "destructive",
        });
        return;
      }
      
      // Get all financial models for all projects
      const allModels = [];
      const allCashFlows = [];
      
      for (const project of projects) {
        const models = await db.financialModels
          .where('projectId')
          .equals(project.id!)
          .toArray();
        
        allModels.push(...models);
        
        // Generate financial analysis for each model
        for (const model of models) {
          const cashFlows = generateCashFlowProjections(model, 36, false);
          allCashFlows.push(...cashFlows.map(cf => ({
            ...cf,
            projectName: project.name,
            modelName: model.name,
          })));
        }
      }
      
      // Calculate metrics for the first project as example
      const firstProject = projects[0];
      const firstModel = allModels.find(m => m.projectId === firstProject.id);
      let metrics = undefined;
      
      if (firstModel) {
        metrics = performFinancialAnalysis(firstModel, 36, 0.1, false);
      }
      
      await exportToExcel({
        project: firstProject,
        models: allModels,
        cashFlows: allCashFlows.slice(0, 36), // Limit to first 36 periods
        metrics,
      });
      
      toast({
        title: "Excel export completed",
        description: "Your financial analysis has been exported to Excel.",
      });
      
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export failed",
        description: "There was an error exporting your data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };
  
  const handleExportPDF = async () => {
    try {
      setIsExporting(true);
      
      if (projects.length === 0) {
        toast({
          title: "No data to export",
          description: "Create some projects and financial models first.",
          variant: "destructive",
        });
        return;
      }
      
      const firstProject = projects[0];
      const models = await db.financialModels
        .where('projectId')
        .equals(firstProject.id!)
        .toArray();
      
      let metrics = undefined;
      let cashFlows = undefined;
      
      if (models.length > 0) {
        const firstModel = models[0];
        metrics = performFinancialAnalysis(firstModel, 36, 0.1, false);
        cashFlows = generateCashFlowProjections(firstModel, 12, false); // 12 periods for PDF
      }
      
      await exportToPDF({
        project: firstProject,
        models,
        cashFlows,
        metrics,
      });
      
      toast({
        title: "PDF export completed",
        description: "Your financial analysis report has been exported to PDF.",
      });
      
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export failed",
        description: "There was an error exporting your data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };
  
  const handleClearAllData = async () => {
    try {
      // Clear all tables
      await db.transaction('rw', [db.projects, db.financialModels, db.actualPerformance, db.risks, db.scenarios], async () => {
        await db.projects.clear();
        await db.financialModels.clear();
        await db.actualPerformance.clear();
        await db.risks.clear();
        await db.scenarios.clear();
      });
      
      // Refresh the store
      window.location.reload();
      
      toast({
        title: "Data cleared",
        description: "All application data has been cleared successfully.",
      });
    } catch (error) {
      console.error('Clear data error:', error);
      toast({
        title: "Clear failed",
        description: "There was an error clearing your data. Please try again.",
        variant: "destructive",
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
              <p className="text-sm text-muted-foreground">
                All data is stored locally in your browser. Export your financial models and analysis to Excel or PDF format.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Button 
                  onClick={handleExportExcel} 
                  disabled={isExporting || projects.length === 0}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  {isExporting ? "Exporting..." : "Export Excel"}
                </Button>
                
                <Button 
                  onClick={handleExportPDF}
                  disabled={isExporting || projects.length === 0}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  {isExporting ? "Exporting..." : "Export PDF"}
                </Button>
                
                <Button variant="destructive" onClick={handleClearAllData}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clear All Data
                </Button>
              </div>
              
              {projects.length === 0 && (
                <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <strong>Note:</strong> Create some projects and financial models first to enable export functionality.
                </p>
              )}
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
