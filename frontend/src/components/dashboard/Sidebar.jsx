import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  Box, Activity, Terminal, BarChart2, Zap, 
  ShieldAlert, Globe, Settings, Search, ArrowLeft
} from "lucide-react";
import { useAuth } from "../../context/useAuth";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";

const globalNavItems = [
  { name: "Projects", icon: Box, path: "/dashboard" },
  { name: "Deployments", icon: Activity, path: "/dashboard/deployments" },
  { name: "Domains", icon: Globe, path: "/dashboard/domains" },
  { name: "Settings", icon: Settings, path: "/dashboard/settings" },
];

export function Sidebar() {
  const location = useLocation();
  const { user, logout } = useAuth();
  
  // 🚨 SMART LOGIC: Are we inside a project?
  const isProjectView = location.pathname.startsWith('/project/');
  const projectId = isProjectView ? location.pathname.split('/')[2] : null;

  const [projectName, setProjectName] = useState("");

  // Fetch the project name specifically for the sidebar header
  useEffect(() => {
    if (isProjectView && projectId) {
      axiosInstance.get(API_PATHS.PROJECTS.GET_ONE(projectId))
        .then(res => {
          if (res.data.success) setProjectName(res.data.data.name);
        })
        .catch(console.error);
    }
  }, [isProjectView, projectId]);

  // Dynamically generate the project nav items if we have an ID
  const projectNavItems = projectId ? [
    { name: "Overview", icon: Activity, path: `/project/${projectId}` },
    { name: "Deployments", icon: Box, path: `/project/${projectId}/deployments` },
    { name: "Logs", icon: Terminal, path: `/project/${projectId}/logs` },
    { name: "Settings", icon: Settings, path: `/project/${projectId}/settings` },
  ] : [];

  // Decide which list of items to render
  const currentNavItems = isProjectView ? projectNavItems : globalNavItems;

  return (
    <aside className="w-64 h-screen flex flex-col border-r border-foreground/10 bg-background/50 backdrop-blur-xl shrink-0 transition-all duration-300">
      
      {/* BRAND HEADER: Changes based on context */}
      <div className="h-16 px-6 flex items-center border-b border-foreground/10">
        {isProjectView ? (
          <Link to="/dashboard" className="flex items-center gap-3 group text-muted-foreground hover:text-foreground transition-colors w-full">
            <div className="w-8 h-8 rounded border border-foreground/10 bg-foreground/5 flex items-center justify-center group-hover:bg-foreground/10 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </div>
            <div className="flex flex-col truncate">
              <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground/70">Back to</span>
              <span className="font-semibold text-sm text-foreground truncate">{projectName || "Loading..."}</span>
            </div>
          </Link>
        ) : (
          <Link to="/dashboard" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-foreground rounded flex items-center justify-center group-hover:scale-105 transition-transform">
              <span className="text-background font-bold font-mono">S</span>
            </div>
            <span className="font-semibold text-lg tracking-tight">Shipnode</span>
          </Link>
        )}
      </div>

      <div className="p-4">
        <div className="relative flex items-center">
          <Search className="absolute left-3 w-4 h-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder={isProjectView ? "Search project..." : "Find..."} 
            className="w-full bg-foreground/5 border border-foreground/10 rounded-md pl-9 pr-8 py-1.5 text-sm outline-none focus:border-foreground/30 transition-colors"
          />
        </div>
      </div>

      {/* NAVIGATION LINKS: Dynamically mapped */}
      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto">
        {currentNavItems.map((item) => {
          // Exact match for the base routes, startsWith for sub-routes
          const isActive = (item.name === "Projects" || item.name === "Overview")
            ? location.pathname === item.path 
            : location.pathname.startsWith(item.path);

          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive 
                  ? "bg-foreground/10 text-foreground font-medium" 
                  : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* BOTTOM USER AREA (Stays exactly the same) */}
      <div className="p-4 border-t border-foreground/10 flex items-center justify-between gap-1">
        
        {/* User Info & Logout Button */}
        <button 
          onClick={logout} 
          className="flex items-center gap-3 flex-1 hover:bg-foreground/5 p-2 rounded-lg transition-colors overflow-hidden group"
          title="Click to logout"
        >
          <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-foreground/10 shrink-0">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="font-mono text-xs uppercase">{user?.username?.[0] || "U"}</span>
            )}
          </div>
          <div className="flex flex-col flex-1 text-left truncate">
            {/* 🚨 Prioritize Display Name (name), fallback to username */}
            <span className="font-medium text-sm truncate group-hover:text-red-500 transition-colors">
              {user?.name || user?.username || "Guest User"}
            </span>
            <span className="text-[10px] text-muted-foreground truncate">
              {user?.email || "No email"}
            </span>
          </div>
        </button>

        {/* 🚨 Settings Gear Icon - Now independent and routable! */}
        <Link 
          to="/dashboard/settings/general"
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded-lg transition-colors shrink-0"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </Link>
      </div>
    </aside>
  );
}