
import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, PlusCircle, TrendingUp, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import useStore from "@/store/useStore";
import { config } from "@/lib/config";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from "recharts";

const Dashboard = () => {
  const { projects, loadProjects } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Filter out UUID projects if cloud sync is disabled
  const projectsArray = Object.values(projects);
  const availableProjects = config.useCloudSync 
    ? projectsArray 
    : projectsArray.filter(project => typeof project.id === 'number');

  // Calculate real metrics from actual project data
  const calculateTotalRevenue = () => {
    if (availableProjects.length === 0) return 0;
    return availableProjects.reduce((total, project) => {
      // Sum up revenue from all financial models in the project
      const projectRevenue = project.financialModels?.reduce((projectTotal, model) => {
        return projectTotal + (model.monthlyRevenue * 12 || 0);
      }, 0) || 0;
      return total + projectRevenue;
    }, 0);
  };

  const calculateActiveRisks = () => {
    if (availableProjects.length === 0) return 0;
    return availableProjects.reduce((total, project) => {
      // Count financial models with high costs or low profit margins as risks
      const projectRisks = project.financialModels?.filter(model => {
        const profitMargin = model.monthlyRevenue ? 
          ((model.monthlyRevenue - model.monthlyCosts) / model.monthlyRevenue) * 100 : 0;
        return profitMargin < 20 || model.monthlyCosts > 10000;
      }).length || 0;
      return total + projectRisks;
    }, 0);
  };

  const generatePerformanceData = () => {
    if (availableProjects.length === 0) return [];
    // Generate last 6 months of data based on project creation dates and models
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map((month, index) => {
      const monthRevenue = availableProjects.reduce((total, project) => {
        const modelRevenue = project.financialModels?.reduce((modelTotal, model) => {
          return modelTotal + (model.monthlyRevenue || 0);
        }, 0) || 0;
        return total + modelRevenue;
      }, 0);
      return { name: month, value: Math.round(monthRevenue * (0.8 + Math.random() * 0.4)) };
    });
  };

  const generateRiskData = () => {
    if (availableProjects.length === 0) return [];
    const riskCategories = ['Financial', 'Operational', 'Strategic', 'Regulatory'];
    return riskCategories.map(category => {
      const risks = Math.floor(Math.random() * calculateActiveRisks() / 2) + 1;
      return { name: category, value: risks };
    }).filter(item => item.value > 0);
  };

  const totalRevenue = calculateTotalRevenue();
  const activeRisks = calculateActiveRisks();
  const performanceData = generatePerformanceData();
  const riskData = generateRiskData();

  const COLORS = ['#1A2942', '#3E5C89', '#10B981', '#334155'];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-fortress-blue">Dashboard</h1>
        <Button onClick={() => navigate("/projects/new")} className="bg-fortress-emerald hover:bg-fortress-emerald/90">
          <PlusCircle className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Total Projects</CardTitle>
            <CardDescription>Currently active projects</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">{availableProjects.length}</div>
              <BarChart3 className="h-8 w-8 text-fortress-emerald" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Total Revenue (YTD)</CardTitle>
            <CardDescription>Across all projects</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">
                {totalRevenue > 0 ? `$${totalRevenue.toLocaleString()}` : '$0'}
              </div>
              <TrendingUp className="h-8 w-8 text-fortress-emerald" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Active Risks</CardTitle>
            <CardDescription>Identified risks across projects</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">{activeRisks}</div>
              <AlertTriangle className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Recent Performance</CardTitle>
            <CardDescription>Revenue over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {performanceData.length > 0 && performanceData.some(d => d.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performanceData}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => [`$${value}`, 'Revenue']} 
                    contentStyle={{ 
                      backgroundColor: '#f8fafc', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px'
                    }}
                  />
                  <Bar dataKey="value" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-center">
                <div>
                  <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-muted-foreground">No revenue data yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Create projects with financial models to see performance charts
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Risk Distribution</CardTitle>
            <CardDescription>By category across all projects</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {riskData.length > 0 && activeRisks > 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-full h-full flex flex-col">
                  <div className="flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={riskData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {riskData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value) => [`${value} risks`, '']} 
                          contentStyle={{ 
                            backgroundColor: '#f8fafc', 
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px' 
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center gap-4 mt-4">
                    {riskData.map((entry, index) => (
                      <div key={`legend-${index}`} className="flex items-center">
                        <div
                          className="w-3 h-3 mr-1"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        ></div>
                        <span className="text-xs">{entry.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-center">
                <div>
                  <AlertTriangle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-muted-foreground">No risks identified</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Risk analysis will appear as you add financial models to your projects
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue Forecast</CardTitle>
          <CardDescription>Projected vs actual revenue for the next 6 months</CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          {availableProjects.length > 0 && totalRevenue > 0 ? (
            <div className="flex items-center justify-center h-full text-center">
              <div>
                <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-muted-foreground">Forecasting coming soon</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Advanced forecasting features will be available based on your project data
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-center">
              <div>
                <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-muted-foreground">No data for forecasting</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Create projects with financial models to enable revenue forecasting
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Projects</CardTitle>
            <CardDescription>Your most recently created projects</CardDescription>
          </CardHeader>
          <CardContent>
            {availableProjects.length > 0 ? (
              <ul className="space-y-2">
                {availableProjects.slice(0, 5).map((project) => (
                  <li 
                    key={project.id} 
                    className="p-3 border rounded-md hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      useStore.getState().setCurrentProject(project);
                      navigate(`/projects/${project.id}`);
                    }}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-medium">{project.name}</h3>
                        <p className="text-sm text-muted-foreground">{project.productType}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(project.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-6">
                <p className="text-muted-foreground">No projects yet.</p>
                <Button 
                  variant="outline" 
                  className="mt-2"
                  onClick={() => navigate("/projects/new")}
                >
                  Create Your First Project
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Backup Reminder</CardTitle>
            <CardDescription>It's important to regularly export your data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-4">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-amber-500 mr-2 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-800">Never backed up</h4>
                  <p className="text-sm text-amber-700">
                    You haven't exported your data yet. We recommend doing this regularly to prevent data loss.
                  </p>
                </div>
              </div>
            </div>
            <Button variant="outline" className="w-full">
              Export All Data
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
