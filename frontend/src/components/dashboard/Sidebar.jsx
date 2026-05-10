import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  Box, Activity, Terminal, Globe, Settings, Search, ArrowLeft,
  Menu, X, BookOpen, LifeBuoy, MessageSquare, ExternalLink
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

// 🚨 NEW: Static resource links to fill out the UI
const resourceItems = [
  { name: "Documentation", icon: BookOpen, path: "#", external: true },
  { name: "Support", icon: LifeBuoy, path: "#", external: false },
  { name: "Community", icon: MessageSquare, path: "#", external: true },
];

export function Sidebar() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false); 
  
  const isProjectView = location.pathname.startsWith('/project/');
  const projectId = isProjectView ? location.pathname.split('/')[2] : null;

  const [projectName, setProjectName] = useState("");

  useEffect(() => {
    if (isProjectView && projectId) {
      axiosInstance.get(API_PATHS.PROJECTS.GET_ONE(projectId))
        .then(res => {
          if (res.data.success) setProjectName(res.data.data.name);
        })
        .catch(console.error);
    }
  }, [isProjectView, projectId]);

  const projectNavItems = projectId ? [
    { name: "Overview", icon: Activity, path: `/project/${projectId}` },
    { name: "Deployments", icon: Box, path: `/project/${projectId}/deployments` },
    { name: "Logs", icon: Terminal, path: `/project/${projectId}/logs` },
    { name: "Settings", icon: Settings, path: `/project/${projectId}/settings` },
  ] : [];

  const currentNavItems = isProjectView ? projectNavItems : globalNavItems;

  return (
    <>
      <button 
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="md:hidden fixed top-2.5 left-4 z-[60] p-1.5 rounded-md bg-background border border-foreground/10 text-foreground shadow-sm"
      >
        {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {isMobileOpen && (
        <div 
          className="md:hidden fixed inset-0 z-[50] bg-background/80 backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside className={`fixed md:sticky top-0 left-0 z-[55] w-64 h-[100dvh] flex flex-col border-r border-foreground/10 bg-background md:bg-background/50 backdrop-blur-xl shrink-0 transition-transform duration-300 ease-in-out ${isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        
        <div className="h-14 md:h-16 px-6 flex items-center border-b border-foreground/10 shrink-0 mt-10 md:mt-0">
          {isProjectView ? (
            <Link to="/dashboard" onClick={() => setIsMobileOpen(false)} className="flex items-center gap-3 group text-muted-foreground hover:text-foreground transition-colors w-full">
              <div className="w-8 h-8 rounded border border-foreground/10 bg-foreground/5 flex items-center justify-center group-hover:bg-foreground/10 transition-colors shrink-0">
                <ArrowLeft className="w-4 h-4" />
              </div>
              <div className="flex flex-col truncate">
                <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground/70">Back to</span>
                <span className="font-semibold text-sm text-foreground truncate">{projectName || "Loading..."}</span>
              </div>
            </Link>
          ) : (
            <Link to="/dashboard" onClick={() => setIsMobileOpen(false)} className="flex items-center gap-2 group">
              <div className="w-8 h-8 bg-foreground rounded flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                <span className="text-background font-bold font-mono">S</span>
              </div>
              <span className="font-semibold text-lg tracking-tight">Shipnode</span>
            </Link>
          )}
        </div>

        <div className="p-4 shrink-0">
          <div className="relative flex items-center">
            <Search className="absolute left-3 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder={isProjectView ? "Search project..." : "Find..."} 
              className="w-full bg-foreground/5 border border-foreground/10 rounded-md pl-9 pr-8 py-1.5 text-sm outline-none focus:border-foreground/30 transition-colors"
            />
          </div>
        </div>

        {/* 🚨 UPDATED NAVIGATION AREA: Added spacing and category headers */}
        <nav className="flex-1 px-2 py-2 space-y-8 overflow-y-auto">
          
          {/* Main Menu Section */}
          <div>
            <div className="px-3 mb-2 text-[11px] font-mono font-semibold text-muted-foreground/50 uppercase tracking-wider">
              {isProjectView ? "Project Scope" : "Overview"}
            </div>
            <div className="space-y-0.5">
              {currentNavItems.map((item) => {
                const isActive = (item.name === "Projects" || item.name === "Overview")
                  ? location.pathname === item.path 
                  : location.pathname.startsWith(item.path);

                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setIsMobileOpen(false)} 
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive 
                        ? "bg-foreground/10 text-foreground font-medium" 
                        : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
                    }`}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Resources Section */}
          <div>
            <div className="px-3 mb-2 text-[11px] font-mono font-semibold text-muted-foreground/50 uppercase tracking-wider">
              Resources
            </div>
            <div className="space-y-0.5">
              {resourceItems.map((item) => (
                <a
                  key={item.name}
                  href={item.path}
                  onClick={() => !item.external && setIsMobileOpen(false)}
                  target={item.external ? "_blank" : undefined}
                  rel={item.external ? "noopener noreferrer" : undefined}
                  className="flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors text-muted-foreground hover:bg-foreground/5 hover:text-foreground group"
                >
                  <div className="flex items-center gap-3 truncate">
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.name}</span>
                  </div>
                  {item.external && (
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  )}
                </a>
              ))}
            </div>
          </div>

        </nav>

        {/* BOTTOM USER AREA */}
        <div className="p-4 border-t border-foreground/10 flex items-center justify-between gap-1 shrink-0 bg-foreground/[0.01]">
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
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm truncate group-hover:text-red-500 transition-colors">
                  {user?.name || user?.username || "Guest User"}
                </span>
                {/* 🚨 Added a little plan badge to make it look robust */}
                <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-foreground/10 text-muted-foreground">
                  HOBBY
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground truncate mt-0.5">
                {user?.email || "No email"}
              </span>
            </div>
          </button>

          <Link 
            to="/dashboard/settings/general"
            onClick={() => setIsMobileOpen(false)}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded-lg transition-colors shrink-0"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </Link>
        </div>
      </aside>
    </>
  );
}