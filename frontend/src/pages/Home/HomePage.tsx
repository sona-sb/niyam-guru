import React from 'react';
import { Navbar } from '@/src/components/layout/Navbar';
import { Footer } from '@/src/components/layout/Footer';
import { NoiseOverlay } from '@/src/components/common/NoiseOverlay';
import { Hero } from './sections/Hero';
import { About } from './sections/About';
import { Features } from './sections/Features';
import { useRevealOnScroll } from '@/src/hooks/useRevealOnScroll';

export const HomePage: React.FC = () => {
  useRevealOnScroll();

  return (
    <div className="relative min-h-screen w-full bg-[#fbf7ef] text-black">
      {/* Background Stars - Absolute & Scrollable (Pinned to page content) */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden h-full">
        {/* Top Left Star */}
        <div className="absolute top-[650px] left-[5%] text-black/[0.10] rotate-45">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
          </svg>
        </div>
        {/* Left Star - Mid section */}
        <div className="absolute top-[1100px] left-[19%] text-black/[0.10] rotate-[15deg]">
          <svg width="50" height="50" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
          </svg>
        </div>
        {/* Middle Right Star */}
        <div className="absolute top-[1400px] right-[12%] text-black/[0.10] rotate-[-20deg]">
          <svg width="35" height="35" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
          </svg>
        </div>
        {/* Center Star */}
        <div className="absolute top-[1800px] left-[45%] text-black/[0.10] rotate-[30deg]">
          <svg width="45" height="45" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
          </svg>
        </div>
        {/* Bottom Left Star */}
        <div className="absolute top-[2200px] left-[8%] text-black/[0.10] rotate-[10deg]">
          <svg width="38" height="38" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
          </svg>
        </div>
        {/* Bottom Center-Right Star */}
        <div className="absolute top-[2500px] right-[25%] text-black/[0.10] rotate-[-15deg]">
          <svg width="42" height="42" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
          </svg>
        </div>
        {/* Bottom Right Star */}
        <div className="absolute top-[2900px] right-[10%] text-black/[0.10] rotate-[25deg]">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
          </svg>
        </div>
        {/* Far Bottom Left Star */}
        <div className="absolute top-[3200px] left-[15%] text-black/[0.10] rotate-[5deg]">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
          </svg>
        </div>
      </div>

      {/* Noise Texture Overlay */}
      <NoiseOverlay />

      {/* Main Content Container */}
      <div className="relative z-10 max-w-[1400px] mx-auto px-6 md:px-12 lg:px-20 py-8 flex flex-col">
        <Navbar />
        <main className="flex-grow flex flex-col mt-6 md:mt-16 space-y-32">
          <Hero />
          <About />
          <Features />
        </main>
        
        <Footer />
      </div>
    </div>
  );
};
