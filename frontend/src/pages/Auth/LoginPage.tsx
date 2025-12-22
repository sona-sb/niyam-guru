import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NoiseOverlay } from '@/src/components/common/NoiseOverlay';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle login logic here
    console.log('Login attempt:', { email, password });
    // Navigate to My Cases page after login
    navigate('/my-cases');
  };

  return (
    <div className="relative min-h-screen w-full flex">
      {/* Left Side - Login Form */}
      <div className="relative w-full lg:w-1/2 min-h-screen bg-[#fbf7ef] flex items-center justify-center">
        {/* Noise Texture Overlay */}
        <NoiseOverlay />

        <div className="relative z-10 w-full max-w-md px-8 lg:px-12">
          {/* Logo */}
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl tracking-wide font-semibold flex items-baseline justify-center gap-0.5">
              <span className="font-gotu">नियम</span>
              <span className="font-serif">-</span>
              <span className="font-instrument italic">guru</span>
            </h1>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block font-sans text-sm font-medium text-black mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-black/20 rounded-lg font-sans text-[15px] text-black placeholder-black/40 focus:outline-none focus:border-black transition-all duration-300"
                placeholder="you@company.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block font-sans text-sm font-medium text-black mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-black/20 rounded-lg font-sans text-[15px] text-black placeholder-black/40 focus:outline-none focus:border-black transition-all duration-300"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-black text-white font-sans font-medium px-8 py-2.5 rounded-lg hover:bg-black/80 transition-colors mt-8"
            >
              Continue
            </button>
          </form>
        </div>
      </div>

      {/* Right Side - Image */}
      <div className="hidden lg:flex w-1/2 min-h-screen p-6 items-center justify-center bg-[#fbf7ef]">
        <div className="relative w-full h-full rounded-2xl overflow-hidden">
          <img
            src="/media/pexels-vuralyavas-14208025.jpg"
            alt="Login background"
            className="absolute inset-0 w-full h-full object-cover"
          />
        </div>
      </div>
    </div>
  );
};
