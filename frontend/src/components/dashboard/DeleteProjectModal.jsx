import { useState, useEffect } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

export function DeleteProjectModal({ isOpen, onClose, onConfirm, project, isDeleting }) {
  const [verifyName, setVerifyName] = useState("");
  const [verifyPhrase, setVerifyPhrase] = useState("");

  // Reset inputs whenever the modal opens or closes
  useEffect(() => {
    if (!isOpen) {
      setVerifyName("");
      setVerifyPhrase("");
    }
  }, [isOpen]);

  if (!isOpen || !project) return null;

  // The button is only enabled if BOTH inputs match perfectly
  const isButtonDisabled = 
    verifyName !== project.name || 
    verifyPhrase !== "delete my project" || 
    isDeleting;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Modal Container */}
      <div className="bg-[#000000] border border-foreground/10 rounded-xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Body */}
        <div className="p-6 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-foreground tracking-tight">Delete Project</h2>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              This will permanently delete the project and related resources like Deployments, Domains and Environment Variables.
            </p>
          </div>

          {/* Inputs */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[13px] font-medium text-foreground flex gap-1">
                To confirm, type <span className="font-bold">"{project.name}"</span>
              </label>
              <input 
                type="text" 
                value={verifyName} 
                onChange={(e) => setVerifyName(e.target.value)}
                className="w-full bg-foreground/[0.03] border border-foreground/10 rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-foreground/30 transition-colors font-mono"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[13px] font-medium text-foreground flex gap-1">
                To confirm, type <span className="font-bold">"delete my project"</span>
              </label>
              <input 
                type="text" 
                value={verifyPhrase} 
                onChange={(e) => setVerifyPhrase(e.target.value)}
                className="w-full bg-foreground/[0.03] border border-foreground/10 rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-foreground/30 transition-colors font-mono"
              />
            </div>
          </div>

          {/* Warning Banner */}
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
            <span className="text-sm text-red-500 font-medium">
              Deleting {project.name} cannot be undone.
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-foreground/10 bg-foreground/[0.02] flex items-center justify-between">
          <button 
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-foreground/5 hover:bg-foreground/10 rounded-lg transition-colors"
          >
            Cancel
          </button>
          
          <button 
            onClick={() => onConfirm(project.id)}
            disabled={isButtonDisabled}
            className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
            Delete Project
          </button>
        </div>

      </div>
    </div>
  );
}