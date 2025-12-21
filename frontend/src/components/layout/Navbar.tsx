import React from 'react';
import { Link } from 'react-router-dom';

export const Navbar: React.FC = () => {
  const links = ['About', 'Features', 'Meet the Team'];

  return (
    <header className="w-full">
      <div className="flex flex-col md:flex-row items-center justify-between pb-5 border-b border-black/80">
        
        {/* Logo */}
        <div className="w-full md:w-auto flex justify-between items-center mb-4 md:mb-0">
          <Link to="/" className="text-2xl tracking-wide font-semibold flex items-baseline gap-0.5">
            <span className="font-gotu">नियम</span>
            <span className="font-serif">-</span>
            <span className="font-instrument italic">guru</span>
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 lg:gap-12">
          {links.map((link) => (
            <a 
              key={link} 
              href={`#${link.toLowerCase().replace(/\s+/g, '-')}`}
              className="font-sans text-[15px] font-normal text-black/80 hover:text-black transition-colors"
            >
              {link}
            </a>
          ))}
        </nav>

        {/* Action Button */}
        <div className="w-full md:w-auto flex justify-center md:justify-end mt-4 md:mt-0">
          <Link 
            to="/login" 
            className="font-sans text-sm px-6 py-2.5 border border-black rounded-full hover:bg-black hover:text-white transition-all duration-300"
          >
            Login
          </Link>
        </div>
      </div>
    </header>
  );
};
