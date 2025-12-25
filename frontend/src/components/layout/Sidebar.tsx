import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/src/contexts/AuthContext';

interface SidebarProps {
  userInitial?: string;
  userEmail?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  userInitial,
  userEmail
}) => {
  const [showPopup, setShowPopup] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  // Get initial from user email or prop
  const email = userEmail || user?.email || '';
  const displayInitial = userInitial || (email ? email.charAt(0).toUpperCase() : 'U');
  const displayName = email ? email.split('@')[0] : 'User';

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current && 
        buttonRef.current &&
        !popupRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowPopup(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await signOut();
    setShowPopup(false);
    navigate('/login');
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-16 bg-[#FAF3E8] border-r border-gray-200 flex flex-col z-50">
      {/* Spacer to push profile to bottom */}
      <div className="flex-1" />

      {/* Profile Picture at Bottom */}
      <div className="p-3.5 pb-3 relative">
        <button 
          ref={buttonRef}
          onClick={() => setShowPopup(!showPopup)}
          className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-200 to-orange-300 flex items-center justify-center text-sm font-semibold text-orange-900 shadow-sm hover:shadow-md transition-shadow"
        >
          {displayInitial}
        </button>

        {/* Logout Popup */}
        {showPopup && (
          <div 
            ref={popupRef}
            className="absolute bottom-full left-3 mb-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden"
          >
            {/* User Info */}
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-200 to-orange-300 flex items-center justify-center text-sm font-semibold text-orange-900">
                  {displayInitial}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {displayName}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {email}
                  </p>
                </div>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign out
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
