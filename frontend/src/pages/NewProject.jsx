import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/useAuth"; 
import { useNavigate, useSearchParams } from "react-router-dom";
import { FaGithub } from "react-icons/fa";
import { io } from "socket.io-client";
import { ENV } from "../utils/env.ts";
import { 
  ArrowLeft, GitBranch, ChevronDown, ChevronRight,
  Loader2, Folder, File, X,
  Terminal, CheckCircle2, Globe, Clock, GitCommit, ExternalLink, XCircle, LayoutDashboard 
} from "lucide-react";
import axiosInstance from "../utils/axiosInstance";
import { API_PATHS } from "../utils/apiPaths";
import AnsiModule from "ansi-to-react";

const Ansi = AnsiModule.default || AnsiModule;

export default function NewProject() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const repoName = searchParams.get("repo") || "repository-name";
  const repoOwner = user?.username || "user"; 

  // --- Form & Build State ---
  const [projectName, setProjectName] = useState(repoName.toLowerCase().replace(/[^a-z0-9]/g, '-'));
  const [rootDirectory, setRootDirectory] = useState("./");
  const [framework, setFramework] = useState("VITE");
  const [installCommand, setInstallCommand] = useState("npm install");
  const [buildCommand, setBuildCommand] = useState("npm run build");
  const [outputDirectory, setOutputDirectory] = useState("dist");
  const [branch, setBranch] = useState("main");
  const [branches, setBranches] = useState([]);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);

  // --- UI State ---
  const [isDeploying, setIsDeploying] = useState(false);
  const [showBuildSettings, setShowBuildSettings] = useState(false);
  const [error, setError] = useState("");
  
  // --- Modal State ---
  const [isExplorerOpen, setIsExplorerOpen] = useState(false);
  const [explorerPath, setExplorerPath] = useState("");
  const [explorerContents, setExplorerContents] = useState([]);
  const [isLoadingContents, setIsLoadingContents] = useState(false);

  // --- DEPLOYMENT TRACKING STATE ---
  const [deploymentId, setDeploymentId] = useState(searchParams.get("deploy") || null);
  const [deploymentStatus, setDeploymentStatus] = useState("BUILDING"); 
  const [deploymentData, setDeploymentData] = useState(null);
  const [logs, setLogs] = useState([]);
  
  // --- UI specific states ---
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isLogsOpen, setIsLogsOpen] = useState(true); 
  
  // --- REFS ---
  const logsEndRef = useRef(null);
  const deploymentSectionRef = useRef(null);
  const logsHeaderRef = useRef(null); // 🚨 Ref for the Accordion auto-scroll

  // --- 🔄 REFRESH PERSISTENCE LOGIC ---
  useEffect(() => {
    if (deploymentId) {
      setTimeout(() => {
        deploymentSectionRef.current?.scrollIntoView({ behavior: "instant", block: "start" });
      }, 100);
    }
  }, []);

  // --- FETCH BRANCHES ON MOUNT ---
  useEffect(() => {
    if (!repoOwner || !repoName) return;
    const fetchBranches = async () => {
      setIsLoadingBranches(true);
      try {
        const res = await axiosInstance.get(API_PATHS.GITHUB.GET_BRANCHES, { params: { repoOwner, repoName } });
        if (res.data?.success && res.data.data.length > 0) {
          setBranches(res.data.data);
          const defaultBranch = res.data.data.find(b => b.name === 'main' || b.name === 'master')?.name;
          setBranch(defaultBranch || res.data.data[0].name);
        }
      } catch (err) {} finally { setIsLoadingBranches(false); }
    };
    fetchBranches();
  }, [repoOwner, repoName]);

  // Auto-scroll terminal
  useEffect(() => {
    if (isLogsOpen) {
      logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, isLogsOpen]);

  // Fetch Directory Contents
  const fetchDirectory = async (path = "") => {
    setIsLoadingContents(true);
    setExplorerContents([]);
    try {
      const res = await axiosInstance.get(API_PATHS.GITHUB.GET_CONTENTS, { params: { repoOwner, repoName, path, branch } });
      if (res.data?.success) setExplorerContents(res.data.data);
    } catch (err) {} finally { setIsLoadingContents(false); }
  };

  const handleOpenExplorer = () => { setIsExplorerOpen(true); setExplorerPath(""); fetchDirectory(""); };
  const handleNavigateDir = (newPath) => { setExplorerPath(newPath); fetchDirectory(newPath); };
  const handleSelectDir = () => { setRootDirectory(explorerPath || "./"); setIsExplorerOpen(false); };

  // --- Submit Handler ---
  const handleDeploy = async () => {
    setIsDeploying(true);
    setError("");

    try {
      const payload = { repoOwner, repoName, branch, framework, rootDirectory, installCommand, buildCommand, outputDirectory };
      const response = await axiosInstance.post(API_PATHS.PROJECTS.CREATE, payload);
      
      if (response.data.success) {
        const newId = response.data.data.deploymentId;
        if (newId) {
          setSearchParams({ repo: repoName, deploy: newId }, { replace: true });
          setDeploymentId(newId);
          setIsLogsOpen(true); 
          setTimeout(() => {
            deploymentSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 150);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create project.");
      setIsDeploying(false);
    } 
  };

  // 🚨 SMART TOGGLE LOGS FUNCTION
  const handleToggleLogs = () => {
    const willOpen = !isLogsOpen;
    setIsLogsOpen(willOpen);
    
    // Wait for the accordion CSS transition to begin, then scroll smoothly
    setTimeout(() => {
      if (willOpen) {
        logsHeaderRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        deploymentSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 200); 
  };

  // --- LIVE SOCKET & FETCHING LOGIC ---
  useEffect(() => {
    if (!deploymentId) return;
    
    const fetchDetails = async () => {
      setIsLoadingDetails(true); 
      try {
        const res = await axiosInstance.get(API_PATHS.DEPLOYMENTS.GET_STATUS(deploymentId));
        if (res.data?.success) {
          setDeploymentData(res.data.data);
          setDeploymentStatus(res.data.data.status); 
          
          if (res.data.data.status !== "BUILDING" && res.data.data.status !== "QUEUED") {
            setIsDeploying(false);
            setIsLogsOpen(false); 
            
            // 🚨 FIXED: Robust historical logs parser for raw strings
            try {
              const logsRes = await axiosInstance.get(API_PATHS.DEPLOYMENTS.GET_LOGS(deploymentId));
              let pastLogs = [];
              
              // If backend sends plain string text
              if (typeof logsRes.data === 'string') {
                pastLogs = logsRes.data.split('\n');
              } 
              // If backend wraps it in { data: "..." }
              else if (logsRes.data?.data) {
                pastLogs = typeof logsRes.data.data === 'string' ? logsRes.data.data.split('\n') : logsRes.data.data;
              }

              if (pastLogs.length > 0) {
                const formattedLogs = pastLogs.filter(l => l.trim()).map(l => ({
                  time: "--:--", 
                  message: l
                }));
                setLogs(formattedLogs);
              }
            } catch (logErr) {
              console.error("No historical logs found or failed to fetch.");
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch deployment details:", error);
      } finally {
        setIsLoadingDetails(false); 
      }
    };
    
    fetchDetails();
  }, [deploymentId]);

  useEffect(() => {
    if (!deploymentId || deploymentStatus === "READY" || deploymentStatus === "FAILED") return;

    const socket = io(ENV.BACKEND_URL, { withCredentials: true });

    socket.on("connect", () => { socket.emit("subscribe-to-logs", deploymentId); });

    socket.on("build-log", (rawMessage) => {
      try {
        const parsed = JSON.parse(rawMessage);
        if (parsed.statusUpdate) {
            setDeploymentStatus(parsed.statusUpdate === 'success' ? 'READY' : 'FAILED');
            setIsDeploying(false);
            if (parsed.statusUpdate === 'success') {
              setTimeout(() => setIsLogsOpen(false), 2000); 
            }
            return;
        }

        if (parsed.log) {
            const cleanLog = parsed.log.trim();
            if (!cleanLog) return; 
            const timestamp = new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' });
            setLogs((prev) => [...prev, { time: timestamp, message: cleanLog }]);
        }
      } catch (err) {}
    });

    return () => {
      socket.emit("unsubscribe-from-logs", deploymentId);
      socket.disconnect();
    };
  }, [deploymentId, deploymentStatus]);

  const liveUrl = deploymentData?.subdomain ? `http://${deploymentData.subdomain}.localhost:8000` : "#";

  return (
    <div className="flex flex-col min-h-screen bg-background overflow-x-hidden scroll-smooth">
      {/* Topbar */}
      <nav className="sticky top-0 z-30 h-14 border-b border-foreground/10 bg-background/80 backdrop-blur-md px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </button>
        </div>
        <span className="text-sm font-medium">New Project</span>
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full overflow-hidden bg-foreground/10 border border-foreground/10">
            {user?.avatarUrl && <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />}
          </div>
        </div>
      </nav>

      {/* --- PAGE 1: CONFIGURATION --- */}
      <div className="p-6 lg:p-10 flex justify-center min-h-[calc(100vh-3.5rem)] pb-20">
        <div className="w-full max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className={`bg-[#0a0a0a] border border-foreground/10 rounded-xl overflow-hidden shadow-2xl transition-opacity duration-500 ${deploymentId ? 'opacity-50 pointer-events-none' : ''}`}>
            
            <div className="p-8 border-b border-foreground/10">
              <h1 className="text-2xl font-semibold mb-6">New Project</h1>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground font-mono">Importing from GitHub</span>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <FaGithub className="w-4 h-4" />
                  <span>{repoOwner}/{repoName}</span>
                  <span className="flex items-center gap-1 text-muted-foreground font-mono text-xs ml-2 bg-foreground/5 px-2 py-0.5 rounded cursor-default">
                    <GitBranch className="w-3 h-3" /> {branch}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-8 space-y-8">
              <p className="text-sm text-muted-foreground">Choose where you want to create the project and give it a name.</p>
              {error && <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-lg">{error}</div>}

              <div className="space-y-2">
                <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Production Branch</label>
                <div className="relative">
                  {isLoadingBranches ? (
                    <div className="w-full bg-background border border-foreground/10 rounded-md pl-9 pr-3 py-2 text-sm font-mono text-muted-foreground flex items-center">
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading branches...
                    </div>
                  ) : branches.length > 0 ? (
                    <>
                      <select value={branch} onChange={(e) => setBranch(e.target.value)} className="w-full bg-background border border-foreground/10 rounded-md pl-9 pr-8 py-2 text-sm outline-none focus:border-foreground/30 transition-colors font-mono appearance-none">
                        {branches.map(b => ( <option key={b.name} value={b.name}>{b.name}</option> ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    </>
                  ) : (
                    <input type="text" value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="main or master" className="w-full bg-background border border-foreground/10 rounded-md pl-9 pr-3 py-2 text-sm outline-none focus:border-foreground/30 transition-colors font-mono" />
                  )}
                  <GitBranch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Project Name</label>
                <input type="text" value={projectName} onChange={(e) => setProjectName(e.target.value)} className="w-full bg-background border border-foreground/10 rounded-md px-3 py-2 text-sm outline-none" />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Framework Preset</label>
                <div className="flex items-center justify-between w-full bg-background border border-foreground/10 rounded-md px-3 py-2 text-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded bg-foreground/5 flex items-center justify-center"><div className="w-2 h-2 rounded-full bg-muted-foreground" /></div>
                    <span>{framework === "VITE" ? "Vite / React" : framework}</span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Root Directory</label>
                <div className="relative">
                  <input type="text" value={rootDirectory} className="w-full bg-background border border-foreground/10 rounded-md pl-3 pr-16 py-2 text-sm outline-none font-mono" readOnly />
                  <button onClick={handleOpenExplorer} className="absolute right-1 top-1 bottom-1 px-3 bg-foreground/5 hover:bg-foreground/10 rounded text-xs border border-foreground/10">Edit</button>
                </div>
              </div>
            </div>

            <div className="p-8 border-t border-foreground/10 bg-foreground/[0.02]">
              <button onClick={handleDeploy} disabled={isDeploying || deploymentId} className="w-full py-3 bg-foreground text-background font-semibold rounded-md hover:bg-foreground/90 transition-all active:scale-[0.98] flex justify-center items-center gap-2">
                {isDeploying ? (<><Loader2 className="w-5 h-5 animate-spin" /> Deploying...</>) : deploymentId ? "Deployed" : "Deploy"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* --- PAGE 2: DEPLOYMENT STATUS (Smaller & Centered layout) --- */}
      {deploymentId && (
        <div ref={deploymentSectionRef} className="p-6 lg:p-10 max-w-4xl mx-auto w-full flex flex-col gap-6 min-h-[calc(100vh-3.5rem)] pb-20 animate-in fade-in slide-in-from-bottom-8 duration-700">
          
          {isLoadingDetails ? (
            /* 🚨 LOADING SKELETONS */
            <>
              <div className="w-full h-[450px] bg-[#0a0a0a] border border-foreground/5 rounded-xl animate-pulse"></div>
              <div className="w-full h-32 bg-[#0a0a0a] border border-foreground/5 rounded-xl animate-pulse"></div>
              <div className="w-full h-14 bg-[#0a0a0a] border border-foreground/5 rounded-xl animate-pulse"></div>
            </>
          ) : (
            /* 🚨 LOADED UI */
            <>
              {/* 1. Live Preview - Now max-w-4xl, slightly shorter, centered nicely */}
              <div className="bg-[#0a0a0a] border border-foreground/10 rounded-xl overflow-hidden shadow-2xl flex flex-col h-[450px] w-full relative group transition-all duration-500">
                <div className="p-3 border-b border-foreground/10 flex items-center gap-2 bg-foreground/[0.02]">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-mono text-muted-foreground flex-1">Live Preview</span>
                  {deploymentStatus === "READY" && (
                     <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-xs font-mono text-green-500">Online</span>
                     </div>
                  )}
                </div>
                
                {deploymentStatus === "READY" && liveUrl !== "#" ? (
                  <div className="flex-1 relative bg-white overflow-hidden">
                    <iframe src={liveUrl} title="Live Preview" className="absolute top-0 left-0 w-[200%] h-[200%] scale-50 origin-top-left border-0 pointer-events-none bg-white" />
                    <a href={liveUrl} target="_blank" rel="noopener noreferrer" className="absolute inset-0 z-10 bg-background/0 group-hover:bg-background/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <button className="px-6 py-3 bg-foreground text-background text-sm font-medium rounded-full shadow-2xl flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                        Open Fullscreen <ExternalLink className="w-4 h-4" />
                      </button>
                    </a>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center bg-foreground/[0.01]">
                    {deploymentStatus === "FAILED" ? (
                       <>
                         <XCircle className="w-12 h-12 text-red-500/50 mb-4" />
                         <span className="text-sm text-red-500 font-medium">Build Failed. Check logs below.</span>
                       </>
                    ) : (
                       <>
                         <Loader2 className="w-10 h-10 text-blue-500/50 animate-spin mb-4" />
                         <span className="text-sm text-muted-foreground animate-pulse font-mono tracking-widest uppercase">Building Environment...</span>
                       </>
                    )}
                  </div>
                )}
              </div>

              {/* 2. Status Card */}
              <div className="bg-[#0a0a0a] border border-foreground/10 rounded-xl p-6 shadow-sm w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  {deploymentStatus === "BUILDING" || deploymentStatus === "QUEUED" ? (
                    <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20"><Loader2 className="w-6 h-6 text-blue-500 animate-spin" /></div>
                  ) : deploymentStatus === "READY" ? (
                    <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20"><CheckCircle2 className="w-6 h-6 text-green-500" /></div>
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20"><XCircle className="w-6 h-6 text-red-500" /></div>
                  )}
                  <div>
                    <h2 className="text-lg font-semibold capitalize leading-none mb-1">{deploymentStatus.toLowerCase()}</h2>
                    <span className="text-xs text-muted-foreground font-mono">Deployment #{deploymentId}</span>
                  </div>
                </div>

                <div className="flex items-center gap-6 flex-wrap">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-mono">Domains</span>
                    {deploymentStatus === "READY" ? (
                      <a href={liveUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-400 hover:underline flex items-center gap-1.5">
                        {deploymentData?.subdomain}.localhost:8000 <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-sm text-muted-foreground italic">Assigning...</span>
                    )}
                  </div>

                  <div className="w-px h-8 bg-foreground/10 hidden sm:block"></div>

                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-mono">Commit</span>
                    <div className="flex items-center gap-2 text-sm">
                      <GitCommit className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs font-mono bg-foreground/10 px-1.5 rounded text-muted-foreground">
                        {deploymentData?.commitHash ? deploymentData.commitHash.substring(0, 7) : "---"}
                      </span>
                    </div>
                  </div>
                </div>

                {deploymentStatus === "READY" && (
                  <button onClick={() => navigate("/dashboard")} className="px-5 py-2.5 bg-foreground text-background hover:bg-foreground/90 rounded-lg text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap">
                    <LayoutDashboard className="w-4 h-4" /> Go to Dashboard
                  </button>
                )}
              </div>

              {/* 3. Logs Accordion Dropdown (With smart auto-scroll!) */}
              <div ref={logsHeaderRef} className="bg-[#0a0a0a] border border-foreground/10 rounded-xl shadow-xl flex flex-col overflow-hidden w-full transition-all duration-300">
                <div 
                  onClick={handleToggleLogs}
                  className="flex items-center justify-between p-4 bg-foreground/[0.02] hover:bg-foreground/[0.04] cursor-pointer transition-colors select-none"
                >
                  <div className="flex items-center gap-3">
                    <Terminal className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm font-semibold">Build Logs</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-foreground/10 font-mono text-muted-foreground">{logs.length} lines</span>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-300 ${isLogsOpen ? "rotate-180" : ""}`} />
                </div>
                
                <div className={`transition-all duration-500 ease-in-out ${isLogsOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0 overflow-hidden"}`}>
                  <div className="h-[400px] p-4 overflow-y-auto font-mono text-xs sm:text-sm space-y-1.5 bg-[#000000] border-t border-foreground/10">
                    {logs.length === 0 && deploymentStatus === "BUILDING" && <div className="text-muted-foreground/50 italic">Waiting for connection to build container...</div>}
                    {logs.length === 0 && (deploymentStatus === "READY" || deploymentStatus === "FAILED") && <div className="text-muted-foreground/50 italic">No historical logs found.</div>}
                      {logs.map((log, i) => (
                        <div key={i} className="flex items-start gap-4 hover:bg-foreground/5 py-0.5 px-2 rounded -mx-2 transition-colors group">
                          <span className="text-muted-foreground/50 shrink-0 select-none w-16">{log.time}</span>
                          <span className="text-foreground/90 break-all whitespace-pre-wrap">
                            <Ansi>{log.message}</Ansi>
                          </span>
                        </div>
                      ))}
                    <div ref={logsEndRef} />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* --- EXPLORER MODAL --- */}
      {isExplorerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[#0a0a0a] border border-foreground/10 rounded-xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-foreground/10 bg-foreground/[0.02]">
              <div className="flex items-center gap-2">
                <Folder className="w-5 h-5 text-muted-foreground" />
                <h3 className="font-semibold text-sm">Select Root Directory</h3>
              </div>
              <button onClick={() => setIsExplorerOpen(false)} className="p-1.5 rounded-md hover:bg-foreground/10 text-muted-foreground transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-4 py-3 border-b border-foreground/5 bg-foreground/[0.01] flex items-center gap-2 text-sm font-mono overflow-x-auto whitespace-nowrap scrollbar-hide">
              <span className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors" onClick={() => handleNavigateDir("")}>{repoName}</span>
              {explorerPath.split("/").filter(Boolean).map((segment, idx, arr) => {
                const buildPath = arr.slice(0, idx + 1).join("/");
                return (
                  <span key={buildPath} className="flex items-center gap-2">
                    <span className="text-muted-foreground">/</span>
                    <span className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors" onClick={() => handleNavigateDir(buildPath)}>{segment}</span>
                  </span>
                );
              })}
            </div>
            <div className="flex-1 overflow-y-auto p-2 min-h-[300px]">
              {isLoadingContents ? (
                <div className="w-full h-full flex items-center justify-center min-h-[300px]"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
              ) : explorerContents.length === 0 ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground mt-20"><Folder className="w-12 h-12 mb-3 opacity-20" /><span className="text-sm">Empty directory</span></div>
              ) : (
                <div className="space-y-1">
                  {explorerPath && (
                    <div onClick={() => handleNavigateDir(explorerPath.split("/").slice(0, -1).join("/"))} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-foreground/5 cursor-pointer transition-colors text-sm">
                      <ArrowLeft className="w-4 h-4 text-muted-foreground" /><span className="font-mono text-muted-foreground">..</span>
                    </div>
                  )}
                  {explorerContents.sort((a, b) => { if (a.type === b.type) return a.name.localeCompare(b.name); return a.type === "dir" ? -1 : 1; }).map((item) => (
                    <div key={item.sha} onClick={() => item.type === "dir" && handleNavigateDir(item.path)} className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors text-sm ${item.type === "dir" ? "hover:bg-foreground/5 cursor-pointer" : "opacity-60 cursor-default"}`}>
                      <div className="flex items-center gap-3">
                        {item.type === "dir" ? <Folder className="w-4 h-4 text-blue-400" /> : <File className="w-4 h-4 text-muted-foreground" />}
                        <span className="font-mono truncate max-w-[300px]">{item.name}</span>
                      </div>
                      {item.type === "dir" && <ChevronRight className="w-4 h-4 text-muted-foreground opacity-50" />}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-foreground/10 bg-foreground/[0.02] flex items-center justify-between">
              <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">Selected:</span><span className="text-xs font-mono bg-foreground/10 px-2 py-1 rounded">{explorerPath ? `./${explorerPath}` : "./"}</span></div>
              <div className="flex items-center gap-2">
                <button onClick={() => setIsExplorerOpen(false)} className="px-4 py-2 text-sm font-medium hover:bg-foreground/5 text-muted-foreground rounded-lg transition-colors">Cancel</button>
                <button onClick={handleSelectDir} className="px-4 py-2 text-sm font-medium bg-foreground text-background rounded-lg hover:bg-foreground/90 transition-colors">Select Directory</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}