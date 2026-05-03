import { useState } from "react";
import { Search, Box, ArrowRight } from "lucide-react";

export function ProjectSelector({ projects, onSelect }) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="border border-foreground/10 bg-background/50 backdrop-blur-sm rounded-xl overflow-hidden shadow-sm">
      <div className="p-6 border-b border-foreground/10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-foreground/5 border border-foreground/10 rounded-lg pl-10 pr-4 py-2 text-sm outline-none focus:border-foreground/30 transition-colors"
          />
        </div>
      </div>

      <div className="divide-y divide-foreground/5 min-h-[150px] relative">
        {filteredProjects.length > 0 ? (
          filteredProjects.map((project) => (
            <div key={project.id} className="p-4 flex items-center justify-between hover:bg-foreground/5 transition-colors group">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg border border-foreground/10 bg-foreground/5 flex items-center justify-center shrink-0">
                  <Box className="w-5 h-5 text-foreground/50" />
                </div>
                <div className="flex flex-col text-left">
                  <p className="text-sm font-medium text-foreground">{project.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {project.customDomain ? project.customDomain : `${project.subdomain}.localhost`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => onSelect(project)}
                className="flex items-center gap-2 px-4 py-1.5 bg-foreground text-background rounded-md text-sm font-medium transition-all opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0"
              >
                Configure <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-muted-foreground text-sm">
            No projects found. Create one first!
          </div>
        )}
      </div>
    </div>
  );
}