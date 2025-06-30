import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';
import { webhookService } from '../../services/webhookService';

const { FiList, FiRefreshCw, FiTrash2, FiPhone, FiClock, FiUser, FiCheckCircle, FiXCircle, FiEye, FiDownload } = FiIcons;

function WebhookLogs() {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLogs();
    
    // Refresh logs every 5 seconds when component is active
    const interval = setInterval(loadLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadLogs = () => {
    try {
      const webhookLogs = webhookService.getWebhookLogs();
      setLogs(webhookLogs);
    } catch (error) {
      console.error('Failed to load webhook logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearLogs = () => {
    if (confirm('Are you sure you want to clear all webhook logs?')) {
      webhookService.clearWebhookLogs();
      setLogs([]);
    }
  };

  const exportLogs = () => {
    try {
      const csvHeaders = ['Timestamp', 'Caller ID', 'Status', 'Source', 'Webhook ID'];
      const csvData = logs.map(log => [
        new Date(log.timestamp).toLocaleString(),
        log.caller_id || 'Unknown',
        log.success ? 'Success' : 'Failed',
        log.source || 'Unknown',
        log.webhook_id || '-'
      ]);

      const csvContent = [
        csvHeaders.join(','),
        ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `webhook_logs_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to export logs:', error);
    }
  };

  const getStatusColor = (success) => {
    return success ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Webhook Activity Logs</h3>
            <p className="text-sm text-gray-500 mt-1">
              Real-time log of all webhook calls received and processed.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={loadLogs}
              className="inline-flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <SafeIcon icon={FiRefreshCw} className="w-4 h-4" />
              <span>Refresh</span>
            </button>
            {logs.length > 0 && (
              <>
                <button
                  onClick={exportLogs}
                  className="inline-flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <SafeIcon icon={FiDownload} className="w-4 h-4" />
                  <span>Export</span>
                </button>
                <button
                  onClick={clearLogs}
                  className="inline-flex items-center space-x-2 px-3 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 hover:bg-red-50"
                >
                  <SafeIcon icon={FiTrash2} className="w-4 h-4" />
                  <span>Clear</span>
                </button>
              </>
            )}
          </div>
        </div>

        {logs.length === 0 ? (
          <div className="text-center py-12">
            <SafeIcon icon={FiList} className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No webhook logs</h3>
            <p className="mt-1 text-sm text-gray-500">
              Webhook activity will appear here when calls are received.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {logs.map((log, index) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className={`rounded-full p-2 ${getStatusColor(log.success)}`}>
                      <SafeIcon 
                        icon={log.success ? FiCheckCircle : FiXCircle} 
                        className="h-4 w-4" 
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="text-sm font-medium text-gray-900">
                          📞 Webhook Call from {log.caller_id || 'Unknown Number'}
                        </h4>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(log.success)}`}>
                          {log.success ? 'Success' : 'Failed'}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                        <div className="flex items-center space-x-2">
                          <SafeIcon icon={FiClock} className="w-4 h-4" />
                          <span>{format(new Date(log.timestamp), 'MMM d, yyyy HH:mm:ss')}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <SafeIcon icon={FiUser} className="w-4 h-4" />
                          <span>Source: {log.source || 'Unknown'}</span>
                        </div>
                      </div>

                      {log.webhook_id && (
                        <div className="text-xs text-gray-500 mb-2">
                          Webhook ID: {log.webhook_id}
                        </div>
                      )}

                      {log.error && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                          <strong>Error:</strong> {log.error}
                        </div>
                      )}

                      {log.caller_found !== undefined && (
                        <div className="mt-2 text-sm">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            log.caller_found 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {log.caller_found ? '✅ Known Caller' : '❓ Unknown Caller'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-xs text-gray-500">
                      {format(new Date(log.timestamp), 'HH:mm:ss')}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {logs.length > 0 && (
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Showing {logs.length} webhook {logs.length === 1 ? 'call' : 'calls'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default WebhookLogs;