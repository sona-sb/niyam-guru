import React from 'react';

interface SidebarProps {
  userInitial?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  userInitial = 'U'
}) => {
  return (
    <aside className="fixed left-0 top-0 h-screen w-16 bg-[#faf8f5] border-r border-gray-200 flex flex-col z-50">
      {/* Spacer to push profile to bottom */}
      <div className="flex-1" />

      {/* Profile Picture at Bottom */}
      <div className="p-3 pb-6">
        <button className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-300 to-orange-400 flex items-center justify-center text-base font-semibold text-[#fbf7ef] shadow-sm hover:shadow-md transition-shadow">
          {userInitial}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
