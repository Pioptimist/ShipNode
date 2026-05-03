import { useEffect } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

export function Toast({ message, type = "success", isVisible, onClose }) {
  // Auto-hide the toast after 3 seconds
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  const isSuccess = type === "success";

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg ${
        isSuccess 
          ? "bg-[#0a0a0a] border-green-500/20 text-green-500" 
          : "bg-[#0a0a0a] border-red-500/20 text-red-500"
      }`}>
        {isSuccess ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
        <p className="text-sm font-medium text-foreground pr-4">{message}</p>
        <button 
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors ml-auto"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}