import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  Loader2, GitCommit, Clock, CheckCircle2, 
  XCircle, ArrowRight, GitBranch, Terminal
} from "lucide-react";
import axiosInstance from "../utils/axiosInstance";
import { API_PATHS } from "../utils/apiPaths";

export default function Deployments() {
  const [deployments, setDeployments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDeployments = async () => {
      try {
        const res = await axiosInstance.get(API_PATHS.DEPLOYMENTS.GET_ALL);
        if (res.data?.success) {
          setDeployments(res.data.data);
        }
      } catch (error) {
        console.error("Failed to fetch deployments:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDeployments();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (deployments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-muted-foreground">
        <Terminal className="w-12 h-12 mb-4 opacity-20" />
        <p>No deployments found. Push some code!</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Deployments</h1>
        <p className="text-sm text-muted-foreground">A history of all builds across your projects.</p>
      </div>

      <div className="bg-[#0a0a0a] border border-foreground/10 rounded-xl overflow-hidden shadow-sm">
        <div className="divide-y divide-foreground/5">
          {deployments.map((deploy) => {
            const isReady = deploy.status === "READY";
            const isFailed = deploy.status === "FAILED";
            const isBuilding = deploy.status === "BUILDING" || deploy.status === "QUEUED";

            return (
              <div key={deploy.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-foreground/[0.02] transition-colors">
                
                {/* Left: Project & Commit */}
                <div className="flex items-start gap-4">
                  <div className="mt-1">
                    {isReady ? <CheckCircle2 className="w-5 h-5 text-green-500" /> 
                     : isFailed ? <XCircle className="w-5 h-5 text-red-500" /> 
                     : <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{deploy.projectName}</span>
                      <span className="text-muted-foreground">/</span>
                      <a href={`http://${deploy.subdomain}.${import.meta.env.VITE_PLATFORM_DOMAIN}`} target="_blank" rel="noreferrer" className="text-sm text-blue-400 hover:underline">
                        {deploy.subdomain}.{import.meta.env.VITE_PLATFORM_DOMAIN}
                      </a>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1 truncate max-w-[250px]">
                        <GitCommit className="w-3.5 h-3.5" /> 
                        <span className="text-foreground/80 font-medium">{deploy.commitMessage || "Manual Deploy"}</span>
                      </span>
                      <span className="flex items-center gap-1 font-mono text-xs bg-foreground/5 px-1.5 py-0.5 rounded">
                        <GitBranch className="w-3 h-3" /> {deploy.branch}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Time & Actions */}
                <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-8 sm:ml-4 border-t sm:border-0 border-foreground/5 pt-3 sm:pt-0">
                  <div className="flex flex-col sm:text-right text-xs text-muted-foreground gap-1">
                    <span className="flex items-center sm:justify-end gap-1">
                      <Clock className="w-3 h-3" /> 
                      {new Date(deploy.createdAt).toLocaleString()}
                    </span>
                    {deploy.buildTimeMs && (
                      <span>Built in {(deploy.buildTimeMs / 1000).toFixed(1)}s</span>
                    )}
                  </div>
                  
                  {/* Link to view logs (Reusing your NewProject route design conceptually) */}
                  <Link 
                    to={`/new?repo=${deploy.projectName}&deploy=${deploy.id}`}
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium shrink-0"
                  >
                    Details <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>

              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}