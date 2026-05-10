import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import axiosInstance from "../utils/axiosInstance";
import { API_PATHS } from "../utils/apiPaths";
import { 
  GitBranch, History, ExternalLink, 
  Search, MoreHorizontal, Loader2, XCircle
} from "lucide-react";
import { FaGithub } from "react-icons/fa";
import { RollbackModal } from "../components/modals/RollbackModal";

export default function ProjectOverview() {
  const { id } = useParams();
  const { user } = useAuth();
  
  const [project, setProject] = useState(null);
  const [deployments, setDeployments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [projRes, depsRes] = await Promise.all([
          axiosInstance.get(API_PATHS.PROJECTS.GET_ONE(id)),
          axiosInstance.get(API_PATHS.DEPLOYMENTS.GET_DEPLOYMENTS(id))
        ]);

        if (projRes.data.success) setProject(projRes.data.data);
        if (depsRes.data.success) setDeployments(depsRes.data.data);
      } catch (error) {
        console.error("Failed to fetch project overview:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  const handleRollback = async (targetDeploymentId) => {
    setIsRollingBack(true);
    try {
      await axiosInstance.post(API_PATHS.PROJECTS.ROLLBACK(id), { targetDeploymentId });
      const projRes = await axiosInstance.get(API_PATHS.PROJECTS.GET_ONE(id));
      if (projRes.data.success) setProject(projRes.data.data);
      setIsModalOpen(false); // 🚨 CLOSE THE MODAL ON SUCCESS
    } catch (error) {
      console.error("Rollback failed:", error);
    } finally {
      setIsRollingBack(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!project) return <div className="p-8 text-center text-muted-foreground">Project not found.</div>;

  const activeDeployment = deployments.find(d => d.id === project.activeDeploymentId);
  const previewDeployments = deployments.filter(d => d.id !== project.activeDeploymentId);
  const prodUrl = `https://${project.subdomain}.${import.meta.env.VITE_PLATFORM_DOMAIN}`;

  return (
    <div className="max-w-5xl mx-auto space-y-8 md:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 font-sans px-4 md:px-8 pb-12 mt-4 md:mt-0">
        
      {/* 1. Production Deployment Card */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-xl font-semibold tracking-tight">Production Deployment</h2>
          <div className="flex items-center flex-wrap gap-2 md:gap-3">
            <a href={`https://github.com/${project.repoName}`} target="_blank" rel="noopener noreferrer" className="px-2.5 py-1.5 md:px-3 bg-background border border-foreground/10 hover:bg-foreground/5 rounded-md text-xs md:text-sm font-medium flex items-center gap-1.5 md:gap-2 transition-colors">
              <FaGithub className="w-3.5 h-3.5 md:w-4 md:h-4" /> <span className="hidden sm:inline">Repository</span>
            </a>
            <button
              onClick={() => setIsModalOpen(true)} 
              disabled={isRollingBack}
              className="px-2.5 py-1.5 md:px-3 bg-background border border-foreground/10 hover:bg-foreground/5 rounded-md text-xs md:text-sm font-medium flex items-center gap-1.5 md:gap-2 transition-colors disabled:opacity-50"
            >
              {isRollingBack ? <Loader2 className="w-3.5 h-3.5 md:w-4 md:h-4 animate-spin" /> : <History className="w-3.5 h-3.5 md:w-4 md:h-4" />}
              <span className="hidden sm:inline">Instant</span> Rollback
            </button>
            <a href={prodUrl} target="_blank" rel="noopener noreferrer" className="px-2.5 py-1.5 md:px-3 bg-foreground text-background hover:bg-foreground/90 rounded-md text-xs md:text-sm font-medium flex items-center gap-1.5 md:gap-2 transition-colors">
              Visit <ExternalLink className="w-3.5 h-3.5 md:w-4 md:h-4" />
            </a>
          </div>
        </div>

        <div className="bg-[#000000] border border-foreground/10 rounded-xl overflow-hidden shadow-sm flex flex-col lg:flex-row min-h-[350px]">
          {/* Left side: Iframe Preview using the scaling trick */}
          <div className="w-full lg:w-1/2 h-[200px] sm:h-[250px] lg:h-auto border-b lg:border-b-0 lg:border-r border-foreground/10 relative overflow-hidden bg-white/5 flex items-center justify-center group shrink-0">
            {activeDeployment?.status === "READY" ? (
              <div className="absolute inset-0 overflow-hidden bg-background">
                {/* 🚨 CHANGED: w-[200%] h-[200%] scale-50 to mimic a standard laptop width! */}
                <iframe 
                  src={prodUrl} 
                  title="Production Preview" 
                  scrolling="no"
                  className="absolute top-0 left-0 w-[200%] h-[200%] scale-50 origin-top-left border-0 pointer-events-none bg-background" 
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors pointer-events-none" />
              </div>
            ) : (
              <div className="flex flex-col items-center text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                <span className="text-sm">Building Production...</span>
              </div>
            )}
          </div>

          {/* Right side: Deployment Metadata */}
          <div className="w-full lg:w-1/2 p-5 md:p-6 lg:p-8 flex flex-col justify-center space-y-6 min-w-0">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Deployment</p>
              <a href={prodUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:underline text-foreground break-all">
                {project.subdomain}.{import.meta.env.VITE_PLATFORM_DOMAIN} 
              </a>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground mb-1 flex items-center gap-2">
                Domains <button className="w-4 h-4 rounded-full border border-muted-foreground flex items-center justify-center text-xs hover:text-foreground hover:border-foreground transition-colors">+</button>
              </p>
              {project.customDomain ? (
                <a href={`https://${project.customDomain}`} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold hover:underline flex items-center gap-2 break-all">
                  {project.customDomain} <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0" />
                </a>
              ) : (
                <span className="text-sm text-muted-foreground italic">No custom domains configured.</span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Status</p>
                <div className="flex items-center gap-2">
                  {activeDeployment?.status === "READY" ? <div className="w-2.5 h-2.5 rounded-full bg-green-500 shrink-0" /> : <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse shrink-0" />}
                  <span className="text-sm font-semibold capitalize">{activeDeployment?.status || "Unknown"}</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Created</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{activeDeployment ? new Date(activeDeployment.createdAt).toLocaleDateString() : "--"} by {user?.username}</span>
                  <img src={user?.avatarUrl} alt="avatar" className="w-5 h-5 rounded-full shrink-0" />
                </div>
              </div>
            </div>

            <div className="min-w-0">
              <p className="text-sm text-muted-foreground mb-1">Source</p>
              <div className="flex items-center gap-2 mb-1">
                <GitBranch className="w-4 h-4 text-foreground shrink-0" />
                <span className="text-sm font-mono font-medium truncate">{project.productionBranch}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground text-sm min-w-0">
                <GitBranch className="w-3 h-3 shrink-0" />
                <span className="font-mono shrink-0">{activeDeployment?.commitHash?.substring(0, 7) || "---"}</span>
                <span className="truncate max-w-full">{activeDeployment?.commitMessage || "Initial deployment"}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Active Branches / Preview Deployments */}
      <section className="space-y-4 pt-4 border-t border-foreground/10">
        <h2 className="text-xl font-semibold tracking-tight">Active Branches</h2>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" placeholder="Search branches..." className="w-full bg-background border border-foreground/10 rounded-md pl-9 pr-3 py-1.5 text-sm outline-none focus:border-foreground/30 transition-colors" />
          </div>
          <button className="px-3 py-1.5 bg-background border border-foreground/10 rounded-md text-sm text-muted-foreground flex items-center justify-center gap-2 hover:bg-foreground/5 transition-colors shrink-0">
            <div className="flex gap-0.5"><div className="w-2 h-2 rounded-full bg-green-500"/><div className="w-2 h-2 rounded-full bg-red-500"/><div className="w-2 h-2 rounded-full bg-foreground/20"/></div>
            Status
          </button>
        </div>

        <div className="border border-foreground/10 rounded-xl overflow-hidden bg-[#000000] shadow-sm divide-y divide-foreground/10">
          {previewDeployments.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No preview deployments yet. Push to a feature branch to see them here!</div>
          ) : (
            previewDeployments.map((dep) => (
              <div key={dep.id} className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 lg:gap-4 hover:bg-foreground/5 transition-colors">
                
                <div className="flex items-center gap-3 min-w-0 mb-1 lg:mb-0">
                  <GitBranch className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-mono font-medium truncate">{dep.branch}</span>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 lg:ml-auto">
                  
                  {dep.status === "READY" ? (
                      dep.previewUrl ? (
                        <a href={`https://${dep.previewUrl}.${import.meta.env.VITE_PLATFORM_DOMAIN}`} target="_blank" rel="noopener noreferrer" className="px-2.5 py-1 text-xs border border-foreground/10 rounded hover:bg-foreground/10 transition-colors flex items-center gap-1.5 shrink-0">
                          <ExternalLink className="w-3 h-3" /> Preview
                        </a>
                      ) : (
                        <span className="px-2.5 py-1 text-xs border border-foreground/10 text-muted-foreground bg-foreground/5 rounded flex items-center gap-1.5 shrink-0">
                          <History className="w-3 h-3" /> Past Prod
                        </span>
                      )
                  ) : dep.status === "FAILED" ? (
                      <span className="px-2.5 py-1 text-xs border border-red-500/20 text-red-500 bg-red-500/10 rounded flex items-center gap-1.5 shrink-0">
                        <XCircle className="w-3 h-3" /> Failed
                      </span>
                  ) : (
                      <span className="px-2.5 py-1 text-xs border border-blue-500/20 text-blue-500 bg-blue-500/10 rounded flex items-center gap-1.5 shrink-0">
                        <Loader2 className="w-3 h-3 animate-spin" /> Building
                      </span>
                  )}
                  
                  <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs border border-foreground/10 rounded font-mono bg-foreground/5 text-muted-foreground shrink-0">
                    <div className={`w-1.5 h-1.5 rounded-full ${dep.status === "READY" ? "bg-green-500" : dep.status === "FAILED" ? "bg-red-500" : "bg-blue-500"}`} />
                    {dep.commitHash?.substring(0, 7) || "---"}
                  </div>
                  
                  <a href={`https://github.com/${project.repoName}/commit/${dep.commitHash}`} target="_blank" rel="noopener noreferrer" className="px-2.5 py-1 text-xs border border-foreground/10 rounded hover:bg-foreground/10 transition-colors flex items-center gap-1.5 text-muted-foreground shrink-0">
                    <FaGithub className="w-3 h-3" /> <span className="hidden sm:inline">Commit</span>
                  </a>

                  <div className="flex items-center gap-2 ml-auto lg:ml-2">
                    <img src={user?.avatarUrl} alt="author" className="w-5 h-5 rounded-full shrink-0" />
                    <span className="text-xs text-muted-foreground w-auto sm:w-16 text-right shrink-0">
                      {Math.floor((Date.now() - new Date(dep.createdAt)) / (1000 * 60 * 60))}h ago
                    </span>
                    <button className="p-1 hover:bg-foreground/10 rounded text-muted-foreground transition-colors ml-1 sm:ml-2 shrink-0">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
      
      <RollbackModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        deployments={deployments}
        activeDeploymentId={project.activeDeploymentId}
        onConfirm={handleRollback}
        isRollingBack={isRollingBack}
      />

    </div>
  );
}