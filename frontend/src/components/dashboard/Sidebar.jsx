import { Link, useLocation } from "react-router-dom";
import { 
  Box, Activity, Terminal, BarChart2, Zap, 
  ShieldAlert, Globe, Settings, Search, Bell
} from "lucide-react";
import { useAuth } from "../../context/useAuth";

const navItems = [
  { name: "Projects", icon: Box, path: "/dashboard" },
  { name: "Deployments", icon: Activity, path: "/dashboard/deployments" },
  { name: "Logs", icon: Terminal, path: "/dashboard/logs" },
  { name: "Analytics", icon: BarChart2, path: "/dashboard/analytics" },
  { name: "Speed Insights", icon: Zap, path: "/dashboard/speed" },
  { name: "Firewall", icon: ShieldAlert, path: "/dashboard/firewall" },
  { name: "Domains", icon: Globe, path: "/dashboard/domains" },
  { name: "Settings", icon: Settings, path: "/dashboard/settings" },
];

export function Sidebar() {
  const location = useLocation();
  const { user, logout } = useAuth(); // Fetching dynamic user data

  return (
    <aside className="w-64 h-screen flex flex-col border-r border-foreground/10 bg-background/50 backdrop-blur-xl shrink-0">
      {/* Brand Header */}
      <div className="h-16 px-6 flex items-center border-b border-foreground/10">
        <Link to="/dashboard" className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-foreground rounded flex items-center justify-center group-hover:scale-105 transition-transform">
            <span className="text-background font-bold font-mono">S</span>
          </div>
          <span className="font-semibold text-lg tracking-tight">Shipnode</span>
        </Link>
      </div>

      {/* Quick Search */}
      <div className="p-4">
        <div className="relative flex items-center">
          <Search className="absolute left-3 w-4 h-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Find..." 
            className="w-full bg-foreground/5 border border-foreground/10 rounded-md pl-9 pr-8 py-1.5 text-sm outline-none focus:border-foreground/30 transition-colors"
          />
          <div className="absolute right-2 border border-foreground/20 rounded px-1.5 text-[10px] text-muted-foreground">
            F
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
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

      {/* Bottom User Area */}
      <div className="p-4 border-t border-foreground/10">
        <button 
          onClick={logout}
          className="flex items-center gap-3 w-full hover:bg-foreground/5 p-2 rounded-lg transition-colors"
        >
          <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-foreground/10">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="font-mono text-xs uppercase">{user?.username?.[0] || "U"}</span>
            )}
          </div>
          <div className="flex flex-col flex-1 text-left truncate">
            <span className="font-medium text-sm truncate">{user?.username || "Guest User"}</span>
            <span className="text-[10px] text-muted-foreground truncate">{user?.email || "No email"}</span>
          </div>
          <Settings className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors" />
        </button>
      </div>
    </aside>
  );
}