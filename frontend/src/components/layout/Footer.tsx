import React from 'react';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full relative pt-10 pb-8 mt-20">
      {/* Top Separator - Matching other sections */}
      <div className="w-full h-px bg-black/80 mb-16 reveal-on-scroll"></div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-8 mb-20 reveal-on-scroll">
        
        {/* Brand Column */}
        <div className="md:col-span-4 flex flex-col gap-6">
          <h1 className="text-2xl tracking-wide font-semibold flex items-baseline gap-0.5">
            <span className="font-gotu">नियम</span>
            <span className="font-serif">-</span>
            <span className="font-instrument italic">guru</span>
          </h1>
          <p className="font-sans text-sm text-black/70 leading-relaxed max-w-xs font-light">
            Empowering consumers with legal certainty through verified judgments, AI-driven guidance, and structured analysis.
          </p>
        </div>

        {/* Navigation Columns */}
        <div className="md:col-span-2 md:col-start-6">
          <h4 className="font-sans font-medium text-black uppercase tracking-wider text-xs mb-6">Platform</h4>
          <ul className="flex flex-col gap-3">
            {['About', 'Features', 'Meet the Team', 'Login'].map((item) => (
              <li key={item}>
                <a href="#" className="font-sans text-sm text-black/60 hover:text-black transition-colors font-light">
                  {item}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="md:col-span-2">
          <h4 className="font-sans font-medium text-black uppercase tracking-wider text-xs mb-6">Resources</h4>
          <ul className="flex flex-col gap-3">
            {['Legal Guides', 'Documentation', 'Consumer Rights', 'Support'].map((item) => (
              <li key={item}>
                <a href="#" className="font-sans text-sm text-black/60 hover:text-black transition-colors font-light">
                  {item}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="md:col-span-2">
          <h4 className="font-sans font-medium text-black uppercase tracking-wider text-xs mb-6">Legal</h4>
          <ul className="flex flex-col gap-3">
            {['Privacy Policy', 'Terms of Service', 'Cookie Policy'].map((item) => (
              <li key={item}>
                <a href="#" className="font-sans text-sm text-black/60 hover:text-black transition-colors font-light">
                  {item}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-8 border-t border-black/10 reveal-on-scroll">
        <p className="font-sans text-xs text-black/50 font-light">
          © {currentYear} Niyam-Guru. All rights reserved.
        </p>
        
        <div className="flex items-center gap-6">
          {['Twitter', 'LinkedIn', 'Instagram'].map((social) => (
            <a key={social} href="#" className="font-sans text-xs text-black/50 hover:text-black transition-colors uppercase tracking-wide">
              {social}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
};
