import { useState, useEffect } from "react";
import { Globe, ArrowRight } from "lucide-react";
import { AnimatedWave } from "./landing/AnimatedWave"; 
export function AnimatedWalkthrough() {
  const [phase, setPhase] = useState(0);
  const [typedText, setTypedText] = useState("");

  // Realistic CLI commands
  const steps = [
    "shipnode init project",
    "git clone repository...",
    "npm run build",
    "deploying to edge network..."
  ];

  useEffect(() => {
    let timeout;
    
    if (phase === 0) {
      setTypedText("");
      let currentString = "";
      let stepIndex = 0;
      let charIndex = 0;

      const typeChar = () => {
        if (stepIndex < steps.length) {
          if (charIndex < steps[stepIndex].length) {
            currentString += steps[stepIndex][charIndex];
            setTypedText(currentString);
            charIndex++;
            // Typing speed variance for realism
            timeout = setTimeout(typeChar, Math.random() * 50 + 20); 
          } else {
            currentString += "\n";
            stepIndex++;
            charIndex = 0;
            timeout = setTimeout(typeChar, 600); 
          }
        } else {
          timeout = setTimeout(() => setPhase(1), 500); 
        }
      };
      typeChar();
    }

    if (phase === 1) timeout = setTimeout(() => setPhase(2), 1000);
    if (phase === 2) timeout = setTimeout(() => setPhase(3), 600); 
    if (phase === 3) timeout = setTimeout(() => setPhase(0), 4000);

    return () => clearTimeout(timeout);
  }, [phase]);

  // Split typed text by newlines so we can map each line with the PS prefix
  const lines = typedText.split('\n');

  return (
    // 🚨 Reduced height from 480px to 420px for a sleeker look
    <div className="border border-foreground/10 bg-[#000000] rounded-xl overflow-hidden shadow-sm h-[420px] flex flex-col relative group">
      
      {/* Fake Browser Window Header */}
      <div className="h-10 border-b border-foreground/10 bg-foreground/[0.02] flex items-center px-4 gap-2 z-20 relative">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <div className="w-3 h-3 rounded-full bg-green-500/80" />
        </div>
        <div className="flex-1 flex justify-center">
          <div className="bg-background border border-foreground/10 rounded px-3 py-0.5 text-[11px] text-muted-foreground font-mono flex items-center gap-2">
            <Globe className="w-3 h-3" /> shipnode.app/deploy
          </div>
        </div>
      </div>

      {/* Main Content Area - Dark background for the whole terminal */}
      <div className="flex-1 bg-[#0a0a0a] relative flex flex-col overflow-hidden">
        
        {/* View 1: Terminal & Button (Phases 0, 1, 2) */}
        <div className={`absolute inset-0 p-6 flex flex-col transition-all duration-700 z-10 ${phase === 3 ? 'opacity-0 scale-95 translate-y-4 pointer-events-none' : 'opacity-100 scale-100 translate-y-0'}`}>
          
          {/* 🚨 Full-space realistic terminal text */}
          <div className="flex-1 font-mono text-[14px] text-left">
            {lines.map((line, i) => (
              <div key={i} className="flex flex-wrap font-mono mt-1.5">
                {/* PowerShell Prefix */}
                {i < lines.length - 1 || line.length > 0 || phase < 3 ? (
                  <span className="text-gray-400 mr-3 shrink-0">PS E:\Shipnode&gt;</span>
                ) : null}
                
                {/* Yellow text matching your screenshot */}
                <span className="text-yellow-400 break-all tracking-wide">{line}</span>
                
                {/* 🚨 Authentic Blinking Block Cursor */}
                {i === lines.length - 1 && phase < 3 && (
                  <span className="bg-gray-300 w-2 h-[15px] inline-block ml-1 align-middle animate-pulse" />
                )}
              </div>
            ))}
          </div>

          {/* Button aligned to the bottom right for a cleaner terminal flow */}
          <div className="flex justify-end mt-4">
            <button 
              className={`px-8 py-2.5 rounded-lg font-medium shadow-lg transition-all duration-300 flex items-center gap-2
                ${phase >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
                ${phase >= 2 ? 'scale-95 bg-foreground/80 text-background/80' : 'bg-foreground text-background hover:scale-105'}
              `}
            >
              {/* 🚨 phase >= 2 fixes the text snapping glitch! */}
              {phase >= 2 ? "Deploying..." : "Deploy"} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* View 2: The Success Preview (Phase 3) */}
        <div className={`w-full h-full transition-all duration-700 absolute inset-0 flex flex-col items-center justify-center gap-6 ${phase === 3 ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-105 translate-y-4 pointer-events-none'}`}>
           
           {/* Animated Wave Background */}
           <div className="absolute inset-0 z-0 opacity-40 mix-blend-screen pointer-events-none">
              <AnimatedWave />
           </div>

        
           <div className="w-full max-w-sm aspect-video rounded-xl border border-foreground/20 shadow-2xl relative z-10 overflow-hidden group">
             <img 
               src="/deployed-site-eg.png" 
               alt="Live Site Preview" 
               className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700 ease-out"
             />
             {/* Keeps the sleek inner border so the image doesn't look pasted on */}
             <div className="absolute inset-0 rounded-xl border border-white/10 pointer-events-none" />
           </div>
           
           <div className="bg-background/80 backdrop-blur-sm px-4 py-2 rounded-full text-xs font-mono text-muted-foreground border border-foreground/10 z-10 shadow-sm">
             https://my-app-9a8b.shipnode.app
           </div>
        </div>

      </div>
    </div>
  );
}