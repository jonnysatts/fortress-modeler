import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, PlusCircle, TrendingUp, AlertTriangle, FolderIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import useStore from "@/store/useStore";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from "recharts";
import ChartContainer from "@/components/common/ChartContainer";
import ContentCard from "@/components/common/ContentCard";
import { format } from "date-fns";

const Dashboard = () => {
  const { projects, loadProjects } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Example data for charts
  const dummyPerformanceData = [
    { name: 'Jan', value: 12400 },
    { name: 'Feb', value: 14800 },
    { name: 'Mar', value: 13200 },
    { name: 'Apr', value: 15900 },
    { name: 'May', value: 16200 },
    { name: 'Jun', value: 17000 },
  ];

  const dummyRiskData = [
    { name: 'Financial', value: 4 },
    { name: 'Operational', value: 2 },
    { name: 'Strategic', value: 3 },
    { name: 'Regulatory', value: 1 },
  ];

  const dummyForecastData = [
    { name: 'Jul', actual: 17500, forecast: 17500 },
    { name: 'Aug', actual: null, forecast: 18200 },
    { name: 'Sep', actual: null, forecast: 19100 },
    { name: 'Oct', actual: null, forecast: 20500 },
    { name: 'Nov', actual: null, forecast: 22000 },
    { name: 'Dec', actual: null, forecast: 24000 },
  ];

  const COLORS = ['#1A2942', '#3E5C89', '#10B981', '#334155'];

  return (
    <div className="space-y-6">

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ContentCard
          title="Total Projects"
          description="Currently active projects"
        >
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold">{projects.length}</div>
            <BarChart3 className="h-8 w-8 text-fortress-emerald" />
          </div>
        </ContentCard>

        <ContentCard
          title="Total Revenue (YTD)"
          description="Across all projects"
        >
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold">$103,489</div>
            <TrendingUp className="h-8 w-8 text-fortress-emerald" />
          </div>
        </ContentCard>

        <ContentCard
          title="Active Risks"
          description="Identified risks across projects"
        >
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold">10</div>
            <AlertTriangle className="h-8 w-8 text-amber-500" />
          </div>
        </ContentCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartContainer
          title="Recent Performance"
          description="Revenue over the last 6 months"
          height={320}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dummyPerformanceData}>
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
        </ChartContainer>

        <ChartContainer
          title="Risk Distribution"
          description="By category across all projects"
          height={320}
        >
            <div className="flex items-center justify-center h-full">
              <div className="w-full h-full flex flex-col">
                <div className="flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dummyRiskData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {dummyRiskData.map((entry, index) => (
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
                  {dummyRiskData.map((entry, index) => (
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
        </ChartContainer>
      </div>

      <ChartContainer
        title="Revenue Forecast"
        description="Projected vs actual revenue for the next 6 months"
        height={320}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={dummyForecastData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip
              formatter={(value) => [`$${value}`, value === null ? 'Forecast' : 'Actual']}
              contentStyle={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '6px'
              }}
            />
            <Line type="monotone" dataKey="actual" stroke="#1A2942" strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="forecast" stroke="#10B981" strokeWidth={2} strokeDasharray="5 5" />
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ContentCard
          title="Recent Projects"
          description="Your most recently created projects"
        >
          {projects.length > 0 ? (
            <ul className="space-y-2">
              {projects.slice(0, 5).map((project) => (
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
        </ContentCard>

        <ContentCard
          title="Data Backup Reminder"
          description="It's important to regularly export your data"
        >
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
        </ContentCard>
      </div>
    </div>
  );
};

export default Dashboard;
