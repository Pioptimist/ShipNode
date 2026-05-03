import { Search, Filter, ChevronDown } from "lucide-react";
import { useAuth } from "../../context/useAuth";
import { Link, useLocation } from "react-router-dom";

export function Topbar({ searchQuery, setSearchQuery }) {
  const { user } = useAuth();
  const location = useLocation();

  const isProjectView = location.pathname.startsWith('/project/');
  
  // Dynamic Breadcrumb Logic
  const getBreadcrumb = () => {
    const path = location.pathname;
    
    if (isProjectView) {
      // e.g. /project/123/settings -> "Settings"
      const parts = path.split('/');
      const section = parts[3] || 'Overview'; 
      return { main: "Project", sub: section.charAt(0).toUpperCase() + section.slice(1) };
    } else {
      // e.g. /dashboard/domains -> "Domains"
      const parts = path.split('/');
      const section = parts[2] || 'Projects';
      return { main: section.charAt(0).toUpperCase() + section.slice(1), sub: null };
    }
  };

  const breadcrumbs = getBreadcrumb();

  return (
    <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-foreground/10">
      <div className="h-14 px-8 flex items-center justify-between border-b border-foreground/5">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="text-muted-foreground mr-1">{user?.username}</span>
          <span className="text-muted-foreground">/</span>
          
          <span className={breadcrumbs.sub ? "text-muted-foreground" : "text-foreground"}>
            {breadcrumbs.main}
          </span>

          {breadcrumbs.sub && (
            <>
              <span className="text-muted-foreground">/</span>
              <span className="text-foreground">{breadcrumbs.sub}</span>
            </>
          )}
        </div>

        {!isProjectView && (
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <span className="text-foreground font-medium">Overview</span>
            <span className="hover:text-foreground cursor-pointer transition-colors">Integrations</span>
            <span className="hover:text-foreground cursor-pointer transition-colors">Activity</span>
          </div>
        )}
        <div className="w-20" /> 
      </div>

      <div className="h-16 px-8 flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-2xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isProjectView ? "Search resources..." : "Search Projects..."} 
            className="w-full bg-foreground/5 border border-foreground/10 rounded-lg pl-10 pr-4 py-2 text-sm outline-none focus:border-foreground/30 transition-colors"
          />
        </div>

        <div className="flex items-center gap-3">
          <button className="p-2 border border-foreground/10 rounded-lg hover:bg-foreground/5 text-muted-foreground transition-colors">
            <Filter className="w-4 h-4" />
          </button>
          
          <div className="flex items-center bg-foreground text-background rounded-lg hover:bg-foreground/90 transition-colors cursor-pointer">
            <Link to="/import" className="flex items-center text-background rounded-lg cursor-pointer">
              <button className="px-4 py-2 text-sm font-medium text-background">
                Add New...
              </button>
              <div className="px-2 py-2 border-l border-background/20 hover:bg-background/10 transition-colors rounded-r-lg flex items-center justify-center text-background">
                <ChevronDown className="w-4 h-4" />
              </div>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}