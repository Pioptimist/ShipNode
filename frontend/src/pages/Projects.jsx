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
import { Toast } from "../components/ui/Toast";

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
  const [deletedProjectName, setDeletedProjectName] = useState("");
  const [toast, setToast] = useState({ isVisible: false, message: "", type: "success" });

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
        setDeletedProjectName(projectToDelete?.name);
        setIsModalOpen(false); 
        setToast({ isVisible: true, message: res.data.message || "Project deleted successfully", type: "success" });
      }
    } catch (error) {
      console.error("Failed to delete project:", error);
      const errorMessage = error.response?.data?.message || "Failed to delete project. Please try again.";
      setToast({ isVisible: true, message: errorMessage, type: "error" });
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
    return (
      <div className="px-4 md:px-6">
         <EmptyProjectState />
      </div>
    );
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
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 px-4 md:px-8 pb-8">
        {filteredProjects.length === 0 ? (
          <div className="p-8 md:p-12 text-center border border-foreground/10 rounded-xl bg-[#000000] text-muted-foreground mt-4">
            No projects match your search for "{searchQuery}".
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6 items-start mt-4 md:mt-6">
            {filteredProjects.map((project) => {
              const latestDeploy = project.latestDeployment;
              const status = latestDeploy?.status || "UNKNOWN";
              const isReady = status === "READY";
              const isFailed = status === "FAILED";
              const liveUrl = `http://${project.subdomain}.${import.meta.env.VITE_PLATFORM_DOMAIN}`;
              
              let StatusIcon = <div className="w-5 h-5 md:w-6 md:h-6 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin shrink-0" title="Building" />;
              if (isReady) StatusIcon = <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6 text-green-500 shrink-0" title="Ready" />;
              if (isFailed) StatusIcon = <XCircle className="w-5 h-5 md:w-6 md:h-6 text-red-500 shrink-0" title="Failed" />;

              return (
                <div key={project.id} className="bg-[#000000] border border-foreground/10 rounded-xl p-5 md:p-6 font-sans text-foreground shadow-sm hover:border-foreground/30 transition-all flex flex-col relative group">
                  
                  <div className="flex items-start justify-between gap-3 mb-4 md:mb-5">
                    <div className="flex items-start gap-3 md:gap-4 flex-1 min-w-0">
                      <Link to={`/project/${project.id}`} className="relative w-10 h-10 rounded-[10px] border border-foreground/10 overflow-hidden bg-foreground/5 flex items-center justify-center shrink-0 shadow-sm hover:opacity-80 transition-opacity">
                          <Box className="w-5 h-5 text-foreground/50 absolute" />
                          <img
                              src={`http://${project.subdomain}.${import.meta.env.VITE_PLATFORM_DOMAIN}/favicon.ico`}
                              alt={`${project.name} favicon`}
                              className="w-full h-full object-cover relative z-10 bg-background"
                              onError={(e) => {
                                  e.target.style.display = 'none';
                              }}
                          />
                      </Link>

                      <div className="flex flex-col flex-1 min-w-0">
                        <Link to={`/project/${project.id}`} className="text-base md:text-lg font-bold tracking-tight text-foreground truncate hover:underline">
                          {project.name}
                        </Link>
                        <a 
                          href={liveUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs md:text-sm text-muted-foreground hover:text-foreground transition-colors truncate block w-full"
                          title={`${project.subdomain}.${import.meta.env.VITE_PLATFORM_DOMAIN}`}
                        >
                          {project.subdomain}.{import.meta.env.VITE_PLATFORM_DOMAIN}
                        </a>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 md:gap-3 shrink-0">
                      {StatusIcon}
                      <div className="relative">
                        <button 
                          onClick={() => handleDeleteClick(project)}
                          className="text-muted-foreground hover:text-red-500 transition-colors p-1 rounded-md hover:bg-foreground/10"
                          title="Delete Project"
                        >
                          <MoreHorizontal className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mb-4 md:mb-5">
                    <a 
                      href={`https://github.com/${project.repoName}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 md:gap-2 bg-foreground/5 hover:bg-foreground/10 transition-colors border border-foreground/10 rounded-full px-2.5 md:px-3 py-1 text-[12px] md:text-[13px] font-medium text-foreground max-w-full truncate"
                    >
                      <FaGithub className="w-3.5 h-3.5 text-foreground/70 shrink-0" />
                      <span className="truncate">{project.repoName}</span>
                    </a>
                  </div>

                  <p className="text-[14px] md:text-[15px] font-medium text-foreground mb-2 leading-snug line-clamp-1">
                    {latestDeploy?.commitMessage || "Initial deployment"}
                  </p>

                  <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-[12px] md:text-[13px] text-muted-foreground font-mono tracking-tight mt-auto pt-1">
                    <span className="shrink-0">{formatTimeAgo(latestDeploy?.createdAt)}</span>
                    {latestDeploy?.branch && (
                      <>
                        <span className="shrink-0">on</span>
                        <div className="flex items-center gap-1 min-w-0">
                          <GitBranch className="w-3.5 h-3.5 shrink-0" />
                          <span className="text-foreground/90 truncate">{latestDeploy.branch}</span>
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
      <Toast 
        isVisible={toast.isVisible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
    </>
  );
}