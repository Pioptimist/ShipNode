import { useState, useEffect } from "react";
import { Loader2, Globe } from "lucide-react";
import axiosInstance from "../utils/axiosInstance";
import { API_PATHS } from "../utils/apiPaths";
import { ProjectSelector } from "../components/domains/ProjectSelector";
import { DomainConfigurator } from "../components/domains/DomainConfigurator";

export default function DomainsPage() {
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState(null);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await axiosInstance.get(API_PATHS.PROJECTS.GET_ALL);
        if (res.data?.success) {
          setProjects(res.data.data);
        }
      } catch (error) {
        console.error("Failed to fetch projects:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProjects();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700 font-sans">
      <div className="mb-8">
        <h2 className="text-3xl font-semibold tracking-tight mb-2 flex items-center gap-3">
          <Globe className="w-8 h-8 text-muted-foreground" />
          Custom Domains
        </h2>
        <p className="text-muted-foreground text-sm">
          {selectedProject 
            ? `Configuring domain for ${selectedProject.name}` 
            : "Select a project to configure its custom domain."}
        </p>
      </div>

      {!selectedProject ? (
        <ProjectSelector 
          projects={projects} 
          onSelect={setSelectedProject} 
        />
      ) : (
        <DomainConfigurator 
          project={selectedProject} 
          onBack={() => {
            // Clear selection and re-fetch to get updated domain status
            setSelectedProject(null);
            setIsLoading(true);
            axiosInstance.get(API_PATHS.PROJECTS.GET_ALL).then(res => {
              if (res.data?.success) setProjects(res.data.data);
              setIsLoading(false);
            });
          }} 
        />
      )}
    </div>
  );
}