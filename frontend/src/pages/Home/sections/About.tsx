import React from 'react';

export const About: React.FC = () => {
  return (
    <section id="about" className="w-full relative pt-10">
      {/* Top Separator */}
      <div className="w-full h-px bg-black/80 mb-32 reveal-on-scroll"></div>

      {/* Header */}
      <div className="reveal-on-scroll mb-8">
        <h3 className="font-sans text-[15px] text-black/70 font-medium uppercase tracking-wider">
          What we are
        </h3>
      </div>

      {/* Main Headline */}
      <div className="w-full reveal-on-scroll mb-16" style={{ transitionDelay: '100ms' }}>
        <h2 className="font-serif text-4xl md:text-6xl lg:text-7xl leading-[1.15] text-black">
          Democratizing legal intelligence<br />
          for the <span className="italic font-vesper">everyday consumer</span>.
        </h2>
      </div>

      {/* Detailed Text Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16">
        <div className="reveal-on-scroll" style={{ transitionDelay: '200ms' }}>
          <p className="font-sans text-base text-black/90 leading-relaxed font-light">
            <span className="font-semibold block mb-2 font-vesper text-xl">The Problem</span>
            Navigating legal disputes is often opaque, expensive, and intimidating. Consumers are left uncertain of their rights, facing complex jargon without a clear path forward.
          </p>
        </div>
        
        <div className="reveal-on-scroll" style={{ transitionDelay: '300ms' }}>
          <p className="font-sans text-base text-black/90 leading-relaxed font-light">
            <span className="font-semibold block mb-2 font-vesper text-xl">Our Solution</span>
            We combine verified legal judgments with structured analysis to provide you with a clear, actionable roadmap. Niyam-Guru turns confusion into confidence.
          </p>
        </div>
      </div>
    </section>
  );
};
