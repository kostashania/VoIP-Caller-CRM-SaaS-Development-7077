import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';
import { useCallStore } from '../../store/callStore';
import { useAuthStore } from '../../store/authStore';
import { callLogsAPI } from '../../services/supabaseAPI';
import toast from 'react-hot-toast';

const { FiPhone, FiPhoneCall, FiClock, FiUser, FiMapPin, FiFilter, FiDownload, FiRefreshCw } = FiIcons;

function CallHistory() {
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [isExporting, setIsExporting] = useState(false);
  
  const { callHistory, setCallHistory } = useCallStore();
  const { getUserCompanyId } = useAuthStore();

  useEffect(() => {
    loadCallHistory();
  }, []);

  const loadCallHistory = async () => {
    setIsLoading(true);
    try {
      const companyId = getUserCompanyId();
      if (!companyId) {
        throw new Error('No company ID found');
      }
      
      console.log('Loading call history for company:', companyId);
      const callsData = await callLogsAPI.getAll(companyId);
      console.log('Call history loaded:', callsData.length, 'calls');
      setCallHistory(callsData);
    } catch (error) {
      console.error('Failed to load call history:', error);
      toast.error('Failed to load call history');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'answered':
      case 'completed':
        return FiPhoneCall;
      case 'missed':
        return FiClock;
      default:
        return FiPhone;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'answered':
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'missed':
        return 'text-red-600 bg-red-100';
      case 'incoming':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '-';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleExportHistory = async () => {
    setIsExporting(true);
    try {
      // Create CSV content
      const csvHeaders = ['Date', 'Time', 'Caller Name', 'Phone Number', 'Status', 'Duration', 'Selected Address'];
      const csvData = filteredCalls.map(call => [
        format(new Date(call.timestamp), 'yyyy-MM-dd'),
        format(new Date(call.timestamp), 'HH:mm:ss'),
        call.caller?.name || 'Unknown Caller',
        call.caller_number,
        call.call_status,
        formatDuration(call.duration_seconds),
        call.selected_address?.label || 'None'
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
      toast.error('Failed to export call history');
    } finally {
      setIsExporting(false);
    }
  };

  // Filter calls
  const filteredCalls = callHistory.filter(call => {
    // Status filter
    if (filter !== 'all' && call.call_status !== filter) {
      return false;
    }

    // Date filter
    if (dateFilter !== 'all') {
      const callDate = new Date(call.timestamp);
      const now = new Date();
      
      switch (dateFilter) {
        case 'today':
          return callDate.toDateString() === now.toDateString();
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return callDate >= weekAgo;
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          return callDate >= monthAgo;
        default:
          return true;
      }
    }

    return true;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Call History
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            View all incoming calls and their details.
          </p>
        </div>
        <div className="mt-4 flex md:ml-4 md:mt-0 space-x-3">
          <button
            onClick={loadCallHistory}
            className="inline-flex items-center space-x-2 rounded-md bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-200"
          >
            <SafeIcon icon={FiRefreshCw} className="h-4 w-4" />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleExportHistory}
            disabled={isExporting}
            className="inline-flex items-center space-x-2 rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 disabled:opacity-50"
          >
            <SafeIcon icon={FiDownload} className="h-4 w-4" />
            <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Status
            </label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Calls</option>
              <option value="answered">Answered</option>
              <option value="completed">Completed</option>
              <option value="missed">Missed</option>
              <option value="incoming">Incoming</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Date
            </label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <SafeIcon icon={FiPhone} className="h-8 w-8 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Calls
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {filteredCalls.length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <SafeIcon icon={FiPhoneCall} className="h-8 w-8 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Answered
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {filteredCalls.filter(call => ['answered', 'completed'].includes(call.call_status)).length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <SafeIcon icon={FiClock} className="h-8 w-8 text-red-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Missed
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {filteredCalls.filter(call => call.call_status === 'missed').length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <SafeIcon icon={FiUser} className="h-8 w-8 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Known Callers
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {filteredCalls.filter(call => call.caller).length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Call History List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          {filteredCalls.length === 0 ? (
            <div className="text-center py-8">
              <SafeIcon icon={FiPhone} className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No calls found</h3>
              <p className="mt-1 text-sm text-gray-500">
                No calls match your current filter criteria.
              </p>
            </div>
          ) : (
            <div className="flow-root">
              <ul role="list" className="-my-5 divide-y divide-gray-200">
                {filteredCalls.map((call, index) => (
                  <motion.li
                    key={call.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="py-4"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className={`rounded-full p-2 ${getStatusColor(call.call_status)}`}>
                          <SafeIcon icon={getStatusIcon(call.call_status)} className="h-4 w-4" />
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {call.caller?.name || 'Unknown Caller'}
                            </p>
                            <p className="text-sm text-gray-500 font-mono">
                              {call.caller_number || 'No number'}
                            </p>
                            {call.selected_address && (
                              <div className="flex items-center mt-1">
                                <SafeIcon icon={FiMapPin} className="h-3 w-3 text-gray-400 mr-1" />
                                <p className="text-xs text-gray-500">
                                  {call.selected_address.label}: {call.selected_address.address}
                                </p>
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-900">
                              {format(new Date(call.timestamp), 'MMM d, HH:mm')}
                            </p>
                            <p className="text-sm text-gray-500">
                              {formatDuration(call.duration_seconds)}
                            </p>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(call.call_status)}`}>
                              {call.call_status}
                            </span>
                          </div>
                        </div>
                        {call.caller && (
                          <div className="mt-2">
                            <Link
                              to={`/caller/${call.caller.id}`}
                              className="text-sm text-primary-600 hover:text-primary-500"
                            >
                              View contact details →
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CallHistory;