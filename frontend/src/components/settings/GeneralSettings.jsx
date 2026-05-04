import { useState, useEffect } from "react";
import { Loader2, Check } from "lucide-react";
import { useAuth } from "../../context/useAuth";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";

const PREMIUM_SEEDS = [
  "Andrea", "Aneka", "Jack", "Midnight", "Jude", 
  "Leo", "Sasha", "Oliver", "Cleo", "Jasper",
  "Mia", "Apollo", "Ruby", "Finn", "Luna",
  "Oscar", "Chloe", "Milo", "Stella", "Max"
];

const BASE_URL = "https://api.dicebear.com/9.x/adventurer/svg";

const AVATAR_OPTIONS = PREMIUM_SEEDS.map(
  (seed) => `${BASE_URL}?seed=${seed}&backgroundColor=000000,1a1a1a&shape1Color=ffffff,666666`
);

export default function GeneralSettings() {
  // 🚨 THE FIX: Destructure `updateUser` instead of `setUser`
  const { user, updateUser } = useAuth(); 
  
  const [displayName, setDisplayName] = useState(user?.name || ""); 
  const [username, setUsername] = useState(user?.username || "");
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatarUrl || AVATAR_OPTIONS[0]);
  
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState("idle"); 
  
  // 🚨 SMART BUTTON STATE: Replaces the ugly Toast
  const [saveState, setSaveState] = useState({ section: null, status: "idle" }); 

  

  // Real Backend Debounce for Username check
  useEffect(() => {
    if (username === user?.username) {
      setUsernameStatus("idle");
      return;
    }
    if (username.length < 3) {
      setUsernameStatus("taken");
      return;
    }
    
    setIsCheckingUsername(true);
    setUsernameStatus("checking");
    
    const timeout = setTimeout(async () => {
      try {
        const res = await axiosInstance.get(API_PATHS.USERS.CHECK_USERNAME(username));
        setUsernameStatus(res.data.available ? "available" : "taken");
      } catch (error) {
        console.error("Failed to check username", error);
        setUsernameStatus("taken"); 
      } finally {
        setIsCheckingUsername(false);
      }
    }, 800);

    return () => clearTimeout(timeout);
  }, [username, user?.username]);

  // Dynamic Save Function with Inline Success States
  const handleSaveProfile = async (payload, sectionName) => {
    setSaveState({ section: sectionName, status: "saving" });

    try {
      const res = await axiosInstance.patch(API_PATHS.USERS.UPDATE_PROFILE, payload);
      
      if (res.data?.success) {
        // 🚨 Instantly merge new data into global context (Sidebar will update immediately!)
        if (updateUser) updateUser(res.data.data); 
        
        if (payload.username) setUsernameStatus("idle"); 
        
        // Trigger the green "Saved" state on the button
        setSaveState({ section: sectionName, status: "success" });
        setTimeout(() => {
          setSaveState({ section: null, status: "idle" });
        }, 2000);
      }
    } catch (error) {
      console.error("Failed to update profile", error);
      
      // Trigger the red "Error" state on the button
      setSaveState({ section: sectionName, status: "error" });
      setTimeout(() => {
        setSaveState({ section: null, status: "idle" });
      }, 3000);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      
      {/* AVATAR SETTINGS */}
      <div className="border border-foreground/10 bg-[#000000] rounded-xl overflow-hidden shadow-sm">
        <div className="p-6 flex flex-col md:flex-row gap-6 items-start justify-between">
          <div className="max-w-xl">
            <h2 className="text-xl font-semibold tracking-tight text-foreground mb-2">Avatar</h2>
            <p className="text-sm text-muted-foreground mb-6">
              This is your avatar. Choose from our premium abstract generated shapes.
            </p>
            
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-3">
              {AVATAR_OPTIONS.map((avatar, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedAvatar(avatar)}
                  className={`relative w-10 h-10 rounded-full overflow-hidden transition-all duration-200 ${
                    selectedAvatar === avatar 
                      ? "ring-2 ring-foreground ring-offset-2 ring-offset-background scale-110" 
                      : "opacity-60 hover:opacity-100 hover:scale-105"
                  }`}
                >
                  <img src={avatar} alt={`Avatar option ${idx}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
          
          <div className="shrink-0">
            <div className="w-24 h-24 rounded-full overflow-hidden border border-foreground/10 shadow-lg bg-foreground/5">
              <img src={selectedAvatar} alt="Selected Avatar" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-foreground/10 bg-foreground/5 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">An avatar is optional but strongly recommended.</p>
          <button 
            onClick={() => handleSaveProfile({ avatarUrl: selectedAvatar }, "avatar")} 
            disabled={saveState.status !== "idle" || selectedAvatar === user?.avatarUrl} 
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all min-w-[80px] flex justify-center items-center gap-2 ${
              saveState.section === "avatar" && saveState.status === "success" ? "bg-green-500/10 text-green-500 border border-green-500/20" :
              saveState.section === "avatar" && saveState.status === "error" ? "bg-red-500/10 text-red-500 border border-red-500/20" :
              "bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50"
            }`}
          >
            {saveState.section === "avatar" && saveState.status === "saving" ? <Loader2 className="w-4 h-4 animate-spin" /> : 
             saveState.section === "avatar" && saveState.status === "success" ? <><Check className="w-4 h-4"/> Saved</> : 
             saveState.section === "avatar" && saveState.status === "error" ? "Error" : "Save"}
          </button>
        </div>
      </div>

      {/* DISPLAY NAME */}
      <div className="border border-foreground/10 bg-[#000000] rounded-xl overflow-hidden shadow-sm">
        <div className="p-6">
          <h2 className="text-xl font-semibold tracking-tight text-foreground mb-2">Display Name</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Please enter your full name, or a display name you are comfortable with.
          </p>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full max-w-md bg-background border border-foreground/10 rounded-md px-3 py-2 text-sm outline-none focus:border-foreground/30 transition-colors"
          />
        </div>
        <div className="px-6 py-4 border-t border-foreground/10 bg-foreground/5 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Please use 32 characters at maximum.</p>
          <button 
            onClick={() => handleSaveProfile({ displayName }, "displayName")} 
            disabled={saveState.status !== "idle" || displayName === user?.name} 
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all min-w-[80px] flex justify-center items-center gap-2 ${
              saveState.section === "displayName" && saveState.status === "success" ? "bg-green-500/10 text-green-500 border border-green-500/20" :
              saveState.section === "displayName" && saveState.status === "error" ? "bg-red-500/10 text-red-500 border border-red-500/20" :
              "bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50"
            }`}
          >
            {saveState.section === "displayName" && saveState.status === "saving" ? <Loader2 className="w-4 h-4 animate-spin" /> : 
             saveState.section === "displayName" && saveState.status === "success" ? <><Check className="w-4 h-4"/> Saved</> : 
             saveState.section === "displayName" && saveState.status === "error" ? "Error" : "Save"}
          </button>
        </div>
      </div>

      {/* USERNAME / NAMESPACE */}
      <div className="border border-foreground/10 bg-[#000000] rounded-xl overflow-hidden shadow-sm">
        <div className="p-6">
          <h2 className="text-xl font-semibold tracking-tight text-foreground mb-2">Username</h2>
          <p className="text-sm text-muted-foreground mb-4">
            This is your URL namespace within Shipnode.
          </p>
          <div className="flex max-w-md">
            <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-foreground/10 bg-foreground/5 text-muted-foreground sm:text-sm">
              shipnode.online/
            </span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md bg-background border border-foreground/10 text-sm outline-none focus:border-foreground/30 transition-colors"
            />
          </div>
          
          <div className="mt-2 h-5 flex items-center text-sm">
            {usernameStatus === "checking" && <span className="text-muted-foreground flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin"/> Checking availability...</span>}
            {usernameStatus === "available" && <span className="text-green-500 flex items-center gap-1"><Check className="w-3 h-3"/> Username is available</span>}
            {usernameStatus === "taken" && <span className="text-red-500">Username is already taken or too short</span>}
          </div>
        </div>
        <div className="px-6 py-4 border-t border-foreground/10 bg-foreground/5 flex items-center justify-end">
          <button 
            onClick={() => handleSaveProfile({ username }, "username")} 
            disabled={usernameStatus === "taken" || usernameStatus === "checking" || saveState.status !== "idle" || username === user?.username} 
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all min-w-[80px] flex justify-center items-center gap-2 ${
              saveState.section === "username" && saveState.status === "success" ? "bg-green-500/10 text-green-500 border border-green-500/20" :
              saveState.section === "username" && saveState.status === "error" ? "bg-red-500/10 text-red-500 border border-red-500/20" :
              "bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50"
            }`}
          >
            {saveState.section === "username" && saveState.status === "saving" ? <Loader2 className="w-4 h-4 animate-spin" /> : 
             saveState.section === "username" && saveState.status === "success" ? <><Check className="w-4 h-4"/> Saved</> : 
             saveState.section === "username" && saveState.status === "error" ? "Error" : "Save"}
          </button>
        </div>
      </div>

    </div>
  );
}