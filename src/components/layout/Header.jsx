import React from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';
import { useAuthStore } from '../../store/authStore';

const { FiBell, FiUser, FiLogOut, FiChevronDown } = FiIcons;

function Header() {
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
      {/* Mobile menu space - button is now in Sidebar component */}
      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6 lg:ml-0 ml-12">
        <div className="flex flex-1"></div>
        
        <div className="flex items-center gap-x-4 lg:gap-x-6">
          {/* Notifications */}
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-400 hover:text-gray-500"
          >
            <span className="sr-only">View notifications</span>
            <SafeIcon icon={FiBell} className="h-6 w-6" />
          </button>

          {/* Profile dropdown */}
          <div className="relative">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-8 h-8 bg-primary-100 rounded-full">
                <SafeIcon icon={FiUser} className="w-4 h-4 text-primary-600" />
              </div>
              
              <div className="hidden lg:block">
                <div className="text-sm font-medium text-gray-900">{user?.name}</div>
                <div className="text-xs text-gray-500 capitalize">{user?.role}</div>
              </div>
              
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1 text-sm text-gray-700 hover:text-gray-900 transition-colors"
              >
                <SafeIcon icon={FiLogOut} className="w-4 h-4" />
                <span className="hidden sm:block">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Header;