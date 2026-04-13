import React from 'react'
import Hero from '../components/landing/Hero'
import { FeaturesSection } from '../components/landing/Feature'
import { HowItWorksSection } from '../components/landing/HowItWorks'
import { MetricsSection } from '../components/landing/MetricSection'
import { SecuritySection } from '../components/landing/SecuritySection'
import { TestimonialsSection } from '../components/landing/Testimonial'
import { CtaSection } from '../components/landing/CTA'
import NavBar from '../components/Navbar'
import { FooterSection } from '../components/landing/FooterSection'
export default function Page() {
  return (
    <div className="min-h-screen dot-grid-bg">
      <NavBar />
      <main>
        <Hero/>
        <FeaturesSection/>
        <HowItWorksSection/>
        <MetricsSection/>
        <SecuritySection/>
        <TestimonialsSection/>
        <CtaSection/>
      </main>
      <FooterSection/>
    
    </div>
  )
}
