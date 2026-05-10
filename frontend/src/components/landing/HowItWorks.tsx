"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatedWave } from "./AnimatedWave";

const steps = [
  {
    number: "I",
    title: "Connect GitHub Repo",
    description: "Authorize Shipnode using the official GitHub OAuth flow. We generate a webhook, and you configure your build commands and root directory.",
    code: `const webhook = await axios.post(
  'api.github.com/repos/user/repo/hooks',
  {
    name: "web",
    events: ["push"],
    config: { url: webhookUrl }
  }
)`,
  },
  {
    number: "II",
    title: "Isolated Container Build",
    description: "When code is pushed, BullMQ queues the job. Shipnode spawns a secure Docker environment to install dependencies and execute your build.",
    code: `const container = await docker.createContainer({
  Image: 'shipnode-builder',
  Env: [
    \`REPO_URL=\${url}\`,
    \`BUILD_CMD=npm run build\`,
  ],
  NetworkMode: 'host'
});`,
  },
  {
    number: "III",
    title: "Stream & Deploy",
    description: "Build logs are streamed live to Redis Pub/Sub. Upon success, your output directory is synced to R2, instantly available on your Shipnode subdomain.",
    code: `const command = new PutObjectCommand({
  Bucket: ENV.R2_BUCKET_NAME,
  Key: \`project_123/deploy_456/\${file}\`,
  Body: fs.createReadStream(filePath)
});
await s3Client.send(command);`,
  },
];

export function HowItWorksSection() {
  const [activeStep, setActiveStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section
      id="how-it-works"
      ref={sectionRef}
      // Adjusted mobile padding (py-16) while keeping desktop (lg:py-32)
      className="relative py-16 lg:py-32 bg-background text-foreground overflow-hidden"
    >
      {/* Animated Wave Background */}
      <div className="absolute inset-0 opacity-[0.15] pointer-events-none">
        <AnimatedWave />
      </div>

      <div className="relative z-10 max-w-[1400px] mx-auto px-6 lg:px-12">
        {/* Header */}
        <div className="mb-12 lg:mb-24">
          <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-6">
            <span className="w-8 h-px bg-foreground/30" />
            Process
          </span>
          <h2
            // Scaled text for mobile (text-3xl sm:text-4xl) to desktop (lg:text-6xl)
            className={`text-3xl sm:text-4xl lg:text-6xl font-display tracking-tight transition-all duration-700 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            Three steps.
            <br />
            <span className="text-muted-foreground">Infinite possibilities.</span>
          </h2>
        </div>

        {/* Main content */}
        {/* Adjusted mobile gap (gap-12) to desktop (lg:gap-24) */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-24">
          {/* Steps */}
          <div className="space-y-0">
            {steps.map((step, index) => (
              <button
                key={step.number}
                type="button"
                onClick={() => setActiveStep(index)}
                // Adjusted mobile padding (py-6) to desktop (lg:py-8)
                className={`w-full text-left py-6 lg:py-8 border-b border-foreground/10 transition-all duration-500 group ${
                  activeStep === index ? "opacity-100" : "opacity-40 hover:opacity-70"
                }`}
              >
                {/* Adjusted mobile gap (gap-4) to desktop (lg:gap-6) */}
                <div className="flex items-start gap-4 lg:gap-6">
                  {/* Adjusted mobile text (text-2xl) to desktop (lg:text-3xl) */}
                  <span className="font-display text-2xl lg:text-3xl text-foreground/30 mt-1 lg:mt-0">{step.number}</span>
                  <div className="flex-1">
                    {/* Adjusted mobile text (text-xl) to desktop (lg:text-3xl) */}
                    <h3 className="text-xl sm:text-2xl lg:text-3xl font-display mb-2 lg:mb-3 group-hover:translate-x-2 transition-transform duration-300">
                      {step.title}
                    </h3>
                    {/* Slightly reduced text size on mobile for description */}
                    <p className="text-sm lg:text-base text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                    
                    {/* Progress indicator */}
                    {activeStep === index && (
                      <div className="mt-4 h-px bg-foreground/20 overflow-hidden">
                        <div 
                          className="h-full bg-foreground w-0"
                          style={{
                            animation: 'progress 5s linear forwards'
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Code display */}
          <div className="lg:sticky lg:top-32 self-start">
            <div className="border border-foreground/10 overflow-hidden rounded-xl bg-background/50 backdrop-blur-sm shadow-2xl lg:shadow-none">
              {/* Window header */}
              {/* Adjusted mobile padding (px-4 py-3) to desktop (lg:px-6 lg:py-4) */}
              <div className="px-4 py-3 lg:px-6 lg:py-4 border-b border-foreground/10 flex items-center justify-between bg-foreground/[0.02]">
                <div className="flex gap-1.5 lg:gap-2">
                  <div className="w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-full bg-foreground/20" />
                  <div className="w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-full bg-foreground/20" />
                  <div className="w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-full bg-foreground/20" />
                </div>
                <span className="text-[10px] lg:text-xs font-mono text-muted-foreground">shipnode.ts</span>
              </div>

              {/* Code content */}
              {/* Added overflow-x-auto, responsive padding, height, and font-size */}
              <div className="p-4 lg:p-8 font-mono text-xs lg:text-sm min-h-[220px] lg:min-h-[280px] overflow-x-auto bg-[#0a0a0a]">
                <pre className="text-foreground/80 w-max min-w-full">
                  {steps[activeStep].code.split('\n').map((line, lineIndex) => (
                    <div 
                      key={`${activeStep}-${lineIndex}`} 
                      className="leading-relaxed lg:leading-loose code-line-reveal flex"
                      style={{ 
                        animationDelay: `${lineIndex * 80}ms`,
                      }}
                    >
                      {/* Adjusted line number width for mobile */}
                      <span className="text-foreground/30 select-none w-6 lg:w-8 shrink-0">{lineIndex + 1}</span>
                      <span className="inline-flex">
                        {line.split('').map((char, charIndex) => (
                          <span
                            key={`${activeStep}-${lineIndex}-${charIndex}`}
                            className="code-char-reveal"
                            style={{
                              animationDelay: `${lineIndex * 80 + charIndex * 15}ms`,
                            }}
                          >
                            {char === ' ' ? '\u00A0' : char}
                          </span>
                        ))}
                      </span>
                    </div>
                  ))}
                </pre>
              </div>

              {/* Status */}
              <div className="px-4 py-3 lg:px-6 lg:py-4 border-t border-foreground/10 flex items-center gap-3 bg-foreground/[0.02]">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] lg:text-xs font-mono text-muted-foreground">Ready</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}