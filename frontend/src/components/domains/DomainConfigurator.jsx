import { useState } from "react";
import { Loader2, CheckCircle2, AlertCircle, Copy, ArrowLeft, Trash2 } from "lucide-react";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { RemoveDomainModal } from "../modals/RemoveDomainModal"; // Import your new modal

export function DomainConfigurator({ project, onBack }) {
  const initialState = project.domainVerified 
    ? "verified" 
    : project.customDomain 
      ? "pending" 
      : "none";

  const [status, setStatus] = useState(initialState);
  const [domainInput, setDomainInput] = useState("");
  const [customDomain, setCustomDomain] = useState(project.customDomain || "");
  const [verificationToken, setVerificationToken] = useState(project.domainVerificationToken || "");
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // 🚨 SMART BACK BUTTON: Cleanup DB if they abandon a pending domain
  const handleBack = async () => {
    if (status === "pending") {
      try {
        await axiosInstance.delete(API_PATHS.PROJECTS.REMOVE_DOMAIN(project.id));
      } catch (err) {
        console.error("Silent cleanup failed:", err);
      }
    }
    onBack();
  };

  const handleAddDomain = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await axiosInstance.post(API_PATHS.PROJECTS.ADD_DOMAIN(project.id), {
        domain: domainInput,
      });

      if (res.data?.success) {
        setCustomDomain(res.data.data.customDomain);
        setVerificationToken(res.data.data.verificationToken);
        setStatus("pending");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add domain.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    setIsLoading(true);
    setError("");

    try {
      const res = await axiosInstance.post(API_PATHS.PROJECTS.VERIFY_DOMAIN(project.id));
      if (res.data?.success) {
        setStatus("verified");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Verification failed. DNS might still be propagating.");
    } finally {
      setIsLoading(false);
    }
  };

  // 🚨 REVISED: Actual execution of the deletion
  const executeRemove = async () => {
    setIsDeleting(true);
    setError("");
    
    try {
      await axiosInstance.delete(API_PATHS.PROJECTS.REMOVE_DOMAIN(project.id));
      
      setStatus("none");
      setCustomDomain("");
      setVerificationToken("");
      setDomainInput("");
      setIsModalOpen(false); // Close modal on success
    } catch (err) {
      setError("Failed to remove domain.");
      setIsModalOpen(false); // Close modal on failure so user sees error
    } finally {
      setIsDeleting(false);
      setIsLoading(false); // Reset main loading state just in case
    }
  };

  // Cancel from Pending (Silent Delete, no scary modal needed)
  const handleCancelPending = async () => {
    setIsLoading(true);
    await executeRemove();
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <>
      <div className="space-y-6">
        <button 
          onClick={handleBack}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Projects
        </button>

        <div className="border border-foreground/10 bg-background/50 backdrop-blur-sm rounded-xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-foreground/10">
            <h3 className="text-lg font-medium">Domain Routing</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Connect a custom domain to point to your Shipnode deployment.
            </p>
          </div>

          <div className="p-6">
            {/* STATE: NONE (Input Form) */}
            {status === "none" && (
              <form onSubmit={handleAddDomain} className="space-y-4">
                <div className="flex space-x-3">
                  <input
                    type="text"
                    value={domainInput}
                    onChange={(e) => setDomainInput(e.target.value)}
                    placeholder="e.g. api.my-startup.com"
                    className="flex-1 bg-foreground/5 border border-foreground/10 rounded-lg px-4 py-2 text-sm outline-none focus:border-foreground/30 transition-colors"
                    required
                  />
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="bg-foreground text-background px-4 py-2 rounded-lg text-sm font-medium hover:bg-foreground/90 transition-colors disabled:opacity-50"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Domain"}
                  </button>
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
              </form>
            )}

            {/* STATE: PENDING (DNS Instructions) */}
            {status === "pending" && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-foreground">{customDomain}</h3>
                    <div className="flex items-center mt-1 text-amber-500 text-sm font-medium">
                      <AlertCircle className="w-4 h-4 mr-1.5" />
                      Pending DNS Verification
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={handleCancelPending} 
                      disabled={isLoading}
                      className="px-4 py-2 border border-foreground/10 text-muted-foreground rounded-lg text-sm font-medium hover:bg-foreground/5 transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleVerify}
                      disabled={isLoading}
                      className="flex items-center px-4 py-2 bg-foreground text-background rounded-lg text-sm font-medium hover:bg-foreground/90 transition-colors disabled:opacity-50"
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Verify Now"}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-lg">
                    {error}
                  </div>
                )}

                {/* DNS Instructions Block */}
                <div className="bg-foreground/5 rounded-lg border border-foreground/10 overflow-hidden">
                  <div className="p-4 border-b border-foreground/10 bg-background/50">
                    <h4 className="font-medium text-sm">Add these records to your DNS provider</h4>
                  </div>
                  
                  <div className="p-4 space-y-4">
                    {/* TXT Record */}
                    <div>
                      <div className="flex text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                        <div className="w-24">Type</div>
                        <div className="w-24">Name</div>
                        <div className="flex-1">Value</div>
                      </div>
                      <div className="flex items-center bg-background border border-foreground/10 rounded-lg p-2.5 font-mono text-sm">
                        <div className="w-24">TXT</div>
                        <div className="w-24">@</div>
                        <div className="flex-1 flex items-center justify-between truncate">
                          <span className="truncate mr-4">{verificationToken}</span>
                          <button onClick={() => copyToClipboard(verificationToken)} className="text-muted-foreground hover:text-foreground">
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Routing Record */}
                    <div>
                      <div className="flex items-center bg-background border border-foreground/10 rounded-lg p-2.5 font-mono text-sm">
                        <div className="w-24">{customDomain.split('.').length > 2 ? 'CNAME' : 'A'}</div>
                        <div className="w-24">{customDomain.split('.').length > 2 ? customDomain.split('.')[0] : '@'}</div>
                        <div className="flex-1 flex items-center justify-between text-muted-foreground">
                          <span>{customDomain.split('.').length > 2 ? 'proxy.shipnode.online' : '198.51.100.24'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STATE: VERIFIED */}
            {status === "verified" && (
              <div className="flex items-center justify-between animate-in fade-in duration-500">
                <div>
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    {customDomain}
                  </h3>
                  <div className="flex items-center mt-1 text-green-500 text-sm font-medium">
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    Verified and Live
                  </div>
                  <a href={`https://${customDomain}`} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:underline mt-2 inline-block">
                    Visit site ↗
                  </a>
                </div>
                <button
                  onClick={() => setIsModalOpen(true)} // Open modal instead of window.confirm
                  disabled={isLoading || isDeleting}
                  className="flex items-center gap-2 px-4 py-2 border border-red-500/20 text-red-500 rounded-lg text-sm font-medium hover:bg-red-500/10 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Disconnect
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Render the Custom Modal */}
      <RemoveDomainModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={executeRemove}
        domainName={customDomain}
        isDeleting={isDeleting}
      />
    </>
  );
}