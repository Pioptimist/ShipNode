import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { 
  Terminal, Loader2, GitCommit, CheckCircle2, 
  XCircle, ChevronRight, Globe, ExternalLink, LayoutDashboard, History, Circle 
} from "lucide-react";
import axiosInstance from "../utils/axiosInstance";
import { API_PATHS } from "../utils/apiPaths";
import { ENV } from "../utils/env.ts";
import AnsiModule from "ansi-to-react";

const Ansi = AnsiModule.default || AnsiModule;

export default function ProjectLogs() {
  const { id: projectId } = useParams(); 
  const navigate = useNavigate();
  
  // --- STATE ---
  const [deployments, setDeployments] = useState([]);
  const [project, setProject] = useState(null);
  const [isLoadingList, setIsLoadingList] = useState(true);

  const [deploymentId, setDeploymentId] = useState(null);
  const [deploymentStatus, setDeploymentStatus] = useState("BUILDING"); 
  const [deploymentData, setDeploymentData] = useState(null);
  const [logs, setLogs] = useState([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isLogsOpen, setIsLogsOpen] = useState(true);
  
  // --- REFS ---
  const logsEndRef = useRef(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // 1. Fetch Deployments and Project Info
  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingList(true);
      try {
        const [depRes, projRes] = await Promise.all([
          axiosInstance.get(API_PATHS.DEPLOYMENTS.GET_DEPLOYMENTS(projectId)),
          axiosInstance.get(API_PATHS.PROJECTS.GET_ONE(projectId))
        ]);

        if (depRes.data?.success && depRes.data.data.length > 0) {
          const deps = depRes.data.data;
          setDeployments(deps);
          // Set initial selection to most recent
          setDeploymentId(deps[0].id);
        }
        if (projRes.data?.success) {
          setProject(projRes.data.data);
        }
      } catch (error) {
        console.error("Failed to fetch project and deployments", error);
      } finally {
        setIsLoadingList(false);
      }
    };
    fetchData();
  }, [projectId]);

  // 2. Fetch Detailed Data for Selected Deployment
  useEffect(() => {
    if (!deploymentId) return;
    
    const fetchDetails = async () => {
      setIsLoadingDetails(true); 
      setLogs([]);
      
      try {
        const res = await axiosInstance.get(API_PATHS.DEPLOYMENTS.GET_STATUS(deploymentId));
        if (res.data?.success) {
          setDeploymentData(res.data.data);
          setDeploymentStatus(res.data.data.status); 
          
          if (res.data.data.status !== "BUILDING" && res.data.data.status !== "QUEUED") {
            try {
              const logsRes = await axiosInstance.get(API_PATHS.DEPLOYMENTS.GET_LOGS(deploymentId));
              let pastLogs = [];
              if (typeof logsRes.data === 'string') {
                pastLogs = logsRes.data.split('\n');
              } else if (logsRes.data?.data) {
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

  // 3. Socket Event Listener
  useEffect(() => {
    if (!deploymentId || deploymentStatus === "READY" || deploymentStatus === "FAILED") return;

    const socket = io(ENV.BACKEND_URL, { withCredentials: true });
    socket.on("connect", () => { socket.emit("subscribe-to-logs", deploymentId); });

    socket.on("build-log", (rawMessage) => {
      try {
        const parsed = JSON.parse(rawMessage);
        
        if (parsed.statusUpdate) {
            const newStatus = parsed.statusUpdate === 'success' ? 'READY' : 'FAILED';
            setDeploymentStatus(newStatus);
            setDeployments(prev => prev.map(d => 
                d.id === deploymentId ? { ...d, status: newStatus } : d
            ));
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

  // Helper check for active deployment versus preview
  const isActiveDeployment = project?.activeDeploymentId === deploymentId;
  const deploymentUrl = deploymentData?.subdomain 
    ? (isActiveDeployment 
        ? `http://${project.subdomain}.${import.meta.env.VITE_PLATFORM_DOMAIN}` 
        : `http://${deploymentData.previewUrl}.${import.meta.env.VITE_PLATFORM_DOMAIN}`) 
    : "#";

  return (
    <div className="max-w-7xl mx-auto flex gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 font-sans pb-8 h-[calc(100vh-6rem)]">
      
      {/* LEFT PANE: Deployment History List */}
      <div className="w-80 flex flex-col bg-[#000000] border border-foreground/10 rounded-xl overflow-hidden shadow-sm shrink-0">
        <div className="p-4 border-b border-foreground/10 bg-white/5 flex items-center justify-between">
          <h3 className="font-semibold text-sm">Deployments</h3>
          <span className="text-xs text-muted-foreground font-mono">{deployments.length} total</span>
        </div>
        
        <div className="flex-1 overflow-y-auto divide-y divide-foreground/5 p-2 space-y-1 select-none">
          {isLoadingList ? (
            <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : deployments.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">No deployments found.</div>
          ) : (
            deployments.map((dep) => {
              const isSelected = deploymentId === dep.id;
              return (
                <button 
                  key={dep.id}
                  onClick={() => setDeploymentId(dep.id)}
                  className={`w-full text-left p-3 rounded-lg flex items-start gap-3 transition-colors ${
                    isSelected 
                      ? "bg-foreground/10 border border-foreground/20" 
                      : "hover:bg-foreground/5 border border-transparent"
                  }`}
                >
                  <div className="mt-0.5">
                    {dep.status === "READY" ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : 
                     dep.status === "FAILED" ? <XCircle className="w-4 h-4 text-red-500" /> : 
                     <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
                  </div>
                  <div className="flex-1 flex flex-col min-w-0">
                    <div className="flex items-center justify-between mb-1">
                       <span className="text-sm font-semibold truncate">#{dep.id} {dep.branch}</span>
                       <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                         {new Date(dep.createdAt).toLocaleDateString()}
                       </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
                      <div className="flex items-center gap-1">
                        <GitCommit className="w-3 h-3" />
                        {dep.commitHash ? dep.commitHash.substring(0, 7) : "---"}
                      </div>
                      {dep.id === project?.activeDeploymentId && (
                        <span className="text-[9px] bg-green-500/10 text-green-500 px-1 rounded uppercase tracking-wider font-sans">prod</span>
                      )}
                    </div>
                  </div>
                  {isSelected && <ChevronRight className="w-4 h-4 text-muted-foreground self-center" />}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT PANE: Status panel and Logs Terminal */}
      <div className="flex-1 flex flex-col gap-4 overflow-hidden min-w-0">
        
        {/* Top Status Header */}
        <div className="bg-[#0a0a0a] border border-foreground/10 rounded-xl p-5 shadow-sm w-full flex items-center justify-between gap-6 shrink-0 h-28">
            <div className="flex items-center gap-4">
                {deploymentStatus === "BUILDING" || deploymentStatus === "QUEUED" ? (
                <div className="w-11 h-11 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20"><Loader2 className="w-5 h-5 text-blue-500 animate-spin" /></div>
                ) : deploymentStatus === "READY" ? (
                <div className="w-11 h-11 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20"><CheckCircle2 className="w-5 h-5 text-green-500" /></div>
                ) : (
                <div className="w-11 h-11 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20"><XCircle className="w-5 h-5 text-red-500" /></div>
                )}
                <div>
                <h2 className="text-md font-semibold capitalize leading-none mb-1">{deploymentStatus.toLowerCase()}</h2>
                <span className="text-xs text-muted-foreground font-mono">Deployment #{deploymentId || "---"}</span>
                </div>
            </div>

            <div className="flex items-center gap-6">
                <div className="flex flex-col gap-0.5 text-right">
                   <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">Type</span>
                   <span className="text-xs font-medium text-foreground">
                      {isActiveDeployment ? (
                        <span className="flex items-center justify-end gap-1 text-green-500 font-sans uppercase text-[10px]">
                          <Circle className="w-2 h-2 fill-current" /> Production
                        </span>
                      ) : (
                        <span className="flex items-center justify-end gap-1 text-muted-foreground font-sans uppercase text-[10px]">
                          <Circle className="w-2 h-2" /> Preview
                        </span>
                      )}
                   </span>
                </div>
                
                {deploymentStatus === "READY" && deploymentUrl !== "#" && (
                  <a href={deploymentUrl} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-foreground text-background rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 shrink-0 hover:opacity-90">
                     Visit <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
            </div>
        </div>

        {/* Build Logs Terminal with Toggle Container */}
        <div className="bg-[#0a0a0a] border border-foreground/10 rounded-xl shadow-xl flex flex-col overflow-hidden w-full flex-1 min-h-0">
          
          {/* Terminal Controls */}
          <div 
            onClick={() => setIsLogsOpen(!isLogsOpen)}
            className="flex items-center justify-between p-3 bg-foreground/[0.02] border-b border-foreground/10 select-none cursor-pointer hover:bg-foreground/5 shrink-0"
          >
            <div className="flex items-center gap-3">
              <Terminal className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-bold uppercase tracking-wider">Build Logs</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-foreground/10 font-mono text-muted-foreground">{logs.length} lines</span>
            </div>
            <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${isLogsOpen ? "rotate-90" : ""}`} />
          </div>
          
          {/* Terminal Logs View */}
          <div className={`transition-all duration-500 ease-in-out flex-1 ${isLogsOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0 overflow-hidden"}`}>
            <div className="h-[360px] p-4 overflow-y-auto font-mono text-xs space-y-1 bg-[#000000] border-t border-foreground/10">
              {isLoadingDetails ? (
                 <div className="flex items-center gap-2 text-muted-foreground/50 italic h-full justify-center">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Fetching deployment details...
                 </div>
              ) : !deploymentId ? (
                 <div className="text-muted-foreground/50 italic text-center mt-12">Select a deployment to view logs.</div>
              ) : logs.length === 0 && deploymentStatus === "BUILDING" ? (
                 <div className="text-muted-foreground/50 italic">Waiting for connection to build container...</div>
              ) : logs.length === 0 && (deploymentStatus === "READY" || deploymentStatus === "FAILED") ? (
                 <div className="text-muted-foreground/50 italic">No historical logs found for this deployment.</div>
              ) : (
                  logs.map((log, i) => (
                  <div key={i} className="flex items-start gap-4 hover:bg-foreground/5 py-0.5 px-2 rounded -mx-2 transition-colors group">
                      <span className="text-muted-foreground/50 shrink-0 select-none w-14">{log.time}</span>
                      <span className="text-foreground/80 break-all whitespace-pre-wrap">
                        <Ansi>{log.message}</Ansi>
                      </span>
                  </div>
                  ))
              )}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}