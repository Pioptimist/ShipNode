import { Mail, ShieldAlert, Key } from "lucide-react";
import { FaGithub, FaGoogle } from "react-icons/fa";
import { useAuth } from "../../context/useAuth";

export default function SecuritySettings() {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      
      {/* SIGN-IN METHODS */}
      <div className="border border-foreground/10 bg-[#000000] rounded-xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-foreground/10">
          <h2 className="text-xl font-semibold tracking-tight text-foreground mb-2">Sign-in Methods</h2>
          <p className="text-sm text-muted-foreground">
            Customize how you access your account. Link your Git profiles for seamless deployments.
          </p>
        </div>

        <div className="divide-y divide-foreground/10">
          {/* Email */}
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Mail className="w-6 h-6 text-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">Email</p>
                <p className="text-sm text-muted-foreground">{user?.email || "soumyodeep@example.com"}</p>
              </div>
            </div>
            <button className="px-4 py-1.5 border border-foreground/10 rounded-md text-sm font-medium hover:bg-foreground/5 transition-colors">
              Manage
            </button>
          </div>

          {/* Passkeys (Mock) */}
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Key className="w-6 h-6 text-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">Passkeys</p>
                <p className="text-sm text-muted-foreground">0 passkeys registered</p>
              </div>
            </div>
            <button className="px-4 py-1.5 bg-foreground text-background rounded-md text-sm font-medium hover:bg-foreground/90 transition-colors">
              Add
            </button>
          </div>

          {/* GitHub Connection */}
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <FaGithub className="w-6 h-6 text-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">GitHub</p>
                <p className="text-sm text-muted-foreground">Connected as {user?.username}</p>
              </div>
            </div>
            <span className="text-xs text-muted-foreground bg-foreground/5 px-2 py-1 rounded">Primary</span>
          </div>
        </div>
      </div>

      {/* TWO FACTOR WARNING */}
      <div className="border border-red-500/20 bg-red-500/5 rounded-xl overflow-hidden">
        <div className="p-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-1">Two-Factor Authentication</h2>
            <p className="text-sm text-muted-foreground">Protects your account by requiring a second factor at sign-in.</p>
          </div>
          <span className="px-3 py-1 bg-red-500/10 text-red-500 border border-red-500/20 text-xs font-medium rounded-full">
            Inactive
          </span>
        </div>
        <div className="px-6 py-3 bg-red-500/10 border-t border-red-500/20 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-red-500" />
          <span className="text-sm text-red-500 font-medium">It is strongly recommended to enable two-factor authentication.</span>
        </div>
      </div>

      {/* DANGER ZONE */}
      <div className="border border-red-500/50 bg-[#000000] rounded-xl overflow-hidden mt-12">
        <div className="p-6">
          <h2 className="text-xl font-semibold tracking-tight text-red-500 mb-2">Delete Account</h2>
          <p className="text-sm text-muted-foreground">
            Permanently remove your Personal Account and all of its contents from the Shipnode platform. This action is not reversible.
          </p>
        </div>
        <div className="px-6 py-4 border-t border-red-500/20 bg-red-500/5 flex justify-end">
          <button className="px-4 py-2 bg-red-500 text-white rounded-md text-sm font-medium hover:bg-red-600 transition-colors">
            Delete Personal Account
          </button>
        </div>
      </div>

    </div>
  );
}