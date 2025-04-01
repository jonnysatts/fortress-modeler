
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const Settings = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [backupReminders, setBackupReminders] = useState(true);
  const [backupFrequency, setBackupFrequency] = useState("weekly");
  
  const handleExportAllData = () => {
    toast({
      title: "Data export initiated",
      description: "Your data export is being prepared.",
    });
    // In a real app, this would trigger the IndexedDB export logic
  };
  
  const handleClearAllData = () => {
    toast({
      title: "Data cleared",
      description: "All application data has been cleared.",
    });
    // In a real app, this would clear the IndexedDB
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
            <div className="flex flex-col space-y-2">
              <p className="text-sm text-muted-foreground">
                All data is stored locally in your browser. It's recommended to export your data regularly to prevent loss.
              </p>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-2 pt-2">
                <Button onClick={handleExportAllData} className="bg-fortress-blue hover:bg-fortress-blue/90">
                  <Download className="mr-2 h-4 w-4" />
                  Export All Data
                </Button>
                <Button variant="destructive" onClick={handleClearAllData}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clear All Data
                </Button>
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
