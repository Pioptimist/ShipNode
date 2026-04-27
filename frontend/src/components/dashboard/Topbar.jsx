import { Search, LayoutGrid, List, Filter, Plus, ChevronDown } from "lucide-react";
import { useAuth } from "../../context/useAuth";

export function Topbar() {
  const { user } = useAuth();
  
  return (
    <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-foreground/10">
      {/* Breadcrumb / Top Nav */}
      <div className="h-14 px-8 flex items-center justify-between border-b border-foreground/5">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="text-muted-foreground mr-1">{user?.username}</span>
          <span className="text-muted-foreground">/</span>
          <span>Projects</span>
        </div>
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <span className="text-foreground font-medium">Overview</span>
          <span className="hover:text-foreground cursor-pointer transition-colors">Integrations</span>
          <span className="hover:text-foreground cursor-pointer transition-colors">Activity</span>
        </div>
        <div className="w-20" /> {/* Spacer to balance flex-between */}
      </div>

      {/* Action Bar */}
      <div className="h-16 px-8 flex items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-2xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search Projects..." 
            className="w-full bg-foreground/5 border border-foreground/10 rounded-lg pl-10 pr-4 py-2 text-sm outline-none focus:border-foreground/30 transition-colors"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button className="p-2 border border-foreground/10 rounded-lg hover:bg-foreground/5 text-muted-foreground transition-colors">
            <Filter className="w-4 h-4" />
          </button>
          
          {/* View Toggles */}
          <div className="flex items-center border border-foreground/10 rounded-lg p-0.5 bg-foreground/5">
            <button className="p-1.5 rounded-md bg-background shadow-sm text-foreground">
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors">
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Add New Button */}
          <div className="flex items-center bg-foreground text-background rounded-lg hover:bg-foreground/90 transition-colors cursor-pointer">
            <button className="px-4 py-2 text-sm font-medium">
              Add New...
            </button>
            <div className="px-2 py-2 border-l border-background/20 hover:bg-background/10 transition-colors rounded-r-lg">
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}