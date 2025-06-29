import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';
import { useAuthStore } from '../../store/authStore';

const { FiPhone, FiHome, FiUsers, FiSettings, FiBriefcase, FiPhoneCall, FiMenu, FiX } = FiIcons;

function Sidebar() {
  const location = useLocation();
  const { user, hasRole } = useAuthStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: FiHome, current: location.pathname === '/dashboard' },
    { name: 'Call History', href: '/calls', icon: FiPhoneCall, current: location.pathname === '/calls' },
    { name: 'Settings', href: '/settings', icon: FiSettings, current: location.pathname === '/settings' },
  ];

  // Add admin-only routes
  if (hasRole('admin')) {
    navigation.push({
      name: 'User Management',
      href: '/users',
      icon: FiUsers,
      current: location.pathname === '/users'
    });
  }

  // Add super admin routes
  if (hasRole('superadmin')) {
    navigation.push({
      name: 'Companies',
      href: '/companies',
      icon: FiBriefcase,
      current: location.pathname === '/companies'
    });
  }

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const SidebarContent = () => (
    <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-4 shadow-lg h-full">
      <div className="flex h-16 shrink-0 items-center">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-10 h-10 bg-primary-100 rounded-lg">
            <SafeIcon icon={FiPhone} className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">VoIP CRM</h1>
            <p className="text-xs text-gray-500">{user?.company?.name || 'Admin Panel'}</p>
          </div>
        </div>
      </div>
      
      <nav className="flex flex-1 flex-col">
        <ul role="list" className="flex flex-1 flex-col gap-y-7">
          <li>
            <ul role="list" className="-mx-2 space-y-1">
              {navigation.map((item) => (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    onClick={closeMobileMenu}
                    className={`group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-colors ${
                      item.current
                        ? 'bg-primary-50 text-primary-600'
                        : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50'
                    }`}
                  >
                    <SafeIcon
                      icon={item.icon}
                      className={`h-6 w-6 shrink-0 ${
                        item.current ? 'text-primary-600' : 'text-gray-400 group-hover:text-primary-600'
                      }`}
                    />
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </li>
        </ul>
      </nav>
    </div>
  );

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden">
        <button
          type="button"
          className="fixed top-4 left-4 z-50 inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <span className="sr-only">Open main menu</span>
          <SafeIcon
            icon={isMobileMenuOpen ? FiX : FiMenu}
            className="h-6 w-6"
            aria-hidden="true"
          />
        </button>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
        <SidebarContent />
      </div>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black bg-opacity-25 lg:hidden"
              onClick={closeMobileMenu}
            />
            
            {/* Sidebar */}
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 left-0 z-50 w-64 lg:hidden"
            >
              <SidebarContent />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export default Sidebar;