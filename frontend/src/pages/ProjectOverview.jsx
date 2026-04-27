import { EmptyProjectState } from "../components/dashboard/EmptyProjectState";

export default function ProjectOverview() {
  // In the future, fetch projects here. For now, just show the empty state.
  const projects = [];

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Your Projects</h1>
      </div>
      
      {projects.length === 0 ? (
        <EmptyProjectState />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Project cards will go here */}
        </div>
      )}
    </div>
  );
}
