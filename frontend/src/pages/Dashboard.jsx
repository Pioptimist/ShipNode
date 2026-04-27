import { Outlet } from "react-router-dom";
import { Sidebar } from "../components/dashboard/Sidebar";
import { Topbar } from "../components/dashboard/Topbar";

export default function DashboardLayout() {
  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden selection:bg-foreground/20">
      <Sidebar />
      
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        <Topbar />
        
        {/* Scrollable Workspace */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-[1600px] mx-auto">
            {/* The actual page content (like the Project Grid) will render here via React Router */}
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}