import { Search, ChevronDown } from "lucide-react"; // 🚨 Removed Filter
import { useAuth } from "../../context/useAuth";
import { Link, useLocation } from "react-router-dom";

export function Topbar({ searchQuery, setSearchQuery }) {
  const { user } = useAuth();
  const location = useLocation();

  const isProjectView = location.pathname.startsWith('/project/');
  
  // 🚨 NEW: Only show search on the main dashboard (projects list) or inside a specific project
  const showSearch = location.pathname === '/dashboard' || location.pathname === '/dashboard/' || isProjectView;
  
  const getBreadcrumb = () => {
    const path = location.pathname;
    
    if (isProjectView) {
      const parts = path.split('/');
      const section = parts[3] || 'Overview'; 
      return { main: "Project", sub: section.charAt(0).toUpperCase() + section.slice(1) };
    } else {
      const parts = path.split('/');
      const section = parts[2] || 'Projects';
      return { main: section.charAt(0).toUpperCase() + section.slice(1), sub: null };
    }
  };

  const breadcrumbs = getBreadcrumb();

  return (
    <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-foreground/10 w-full">
      {/* Top row */}
      <div className="h-14 pl-14 pr-4 md:px-8 flex items-center justify-between border-b border-foreground/5 overflow-x-auto scrollbar-hide whitespace-nowrap">
        <div className="flex items-center gap-1.5 md:gap-2 text-sm font-medium">
          <span className="text-muted-foreground hidden sm:inline">{user?.username}</span>
          <span className="text-muted-foreground hidden sm:inline">/</span>
          
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
          <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground shrink-0 ml-4">
            <span className="text-foreground font-medium">Overview</span>
            <span className="hover:text-foreground cursor-pointer transition-colors">Integrations</span>
            <span className="hover:text-foreground cursor-pointer transition-colors">Activity</span>
          </div>
        )}
        <div className="w-10 md:w-20 shrink-0" /> 
      </div>

      {/* Bottom row: Stacked flexibly on mobile, row on tablet/desktop */}
      <div className="py-3 px-4 md:h-16 md:py-0 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 md:gap-4">
        
        {/* 🚨 CONDITIONALLY RENDER THE SEARCH BAR */}
        {showSearch ? (
          <div className="relative w-full flex-1 max-w-2xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isProjectView ? "Search resources..." : "Search Projects..."} 
              className="w-full bg-foreground/5 border border-foreground/10 rounded-lg pl-10 pr-4 py-2 text-sm outline-none focus:border-foreground/30 transition-colors"
            />
          </div>
        ) : (
          <div className="flex-1" /> /* Invisible spacer to push the button to the right */
        )}

        <div className={`flex items-center gap-2 md:gap-3 w-full sm:w-auto shrink-0 ${showSearch ? 'justify-between sm:justify-end' : 'justify-end'}`}>
          {/* Filter button was completely removed from here */}
          
          <div className="flex items-center bg-foreground text-background rounded-lg hover:bg-foreground/90 transition-colors cursor-pointer shrink-0">
            <Link to="/import" className="flex items-center text-background rounded-lg cursor-pointer">
              <button className="px-3 md:px-4 py-2 text-sm font-medium text-background">
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