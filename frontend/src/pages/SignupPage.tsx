import { FaGithub } from "react-icons/fa"; 
import { AnimatedWave } from "../components/landing/AnimatedWave";
import { Button } from "../components/ui/Button";
import { Link } from "react-router-dom";
import { ENV } from "../utils/env.ts";
import { API_PATHS } from "../utils/apiPaths.js";
export default function SignupPage() {
  const handleGithubSignup = () => {
 
    window.location.href = `${ENV.BACKEND_URL}${API_PATHS.AUTH.GITHUB_LOGIN}`; 
  };

  return (
    <div className="relative min-h-screen bg-background text-foreground flex items-center justify-center overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 opacity-[0.15] pointer-events-none">
        <AnimatedWave />
      </div>

      {/* Decorative Grid Lines */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `linear-gradient(to right, rgba(128,128,128,0.05) 1px, transparent 1px),
                          linear-gradient(to bottom, rgba(128,128,128,0.05) 1px, transparent 1px)`,
        backgroundSize: '4rem 4rem'
      }} />

      {/* Auth Card */}
      <div className="relative z-10 w-full max-w-md px-6">
        <div className="relative border border-foreground/10 bg-background/50 backdrop-blur-md rounded-3xl p-8 sm:p-12 shadow-2xl">
          
          {/* Logo / Brand */}
          <div className="flex justify-center mb-8">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 bg-foreground rounded flex items-center justify-center group-hover:scale-105 transition-transform">
                <span className="text-background font-bold font-mono">S</span>
              </div>
              <span className="font-display font-bold text-xl tracking-tight">Shipnode</span>
            </Link>
          </div>

          <div className="text-center mb-10">
            <h1 className="text-2xl sm:text-3xl font-display font-semibold mb-3">
              Create an account
            </h1>
            <p className="text-muted-foreground text-sm">
              Push your code and watch the magic happen
            </p>
          </div>

          <div className="space-y-4">
            <Button 
              onClick={handleGithubSignup}
              className="w-full h-14 bg-foreground hover:bg-foreground/90 text-background rounded-xl text-base flex items-center justify-center gap-3 transition-all hover:scale-[1.02]"
            >
              {/* 🚨 Updated Component */}
              <FaGithub className="w-5 h-5" />
              Sign up with GitHub
            </Button>
          </div>

          <div className="mt-8 pt-8 border-t border-foreground/10 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              {/* 🚨 Removed stray 'gap-2' prop from Link */}
              <Link to="/login" className="text-foreground hover:underline underline-offset-4 decoration-foreground/30 font-medium transition-colors">
                Log in
              </Link>
            </p>
          </div>

          {/* Decorative Corner Ornaments */}
          <div className="absolute top-0 right-0 w-16 h-16 border-b border-l border-foreground/10 rounded-tr-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-16 h-16 border-t border-r border-foreground/10 rounded-bl-3xl pointer-events-none" />
        </div>
      </div>
    </div>
  );
}