import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';
import { webhookService } from '../../services/webhookService';
import toast from 'react-hot-toast';

const { FiList, FiTrash2, FiDownload, FiRefreshCw, FiEye, FiX, FiCheckCircle, FiAlertCircle, FiClock, FiPhone, FiFilter, FiSearch } = FiIcons;

function WebhookLogs() {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [selectedLog, setSelectedLog] = useState(null);
  const [showLogDetails, setShowLogDetails] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadLogs();
    // Refresh logs every 5 seconds when webhook service is active
    const interval = setInterval(() => {
      if (webhookService.getListeningStatus()) {
        loadLogs();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    filterLogs();
  }, [logs, statusFilter, sourceFilter, searchTerm]);

  const loadLogs = () => {
    const webhookLogs = webhookService.getWebhookLogs();
    setLogs(webhookLogs);
  };

  const filterLogs = () => {
    let filtered = [...logs];

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(log => log.status === statusFilter);
    }

    // Filter by source
    if (sourceFilter !== 'all') {
      filtered = filtered.filter(log => log.source === sourceFilter);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(log => 
        log.callerNumber.toLowerCase().includes(term) ||
        log.source.toLowerCase().includes(term) ||
        (log.result.error && log.result.error.toLowerCase().includes(term)) ||
        (log.result.reason && log.result.reason.toLowerCase().includes(term))
      );
    }

    setFilteredLogs(filtered);
  };

  const handleClearLogs = () => {
    if (confirm('Are you sure you want to clear all webhook logs? This action cannot be undone.')) {
      webhookService.clearWebhookLogs();
      setLogs([]);
      setFilteredLogs([]);
      toast.success('Webhook logs cleared successfully');
    }
  };

  const handleExportLogs = () => {
    if (logs.length === 0) {
      toast.error('No logs to export');
      return;
    }
    webhookService.exportWebhookLogs();
  };

  const handleViewDetails = (log) => {
    setSelectedLog(log);
    setShowLogDetails(true);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return FiCheckCircle;
      case 'error': return FiAlertCircle;
      default: return FiClock;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getSourceIcon = (source) => {
    switch (source) {
      case 'test_webhook': return FiRefreshCw;
      case 'random_simulation': return FiClock;
      default: return FiPhone;
    }
  };

  // Get unique sources for filter
  const uniqueSources = [...new Set(logs.map(log => log.source))];

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Webhook Call Logs</h3>
            <p className="text-sm text-gray-500 mt-1">
              Real-time log of all incoming webhook calls and their processing results.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={loadLogs}
              className="inline-flex items-center space-x-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              <SafeIcon icon={FiRefreshCw} className="w-4 h-4" />
              <span>Refresh</span>
            </button>
            <button
              onClick={handleExportLogs}
              disabled={logs.length === 0}
              className="inline-flex items-center space-x-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <SafeIcon icon={FiDownload} className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handleClearLogs}
              disabled={logs.length === 0}
              className="inline-flex items-center space-x-2 px-3 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <SafeIcon icon={FiTrash2} className="w-4 h-4" />
              <span>Clear Logs</span>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center">
              <SafeIcon icon={FiList} className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Total Logs</p>
                <p className="text-2xl font-bold text-gray-900">{logs.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center">
              <SafeIcon icon={FiCheckCircle} className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Success</p>
                <p className="text-2xl font-bold text-green-600">
                  {logs.filter(log => log.status === 'success').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center">
              <SafeIcon icon={FiAlertCircle} className="h-8 w-8 text-red-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Errors</p>
                <p className="text-2xl font-bold text-red-600">
                  {logs.filter(log => log.status === 'error').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center">
              <SafeIcon icon={FiClock} className="h-8 w-8 text-purple-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Avg Process Time</p>
                <p className="text-2xl font-bold text-purple-600">
                  {logs.length > 0 
                    ? Math.round(logs.reduce((sum, log) => sum + (log.processingTime || 0), 0) / logs.length)
                    : 0}ms
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <SafeIcon icon={FiSearch} className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Search caller number, source, error..."
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">All Status</option>
                <option value="success">Success</option>
                <option value="error">Error</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Source
              </label>
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">All Sources</option>
                {uniqueSources.map(source => (
                  <option key={source} value={source}>
                    {source.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Results
              </label>
              <div className="text-sm text-gray-600 py-2">
                Showing {filteredLogs.length} of {logs.length} logs
              </div>
            </div>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <SafeIcon icon={FiList} className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {logs.length === 0 ? 'No webhook logs yet' : 'No logs match your filters'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {logs.length === 0 
                  ? 'Webhook calls will appear here when they are received.'
                  : 'Try adjusting your search or filter criteria.'
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Caller
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Source
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Process Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredLogs.map((log, index) => (
                    <motion.tr
                      key={log.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          <div className="font-medium">
                            {format(new Date(log.timestamp), 'MMM d, HH:mm:ss')}
                          </div>
                          <div className="text-xs text-gray-500">
                            {format(new Date(log.timestamp), 'yyyy')}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center">
                          <SafeIcon icon={FiPhone} className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="font-mono">{log.callerNumber}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <SafeIcon icon={getSourceIcon(log.source)} className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="capitalize">
                            {log.source.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(log.status)}`}>
                          <SafeIcon icon={getStatusIcon(log.status)} className="w-3 h-3 mr-1" />
                          <span className="capitalize">{log.status}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="font-mono">{log.processingTime || 0}ms</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleViewDetails(log)}
                          className="inline-flex items-center space-x-1 text-primary-600 hover:text-primary-500"
                        >
                          <SafeIcon icon={FiEye} className="w-4 h-4" />
                          <span>View</span>
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Log Details Modal */}
      <AnimatePresence>
        {showLogDetails && selectedLog && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-50"
                onClick={() => setShowLogDetails(false)}
              />

              {/* Modal */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-white rounded-lg shadow-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-medium text-gray-900">
                    Webhook Log Details
                  </h3>
                  <button
                    onClick={() => setShowLogDetails(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <SafeIcon icon={FiX} className="w-6 h-6" />
                  </button>
                </div>

                {/* Content */}
                <div className="space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Basic Information</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Timestamp:</span>
                          <span className="font-mono">{format(new Date(selectedLog.timestamp), 'PPpp')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Caller Number:</span>
                          <span className="font-mono">{selectedLog.callerNumber}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Company ID:</span>
                          <span className="font-mono">{selectedLog.companyId}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Source:</span>
                          <span className="capitalize">{selectedLog.source.replace(/_/g, ' ')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Processing Time:</span>
                          <span className="font-mono">{selectedLog.processingTime || 0}ms</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Result</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Status:</span>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedLog.status)}`}>
                            <SafeIcon icon={getStatusIcon(selectedLog.status)} className="w-3 h-3 mr-1" />
                            {selectedLog.status}
                          </span>
                        </div>
                        {selectedLog.result.callLogId && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Call Log ID:</span>
                            <span className="font-mono">{selectedLog.result.callLogId}</span>
                          </div>
                        )}
                        {selectedLog.result.callerFound !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Caller Found:</span>
                            <span className={selectedLog.result.callerFound ? 'text-green-600' : 'text-red-600'}>
                              {selectedLog.result.callerFound ? 'Yes' : 'No'}
                            </span>
                          </div>
                        )}
                        {(selectedLog.result.error || selectedLog.result.reason) && (
                          <div>
                            <span className="text-gray-500">Error:</span>
                            <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
                              {selectedLog.result.error || selectedLog.result.reason}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Raw Webhook Data */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Raw Webhook Data</h4>
                    <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs overflow-x-auto">
                      {JSON.stringify(selectedLog.webhookData, null, 2)}
                    </pre>
                  </div>

                  {/* Full Result Data */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Processing Result</h4>
                    <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs overflow-x-auto">
                      {JSON.stringify(selectedLog.result, null, 2)}
                    </pre>
                  </div>
                </div>

                {/* Close Button */}
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setShowLogDetails(false)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

export default WebhookLogs;