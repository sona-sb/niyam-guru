import React from 'react';

export const Hero: React.FC = () => {
  return (
    <div className="relative w-full pb-12 min-h-[60vh] flex flex-col justify-center">
      {/* Small Decorative Star Top Right of Content - Tilted and lighter */}
      <div className="absolute top-0 right-10 md:right-20 text-black/15 animate-pulse-slow hidden md:block rotate-12">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
        </svg>
      </div>

      {/* Headline */}
      <div className="max-w-4xl mb-16 relative">
        <h2 className="font-serif text-6xl md:text-10xl lg:text-[6.5rem] leading-[1.1] text-black">
          Empowering consumers with <br />
          <span className="group relative inline-block cursor-pointer align-bottom">
            {/* Base Layer: Black Text + Black Border */}
            <span className="relative z-10 block border-b-[3px] border-black pb-[2px]">
              legal certainty.
            </span>
            
            {/* Overlay Layer: Black Background (Wipe) + White Text */}
            <span className="absolute top-0 left-0 h-full w-0 overflow-hidden bg-black transition-all duration-700 ease-[cubic-bezier(0.76,0,0.24,1)] group-hover:w-full z-20">
              {/* Inverted Text - Absolute to prevent wrapping and keep position static relative to wipe */}
              <span className="absolute top-0 left-0 whitespace-nowrap border-b-[3px] border-[#fbf7ef] pb-[2px] text-[#fbf7ef]">
                legal certainty.
              </span>
            </span>
          </span>
        </h2>
      </div>

      {/* Description Section */}
      <div className="max-w-[650px] mb-12">
        <p className="font-sans text-[13px] md:text-[15px] leading-relaxed text-black/90 font-normal text-left">
          Built to guide consumers through disputes with clarity - combining real legal judgments, structured analysis, and transparent reasoning to help you understand your rights with confidence.
        </p>
      </div>

      {/* Buttons */}
      <div className="flex items-center gap-5 relative mb-14">
        <button className="bg-black text-[#fbf7ef] font-sans font-medium px-8 py-2.5 rounded-lg hover:bg-black/80 transition-colors">
          Request a Demo
        </button>
      </div>

      {/* Video Container */}
      <div className="w-full overflow-hidden border border-black/10 shadow-lg">
        <video 
          className="w-full h-auto"
          autoPlay 
          loop 
          muted 
          playsInline
        >
          <source src="/media/8061667-hd_1920_1080_25fps.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>
    </div>
  );
};
