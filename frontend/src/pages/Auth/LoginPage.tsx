import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { NoiseOverlay } from '@/src/components/common/NoiseOverlay';
import { useAuth } from '@/src/contexts/AuthContext';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, user, loading: authLoading } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Get the redirect path from location state, or default to /my-cases
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/my-cases';

  // Redirect if already logged in
  useEffect(() => {
    if (user && !authLoading) {
      navigate(from, { replace: true });
    }
  }, [user, authLoading, navigate, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      // Navigation will happen automatically via the useEffect above
      navigate(from, { replace: true });
    }
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
            <h1 className="text-3xl md:text-3xl tracking-wide font-semibold flex items-baseline justify-center gap-0.5">
              <span className="font-gotu">नियम</span>
              <span className="font-serif">-</span>
              <span className="font-instrument italic">guru</span>
            </h1>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block font-sans text-[10px] uppercase tracking-widest font-bold text-black/70 mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-black/10 rounded-xl font-sans text-[15px] text-black placeholder-black/40 focus:outline-none focus:border-black transition-all duration-300"
                placeholder="you@company.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block font-sans text-[10px] uppercase tracking-widest font-bold text-black/70 mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-black/10 rounded-xl font-sans text-[15px] text-black placeholder-black/40 focus:outline-none focus:border-black transition-all duration-300"
                placeholder="••••••••"
                required
              />
            </div>

            {/* Privacy Policy Text */}
            <div className="text-center">
              <p className="text-xs text-black/60 font-sans leading-relaxed">
                By signing in, you agree to our{' '}
                <a href="#" className="text-black/70 underline hover:text-black transition-colors">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="#" className="text-black/70 underline hover:text-black transition-colors">
                  Privacy Policy
                </a>
                , if you do not have an account request one to get started.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white font-sans font-medium px-8 py-2.5 rounded-lg hover:bg-black/80 transition-colors mt-6 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                  Signing in...
                </span>
              ) : (
                'Continue'
              )}
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
