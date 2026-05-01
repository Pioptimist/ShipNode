import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "../components/dashboard/Sidebar";
import { Topbar } from "../components/dashboard/Topbar";

export default function AppLayout() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden selection:bg-foreground/20">
      <Sidebar />
      
      <main className="flex-1 flex flex-col relative overflow-hidden">
        <Topbar 
          searchQuery={searchQuery} 
          setSearchQuery={setSearchQuery} 
        />
        
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-[1600px] mx-auto">
            <Outlet context={{ searchQuery }} />
          </div>
        </div>
      </main>
    </div>
  );
}