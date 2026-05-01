import { useState } from "react";
import { Loader2, GitBranch, History, AlertCircle, X } from "lucide-react";

export function RollbackModal({ isOpen, onClose, deployments, activeDeploymentId, onConfirm, isRollingBack }) {
  const [selectedId, setSelectedId] = useState(null);

  if (!isOpen) return null;

  // Only allow rolling back to successful deployments that aren't already active
  const validDeployments = deployments.filter(
    (d) => d.status === "READY" && d.id !== activeDeploymentId
  );

  const handleConfirm = () => {
    if (selectedId) onConfirm(selectedId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#000000] border border-foreground/10 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 font-sans">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-foreground/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-foreground" />
            <h3 className="text-lg font-semibold tracking-tight text-foreground">Instant Rollback</h3>
          </div>
          <button 
            onClick={onClose}
            disabled={isRollingBack}
            className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          <p className="text-sm text-muted-foreground mb-6">
            Select a previous deployment to instantly revert your production URL. This will not change your Git history or production branch settings.
          </p>

          {validDeployments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground bg-foreground/5 rounded-lg border border-foreground/10 border-dashed">
              <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">No valid past deployments available.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {validDeployments.map((dep) => (
                <button
                  key={dep.id}
                  onClick={() => setSelectedId(dep.id)}
                  disabled={isRollingBack}
                  className={`w-full text-left p-4 rounded-lg border transition-all flex flex-col gap-3 ${
                    selectedId === dep.id 
                      ? "border-foreground bg-foreground/5 shadow-sm" 
                      : "border-foreground/10 bg-[#0a0a0a] hover:border-foreground/30 hover:bg-foreground/5"
                  } disabled:opacity-50`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <GitBranch className="w-4 h-4 text-muted-foreground" />
                      {dep.branch}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(dep.createdAt).toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="font-mono bg-foreground/10 px-2 py-0.5 rounded text-foreground">
                      {dep.commitHash?.substring(0, 7) || "---"}
                    </span>
                    <span className="truncate flex-1">
                      {dep.commitMessage || "Deployment"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-foreground/10 bg-foreground/5 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isRollingBack}
            className="px-4 py-2 text-sm font-medium text-foreground hover:bg-foreground/10 rounded-md transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedId || isRollingBack}
            className="px-4 py-2 text-sm font-medium bg-foreground text-background hover:bg-foreground/90 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isRollingBack && <Loader2 className="w-4 h-4 animate-spin" />}
            Confirm Rollback
          </button>
        </div>
      </div>
    </div>
  );
}