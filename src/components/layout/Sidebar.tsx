
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { BarChart3, Home, FolderOpen, LineChart, AlertTriangle, Settings } from "lucide-react";

const navItems = [
  {
    name: "Dashboard",
    path: "/",
    icon: Home,
  },
  {
    name: "Projects",
    path: "/projects",
    icon: FolderOpen,
  },
  {
    name: "Financial Modeling",
    path: "/modeling",
    icon: LineChart,
  },
  {
    name: "Performance",
    path: "/performance",
    icon: BarChart3,
  },
  {
    name: "Risk Management",
    path: "/risks",
    icon: AlertTriangle,
  },
  {
    name: "Settings",
    path: "/settings",
    icon: Settings,
  },
];

const Sidebar = () => {
  const location = useLocation();

  return (
    <aside className="bg-sidebar w-64 min-h-screen flex flex-col border-r border-sidebar-border sticky top-0">
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-fortress-emerald rounded-md flex items-center justify-center">
            <BarChart3 className="text-white h-5 w-5" />
          </div>
          <h1 className="text-sidebar-foreground font-bold text-lg">Fortress Financial</h1>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
              location.pathname === item.path
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50"
            )}
          >
            <item.icon className="h-4 w-4" />
            <span>{item.name}</span>
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t border-sidebar-border">
        <p className="text-xs text-sidebar-foreground/70">
          Fortress Financial Modeler v1.0
        </p>
        <p className="text-xs text-sidebar-foreground/70 mt-1">
          Local Data Last Backed Up: Never
        </p>
      </div>
    </aside>
  );
};

export default Sidebar;
