import { useState, useEffect } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { FaGithub } from "react-icons/fa";
import { 
  Loader2, CheckCircle2, XCircle, 
  GitBranch, MoreHorizontal, Box
} from "lucide-react";
import axiosInstance from "../utils/axiosInstance";
import { API_PATHS } from "../utils/apiPaths";
import { EmptyProjectState } from "../components/dashboard/EmptyProjectState"; 
import { DeleteProjectModal } from "../components/dashboard/DeleteProjectModal"; 

const formatTimeAgo = (dateString) => {
  if (!dateString) return "Just now";
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return `${Math.floor(diffInSeconds / 86400)}d ago`;
};

export default function Projects() {
  const context = useOutletContext();
  const searchQuery = context?.searchQuery || "";

  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchProjects = async () => {
    setIsLoading(true);
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

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleDeleteClick = (project) => {
    setProjectToDelete(project);
    setIsModalOpen(true);
  };

  const executeDelete = async (projectId) => {
    setIsDeleting(true);
    try {
      const res = await axiosInstance.delete(API_PATHS.PROJECTS.DELETE(projectId));
      if (res.data?.success) {
        setProjects((prev) => prev.filter(p => p.id !== projectId));
        setIsModalOpen(false); 
      }
    } catch (error) {
      console.error("Failed to delete project:", error);
      alert("Failed to delete project. Please try again.");
    } finally {
      setIsDeleting(false);
      setProjectToDelete(null); 
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (projects.length === 0) {
    return <EmptyProjectState />;
  }

  const filteredProjects = projects.filter((project) => {
    const query = searchQuery.toLowerCase();
    return (
      project.name.toLowerCase().includes(query) ||
      project.subdomain.toLowerCase().includes(query) ||
      project.repoName.toLowerCase().includes(query)
    );
  });

  return (
    <>
      {/* 🚨 Fix: Stable parent wrapper handles initial animation. Items-start prevents card stretching. */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {filteredProjects.length === 0 ? (
          <div className="p-12 text-center border border-foreground/10 rounded-xl bg-[#000000] text-muted-foreground mt-4">
            No projects match your search for "{searchQuery}".
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start">
            {filteredProjects.map((project) => {
              const latestDeploy = project.latestDeployment;
              const status = latestDeploy?.status || "UNKNOWN";
              const isReady = status === "READY";
              const isFailed = status === "FAILED";
              const liveUrl = `https://${project.subdomain}.${import.meta.env.VITE_PLATFORM_DOMAIN}`;
              
              let StatusIcon = <div className="w-6 h-6 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin" title="Building" />;
              if (isReady) StatusIcon = <CheckCircle2 className="w-6 h-6 text-green-500" title="Ready" />;
              if (isFailed) StatusIcon = <XCircle className="w-6 h-6 text-red-500" title="Failed" />;

              return (
                <div key={project.id} className="bg-[#000000] border border-foreground/10 rounded-xl p-6 font-sans text-foreground shadow-sm hover:border-foreground/30 transition-all flex flex-col relative group">
                  
                  <div className="flex items-start justify-between mb-5">
                    <div className="flex items-start gap-4">
                      <Link to={`/project/${project.id}`} className="w-8 h-8 rounded-md border border-foreground/20 bg-foreground/5 flex items-center justify-center shrink-0 mt-0.5 hover:opacity-80 transition-opacity">
                          <div className="relative w-10 h-10 rounded-[10px] border border-foreground/10 overflow-hidden bg-foreground/5 shrink-0 shadow-sm flex items-center justify-center">
                              <Box className="w-5 h-5 text-foreground/50 absolute" />
                              <img
                                  src={`https://www.google.com/s2/favicons?domain=${project.subdomain}.${import.meta.env.VITE_PLATFORM_DOMAIN}&sz=128`}
                                  alt={`${project.name} favicon`}
                                  className="w-full h-full object-cover relative z-10 bg-background"
                                  onError={(e) => {
                                      e.target.style.display = 'none';
                                  }}
                              />
                          </div>
                      </Link>

                      <div className="flex flex-col overflow-hidden">
                        <Link to={`/project/${project.id}`} className="text-lg font-bold tracking-tight text-foreground truncate hover:underline">
                          {project.name}
                        </Link>
                        <a 
                          href={liveUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-muted-foreground hover:text-foreground transition-colors truncate"
                        >
                          {project.subdomain}.{import.meta.env.VITE_PLATFORM_DOMAIN}
                        </a>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {StatusIcon}
                      <div className="relative">
                        <button 
                          onClick={() => handleDeleteClick(project)}
                          className="text-muted-foreground hover:text-red-500 transition-colors p-1 rounded-md hover:bg-foreground/10"
                          title="Delete Project"
                        >
                          <MoreHorizontal className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mb-5">
                    <a 
                      href={`https://github.com/${project.repoName}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-foreground/5 hover:bg-foreground/10 transition-colors border border-foreground/10 rounded-full px-3 py-1 text-[13px] font-medium text-foreground"
                    >
                      <FaGithub className="w-3.5 h-3.5 text-foreground/70" />
                      {project.repoName}
                    </a>
                  </div>

                  <p className="text-[15px] font-medium text-foreground mb-2 leading-snug line-clamp-1">
                    {latestDeploy?.commitMessage || "Initial deployment"}
                  </p>

                  <div className="flex items-center gap-2 text-[13px] text-muted-foreground font-mono tracking-tight mt-auto pt-1">
                    <span>{formatTimeAgo(latestDeploy?.createdAt)}</span>
                    {latestDeploy?.branch && (
                      <>
                        <span>on</span>
                        <div className="flex items-center gap-1">
                          <GitBranch className="w-3.5 h-3.5" />
                          <span className="text-foreground/90">{latestDeploy.branch}</span>
                        </div>
                      </>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      <DeleteProjectModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={executeDelete}
        project={projectToDelete}
        isDeleting={isDeleting}
      />
    </>
  );
}