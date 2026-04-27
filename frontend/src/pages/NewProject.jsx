import { useState, useEffect } from "react";
import { useAuth } from "../context/useAuth";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FaGithub } from "react-icons/fa";
import { 
  ArrowLeft, GitBranch, ChevronDown, 
  Settings, Bell, ChevronRight, Loader2, Folder, File, X
} from "lucide-react";
import axiosInstance from "../utils/axiosInstance";
import { API_PATHS } from "../utils/apiPaths";

export default function NewProject() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Get the repo name from the URL 
  const repoName = searchParams.get("repo") || "repository-name";
  const repoOwner = user?.username || "user"; // Assuming the user is the owner

  // --- Form & Build State ---
  const [projectName, setProjectName] = useState(repoName.toLowerCase().replace(/[^a-z0-9]/g, '-'));
  const [rootDirectory, setRootDirectory] = useState("./");
  const [framework, setFramework] = useState("VITE");
  const [installCommand, setInstallCommand] = useState("npm install");
  const [buildCommand, setBuildCommand] = useState("npm run build");
  const [outputDirectory, setOutputDirectory] = useState("dist");
  const [branch, setBranch] = useState("main");

  // --- UI State ---
  const [isDeploying, setIsDeploying] = useState(false);
  const [showBuildSettings, setShowBuildSettings] = useState(false);
  const [error, setError] = useState("");
  
  // --- Modal State ---
  const [isExplorerOpen, setIsExplorerOpen] = useState(false);
  const [explorerPath, setExplorerPath] = useState("");
  const [explorerContents, setExplorerContents] = useState([]);
  const [isLoadingContents, setIsLoadingContents] = useState(false);

  // Fetch Directory Contents
  const fetchDirectory = async (path = "") => {
    setIsLoadingContents(true);
    setExplorerContents([]);
    try {
      const res = await axiosInstance.get(API_PATHS.GITHUB.GET_CONTENTS, {
        params: { repoOwner, repoName, path }
      });
      if (res.data?.success) {
        setExplorerContents(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch repo contents:", err);
    } finally {
      setIsLoadingContents(false);
    }
  };

  const handleOpenExplorer = () => {
    setIsExplorerOpen(true);
    setExplorerPath(""); // Start at root
    fetchDirectory("");
  };

  const handleNavigateDir = (newPath) => {
    setExplorerPath(newPath);
    fetchDirectory(newPath);
  };

  const handleSelectDir = () => {
    setRootDirectory(explorerPath || "./");
    setIsExplorerOpen(false);
  };

  // --- Submit Handler ---
  const handleDeploy = async () => {
    setIsDeploying(true);
    setError("");

    try {
      const payload = {
        repoOwner,
        repoName,
        branch,
        framework,
        rootDirectory,
        installCommand,
        buildCommand,
        outputDirectory
      };

      const response = await axiosInstance.post(API_PATHS.PROJECTS.CREATE, payload);
      
      if (response.data.success) {
        navigate("/dashboard");
      }
    } catch (err) {
      console.error("Deployment failed:", err);
      setError(err.response?.data?.message || "Failed to create project. Please try again.");
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* 1. Custom Topbar for New Project Page */}
      <nav className="sticky top-0 z-30 h-14 border-b border-foreground/10 bg-background/80 backdrop-blur-md px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)} 
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>

        <span className="text-sm font-medium">New Project</span>

        <div className="flex items-center gap-3">
          <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
            <Bell className="w-4 h-4" />
          </button>
          <div className="w-6 h-6 rounded-full overflow-hidden bg-foreground/10 border border-foreground/10">
            {user?.avatarUrl && <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />}
          </div>
        </div>
      </nav>

      {/* 2. Main Content */}
      <div className="flex-1 p-6 lg:p-10 flex justify-center">
        <div className="w-full max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          <div className="bg-[#0a0a0a] border border-foreground/10 rounded-xl overflow-hidden shadow-2xl">
            {/* Header section inside card */}
            <div className="p-8 border-b border-foreground/10">
              <h1 className="text-2xl font-semibold mb-6">New Project</h1>
              
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground font-mono">Importing from GitHub</span>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <FaGithub className="w-4 h-4" />
                  <span>{repoOwner}/{repoName}</span>
                  <span className="flex items-center gap-1 text-muted-foreground font-mono text-xs ml-2 bg-foreground/5 px-2 py-0.5 rounded cursor-pointer hover:bg-foreground/10 transition-colors">
                    <GitBranch className="w-3 h-3" /> {branch}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-8 space-y-8">
              <p className="text-sm text-muted-foreground">
                Choose where you want to create the project and give it a name.
              </p>

              {/* Error Banner */}
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-lg">
                  {error}
                </div>
              )}

              {/* Branch Selection */}
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Production Branch</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    placeholder="main or master"
                    className="w-full bg-background border border-foreground/10 rounded-md pl-9 pr-3 py-2 text-sm outline-none focus:border-foreground/30 transition-colors font-mono"
                  />
                  <GitBranch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                </div>
              </div>

              {/* Project Name */}
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Project Name</label>
                <input 
                  type="text" 
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full bg-background border border-foreground/10 rounded-md px-3 py-2 text-sm outline-none focus:border-foreground/30 transition-colors"
                />
              </div>

              {/* Framework Preset */}
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Framework Preset</label>
                <div className="flex items-center justify-between w-full bg-background border border-foreground/10 rounded-md px-3 py-2 text-sm cursor-pointer hover:border-foreground/20 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded bg-foreground/5 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                    </div>
                    <span>{framework === "VITE" ? "Vite / React" : framework}</span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>

              {/* Root Directory */}
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Root Directory</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={rootDirectory}
                    onChange={(e) => setRootDirectory(e.target.value)}
                    className="w-full bg-background border border-foreground/10 rounded-md pl-3 pr-16 py-2 text-sm outline-none font-mono"
                  />
                  <button 
                    onClick={handleOpenExplorer}
                    className="absolute right-1 top-1 bottom-1 px-3 bg-foreground/5 hover:bg-foreground/10 rounded text-xs transition-colors border border-foreground/10"
                  >
                    Edit
                  </button>
                </div>
              </div>

              {/* Accordion Sections */}
              <div className="space-y-3 pt-4 border-t border-foreground/10">
                <div 
                  onClick={() => setShowBuildSettings(!showBuildSettings)}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground cursor-pointer transition-colors group select-none"
                >
                  <ChevronRight className={`w-4 h-4 transition-transform ${showBuildSettings ? "rotate-90" : "group-hover:translate-x-1"}`} />
                  <span>Build and Output Settings</span>
                </div>

                {/* Hidden Build Settings Inputs */}
                {showBuildSettings && (
                  <div className="pl-6 space-y-4 pt-2 pb-4 animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Build Command</label>
                      <input type="text" value={buildCommand} onChange={e => setBuildCommand(e.target.value)} className="w-full bg-background border border-foreground/10 rounded-md px-3 py-1.5 text-sm outline-none font-mono text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Output Directory</label>
                      <input type="text" value={outputDirectory} onChange={e => setOutputDirectory(e.target.value)} className="w-full bg-background border border-foreground/10 rounded-md px-3 py-1.5 text-sm outline-none font-mono text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Install Command</label>
                      <input type="text" value={installCommand} onChange={e => setInstallCommand(e.target.value)} className="w-full bg-background border border-foreground/10 rounded-md px-3 py-1.5 text-sm outline-none font-mono text-muted-foreground" />
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground cursor-pointer transition-colors group">
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  <span>Environment Variables</span>
                </div>
              </div>
            </div>

            {/* Deploy Button Footer */}
            <div className="p-8 border-t border-foreground/10 bg-foreground/[0.02]">
              <button 
                onClick={handleDeploy}
                disabled={isDeploying}
                className="w-full py-3 bg-foreground text-background font-semibold rounded-md hover:bg-foreground/90 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
              >
                {isDeploying ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Deploying...
                  </>
                ) : (
                  "Deploy"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Directory Explorer Modal */}
      {isExplorerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[#0a0a0a] border border-foreground/10 rounded-xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-foreground/10 bg-foreground/[0.02]">
              <div className="flex items-center gap-2">
                <Folder className="w-5 h-5 text-muted-foreground" />
                <h3 className="font-semibold text-sm">Select Root Directory</h3>
              </div>
              <button 
                onClick={() => setIsExplorerOpen(false)}
                className="p-1.5 rounded-md hover:bg-foreground/10 text-muted-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current Path Breadcrumbs */}
            <div className="px-4 py-3 border-b border-foreground/5 bg-foreground/[0.01] flex items-center gap-2 text-sm font-mono overflow-x-auto whitespace-nowrap scrollbar-hide">
              <span 
                className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                onClick={() => handleNavigateDir("")}
              >
                {repoName}
              </span>
              {explorerPath.split("/").filter(Boolean).map((segment, idx, arr) => {
                const buildPath = arr.slice(0, idx + 1).join("/");
                return (
                  <span key={buildPath} className="flex items-center gap-2">
                    <span className="text-muted-foreground">/</span>
                    <span 
                      className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                      onClick={() => handleNavigateDir(buildPath)}
                    >
                      {segment}
                    </span>
                  </span>
                );
              })}
            </div>

            {/* Files & Folders List */}
            <div className="flex-1 overflow-y-auto p-2 min-h-[300px]">
              {isLoadingContents ? (
                <div className="w-full h-full flex items-center justify-center min-h-[300px]">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : explorerContents.length === 0 ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground mt-20">
                  <Folder className="w-12 h-12 mb-3 opacity-20" />
                  <span className="text-sm">Empty directory</span>
                </div>
              ) : (
                <div className="space-y-1">
                  {explorerPath && (
                    <div 
                      onClick={() => {
                        const parentPath = explorerPath.split("/").slice(0, -1).join("/");
                        handleNavigateDir(parentPath);
                      }}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-foreground/5 cursor-pointer transition-colors text-sm"
                    >
                      <ArrowLeft className="w-4 h-4 text-muted-foreground" />
                      <span className="font-mono text-muted-foreground">..</span>
                    </div>
                  )}

                  {explorerContents
                    .sort((a, b) => {
                      if (a.type === b.type) return a.name.localeCompare(b.name);
                      return a.type === "dir" ? -1 : 1;
                    })
                    .map((item) => (
                      <div 
                        key={item.sha} 
                        onClick={() => item.type === "dir" && handleNavigateDir(item.path)}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors text-sm ${
                          item.type === "dir" ? "hover:bg-foreground/5 cursor-pointer" : "opacity-60 cursor-default"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {item.type === "dir" ? (
                            <Folder className="w-4 h-4 text-blue-400" />
                          ) : (
                            <File className="w-4 h-4 text-muted-foreground" />
                          )}
                          <span className="font-mono truncate max-w-[300px]">{item.name}</span>
                        </div>
                        {item.type === "dir" && <ChevronRight className="w-4 h-4 text-muted-foreground opacity-50" />}
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-foreground/10 bg-foreground/[0.02] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Selected:</span>
                <span className="text-xs font-mono bg-foreground/10 px-2 py-1 rounded">
                  {explorerPath ? `./${explorerPath}` : "./"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsExplorerOpen(false)}
                  className="px-4 py-2 text-sm font-medium hover:bg-foreground/5 text-muted-foreground rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSelectDir}
                  className="px-4 py-2 text-sm font-medium bg-foreground text-background rounded-lg hover:bg-foreground/90 transition-colors"
                >
                  Select Directory
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}