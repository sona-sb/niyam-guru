import React from 'react';

export const About: React.FC = () => {
  return (
    <section id="about" className="w-full relative pt-10">
      {/* Top Separator */}
      <div className="w-full h-px bg-black/80 mb-16 reveal-on-scroll"></div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] lg:grid-cols-[250px_1fr] gap-8 md:gap-16 items-start">
        {/* Header - Left Column */}
        <div className="reveal-on-scroll pt-[0.7em]">
          <h3 className="font-sans text-[15px] text-black/70 font-medium uppercase tracking-wider leading-none">
            What we are
          </h3>
        </div>

        {/* Right Column - Main Headline + Detailed Text Grid */}
        <div className="flex flex-col">
          {/* Main Headline */}
          <div className="reveal-on-scroll mb-16" style={{ transitionDelay: '100ms' }}>
            <h2 className="font-serif text-6xl md:text-6xl lg:text-6xl leading-[1.15] text-black">
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
        </div>
      </div>
    </section>
  );
};
