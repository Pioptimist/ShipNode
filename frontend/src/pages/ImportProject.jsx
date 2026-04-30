import { useEffect, useState } from "react";
import { FaGithub } from "react-icons/fa";
import { Search, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";
import { API_PATHS } from "../utils/apiPaths";
import { AnimatedWalkthrough } from "../components/AnimatedWalkthrough";

export default function ImportProject() {
  const [repos, setRepos] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchRepos() {
      try {
        const response = await axiosInstance.get(API_PATHS.GITHUB.GET_REPOS);
        let fetchedRepos = [];
        if (response.data?.success && Array.isArray(response.data.data)) {
          fetchedRepos = response.data.data;
        } else if (Array.isArray(response.data)) {
          fetchedRepos = response.data;
        }
        setRepos(fetchedRepos);
      } catch (error) {
        console.error("Failed to fetch repositories:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchRepos();
  }, []);

  const handleImport = (repoName) => {
    navigate(`/new?repo=${encodeURIComponent(repoName)}`);
  };

  // 🚨 Restricting to exactly 5 repos, no more
  const filteredRepos = repos
    .filter((repo) => repo.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .slice(0, 5); 

  return (
    <div className="max-w-[1200px] mx-auto mt-12 mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500 font-sans">
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-3">
          Let's build something new.
        </h1>
        <p className="text-muted-foreground text-sm">
          To deploy a new Project, select an existing Git Repository to get started.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 border-t border-foreground/10 pt-8">
        
        {/* LEFT COLUMN: Exactly matching EmptyProjectState UI */}
        <div className="border border-foreground/10 bg-background/50 backdrop-blur-sm rounded-xl overflow-hidden shadow-sm h-fit">
          <div className="p-6 border-b border-foreground/10">
            <h3 className="text-lg font-medium flex items-center gap-2 mb-4">
              <FaGithub className="w-5 h-5" />
              Import Git Repository
            </h3>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search your repositories..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-foreground/5 border border-foreground/10 rounded-lg pl-10 pr-4 py-2 text-sm outline-none focus:border-foreground/30 transition-colors"
              />
            </div>
          </div>

          <div className="divide-y divide-foreground/5 min-h-[150px] relative">
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center min-h-[200px]">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredRepos.length > 0 ? (
              filteredRepos.map((repo, idx) => (
                <div key={idx} className="p-4 flex items-center justify-between hover:bg-foreground/5 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-foreground/10 flex items-center justify-center">
                      <FaGithub className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex flex-col text-left">
                      <p className="text-sm font-medium">{repo.name}</p>
                      <p className="text-xs text-muted-foreground">{new Date(repo.updatedAt || repo.updated_at || Date.now()).toLocaleDateString()}</p>
                    </div>
                  </div>
                  {/* The slick slide-in hover button */}
                  <button 
                    onClick={() => handleImport(repo.name)}
                    className="px-4 py-1.5 bg-foreground/10 hover:bg-foreground text-foreground hover:text-background rounded-md text-sm font-medium transition-all opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 cursor-pointer shrink-0"
                  >
                    Import
                  </button>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-muted-foreground text-sm">
                {searchTerm ? "No repositories match your search." : "No repositories found."}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: The Animated Walkthrough */}
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold tracking-tight mb-2">How it works</h2>
          <AnimatedWalkthrough />
        </div>

      </div>
    </div>
  );
}