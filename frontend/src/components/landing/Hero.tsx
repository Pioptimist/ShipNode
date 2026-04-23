"use client"

import { WorkflowDiagram } from "../workflow-diagram"
import { motion } from "framer-motion"

const ease = [0.22, 1, 0.36, 1] as const

const Hero = () => {
  return (
    <section className="relative w-full px-12 pt-32 pb-12 lg:px-24 lg:pt-40 lg:pb-16 dot-grid-bg">
      {/* Soft gradient mask to blend into the background below */}
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
      <div className="flex flex-col items-center text-center relative z-10">
        {/* Top headline: DEPLOY. SCALE. -- Geist Pixel Grid */}
        <motion.h1
          initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.7, ease }}
          className="font-pixel text-4xl sm:text-6xl lg:text-7xl xl:text-8xl tracking-tight text-foreground mb-2 select-none"
        >
          DEPLOY. SCALE.
        </motion.h1>

        {/* Central Workflow Diagram */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.15, ease }}
          className="w-full max-w-2xl my-4 lg:my-6"
        >
          <WorkflowDiagram />
        </motion.div>

        {/* Bottom headline: ROUTE. -- Geist Pixel Grid */}
        <motion.h1
          initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.7, delay: 0.25, ease }}
          className="font-pixel text-4xl sm:text-6xl lg:text-7xl xl:text-8xl tracking-tight text-foreground mb-4 select-none"
          aria-hidden="true"
        >
          ROUTE.
        </motion.h1>

        {/* Sub-headline */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.45, ease }}
          className="text-xs lg:text-sm text-muted-foreground max-w-md mb-6 leading-relaxed font-mono"
        >
          SYS.INT is the deterministic deployment layer between your models and your users. Sub-5ms inference. Global edge routing. Full operational control.
        </motion.p>
      </div>
    </section>
  )
}
export default Hero;