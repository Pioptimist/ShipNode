import { Loader2, AlertTriangle, X } from "lucide-react";

export function RemoveDomainModal({ isOpen, onClose, onConfirm, domainName, isDeleting }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#000000] border border-foreground/10 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 font-sans">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-foreground/10 flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-500">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="text-lg font-semibold tracking-tight text-foreground">Disconnect Domain</h3>
          </div>
          <button 
            onClick={onClose}
            disabled={isDeleting}
            className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to disconnect <strong className="text-foreground">{domainName}</strong>? 
            Traffic to this domain will stop routing to your project immediately, and you will need to re-verify it if you add it again.
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-foreground/10 bg-foreground/5 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-foreground hover:bg-foreground/10 rounded-md transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 rounded-md transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
            Disconnect Domain
          </button>
        </div>
      </div>
    </div>
  );
}