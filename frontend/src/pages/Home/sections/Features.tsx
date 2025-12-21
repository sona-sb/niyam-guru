import React from 'react';

interface FeatureBlockProps {
  title: string;
  description: string;
  subFeatures: string[];
  delay: string;
}

const FeatureBlock: React.FC<FeatureBlockProps> = ({ title, description, subFeatures, delay }) => (
  <div 
    className="reveal-on-scroll flex flex-col lg:flex-row gap-8 lg:gap-12 border-b border-black/10 last:border-0 py-16 first:pt-0 group"
    style={{ transitionDelay: delay }}
  >
    {/* Text Content */}
    <div className="flex-1 flex flex-col justify-center order-2 lg:order-1">
      <h4 className="font-vesper text-3xl md:text-4xl mb-6 text-black">
        {title}
      </h4>
      <p className="font-sans text-[16px] leading-relaxed text-black/80 font-light mb-8 max-w-xl">
        {description}
      </p>
      
      {/* Sub-feature tags/pills for summary */}
      <div className="flex flex-wrap gap-3">
        {subFeatures.map((tag, idx) => (
          <span key={idx} className="font-sans text-xs uppercase tracking-wide px-3 py-1.5 border border-black rounded-full text-black bg-transparent">
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-8 flex items-center gap-2 text-sm font-medium cursor-pointer group-hover:gap-4 transition-all duration-300">
        <span>Learn more</span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </div>

    {/* Graphic/Image Placeholder */}
    <div className="flex-1 order-1 lg:order-2">
      <div className="w-full aspect-[4/3] bg-black/5 border border-black/5 overflow-hidden relative group-hover:bg-black/10 transition-colors duration-500">
        {/* Abstract Placeholder Graphic */}
        <div className="absolute inset-0 flex items-center justify-center p-8">
          <div className="w-full h-full bg-white shadow-sm flex items-center justify-center border border-black/5">
            <span className="font-vesper italic text-black/40 text-lg">Feature Visualization</span>
          </div>
          
          {/* Decorative elements representing UI */}
          <div className="absolute top-[20%] right-[15%] w-24 h-24 bg-gradient-to-br from-blue-100/50 to-purple-100/50 rounded-full blur-xl pointer-events-none"></div>
        </div>
      </div>
    </div>
  </div>
);

export const Features: React.FC = () => {
  const mainFeatures = [
    {
      title: "The Consumer Shield Engine",
      description: "Your automated legal defense system. We handle the tedious interaction with companies—from initiating contact and securely storing evidence to analyzing responses and drafting court-ready documents automatically.",
      subFeatures: ["AI Support Handling", "Evidence Locker", "Response Analysis", "Auto-Drafting"]
    },
    {
      title: "The Courtroom Confidence Builder",
      description: "Step into court prepared, not scared. Simulate real courtroom scenarios, practice cross-examinations against an AI opponent, and master legal etiquette with personalized procedural guidance.",
      subFeatures: ["Moot Court Simulator", "AI Opponent", "Procedural Guidance"]
    },
    {
      title: "The Legal Navigator",
      description: "Demystifying the law for everyday life. Clarify complex legal problems with structured analysis, simplify dense contracts into plain English, and get actionable checklists for any situation.",
      subFeatures: ["Problem Clarifier", "Document Simplifier", "Lawyer Prep Kit"]
    }
  ];

  return (
    <section id="features" className="w-full relative pt-10">
      {/* Top Separator */}
      <div className="w-full h-px bg-black/80 mb-12 reveal-on-scroll"></div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8">
        {/* Left Column - Header */}
        <div className="lg:col-span-3 reveal-on-scroll sticky top-24 self-start">
          <h3 className="font-sans text-[15px] text-black/70 font-medium uppercase tracking-wider flex items-center gap-2">
            Features
          </h3>
        </div>

        {/* Right Column - Content */}
        <div className="lg:col-span-9">
          {mainFeatures.map((feature, idx) => (
            <FeatureBlock
              key={idx}
              title={feature.title}
              description={feature.description}
              subFeatures={feature.subFeatures}
              delay={`${idx * 150}ms`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
