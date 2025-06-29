import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';
import AddCallerModal from '../callers/AddCallerModal';
import { useCallerStore } from '../../store/callerStore';
import { callsAPI } from '../../services/supabaseAPI';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

const { FiPlus, FiSettings, FiDownload, FiSearch } = FiIcons;

function QuickActions() {
  const [showAddCaller, setShowAddCaller] = useState(false);
  const [searchPhone, setSearchPhone] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const navigate = useNavigate();
  const { callers } = useCallerStore();
  const { getUserCompanyId } = useAuthStore();

  const handleSearchCaller = async () => {
    if (!searchPhone.trim()) {
      toast.error('Please enter a phone number to search');
      return;
    }

    setIsSearching(true);
    try {
      // Search in local callers first
      const localCaller = callers.find(caller => 
        caller.phone_number.includes(searchPhone.trim())
      );

      if (localCaller) {
        navigate(`/caller/${localCaller.id}`);
        toast.success('Caller found!');
      } else {
        toast.info('No caller found with that phone number');
      }
    } catch (error) {
      console.error('Search failed:', error);
      toast.error('Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const companyId = getUserCompanyId();
      if (!companyId) {
        throw new Error('No company ID found');
      }

      // Get all calls for export
      const calls = await callsAPI.getAll(companyId);
      
      // Convert to CSV format
      const csvHeaders = ['Date', 'Time', 'Caller Name', 'Phone Number', 'Status', 'Duration'];
      const csvData = calls.map(call => [
        new Date(call.timestamp).toLocaleDateString(),
        new Date(call.timestamp).toLocaleTimeString(),
        call.caller?.name || 'Unknown',
        call.caller_number,
        call.call_status,
        call.duration_seconds ? `${Math.floor(call.duration_seconds / 60)}:${(call.duration_seconds % 60).toString().padStart(2, '0')}` : '0:00'
      ]);

      const csvContent = [
        csvHeaders.join(','),
        ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `call_history_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Call history exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

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
      onClick: () => navigate('/settings')
    },
    {
      name: 'Export Data',
      description: 'Download call history as CSV',
      icon: FiDownload,
      color: 'bg-green-50 text-green-600',
      onClick: handleExportData,
      loading: isExporting
    }
  ];

  return (
    <>
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
          
          {/* Search Section */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Callers
            </label>
            <div className="flex space-x-2">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <SafeIcon icon={FiSearch} className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchPhone}
                  onChange={(e) => setSearchPhone(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearchCaller()}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter phone number"
                />
              </div>
              <button
                onClick={handleSearchCaller}
                disabled={isSearching}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {isSearching ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {actions.map((action, index) => (
              <motion.button
                key={action.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={action.onClick}
                disabled={action.loading}
                className="w-full flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all disabled:opacity-50"
              >
                <div className={`rounded-lg p-2 ${action.color}`}>
                  <SafeIcon icon={action.icon} className="h-5 w-5" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-gray-900">
                    {action.loading ? 'Processing...' : action.name}
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