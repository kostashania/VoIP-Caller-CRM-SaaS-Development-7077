import React, { useState } from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';
import AddCallerModal from '../callers/AddCallerModal';

const { FiPlus, FiSettings, FiDownload, FiSearch } = FiIcons;

function QuickActions() {
  const [showAddCaller, setShowAddCaller] = useState(false);

  const actions = [
    {
      name: 'Add New Caller',
      description: 'Manually add a new caller record',
      icon: FiPlus,
      color: 'bg-primary-50 text-primary-600',
      onClick: () => setShowAddCaller(true)
    },
    {
      name: 'VoIP Settings',
      description: 'Configure your VoIP connection',
      icon: FiSettings,
      color: 'bg-gray-50 text-gray-600',
      onClick: () => window.location.href = '/settings'
    },
    {
      name: 'Export Data',
      description: 'Download call history as CSV',
      icon: FiDownload,
      color: 'bg-green-50 text-green-600',
      onClick: () => console.log('Export data')
    },
    {
      name: 'Search Callers',
      description: 'Find caller by phone number',
      icon: FiSearch,
      color: 'bg-blue-50 text-blue-600',
      onClick: () => console.log('Search callers')
    }
  ];

  return (
    <>
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
          
          <div className="space-y-3">
            {actions.map((action, index) => (
              <motion.button
                key={action.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={action.onClick}
                className="w-full flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
              >
                <div className={`rounded-lg p-2 ${action.color}`}>
                  <SafeIcon icon={action.icon} className="h-5 w-5" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-gray-900">
                    {action.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {action.description}
                  </p>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Add Caller Modal */}
      {showAddCaller && (
        <AddCallerModal
          isOpen={showAddCaller}
          onClose={() => setShowAddCaller(false)}
        />
      )}
    </>
  );
}

export default QuickActions;