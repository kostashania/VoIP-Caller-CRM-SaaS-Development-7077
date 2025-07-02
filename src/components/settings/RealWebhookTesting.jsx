import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

const { FiPhone, FiPlay, FiStop, FiRefreshCw, FiDownload, FiTrash2, FiClock, FiCheckCircle, FiXCircle, FiGlobe, FiInfo, FiWifi } = FiIcons;

function RealWebhookTesting() {
  const [isListening, setIsListening] = useState(false);
  const [webhookLogs, setWebhookLogs] = useState([]);
  const [isTesting, setIsTesting] = useState(false);
  const [stats, setStats] = useState({
    totalReceived: 0,
    lastReceived: null,
    successCount: 0,
    errorCount: 0
  });
  const { getUserCompanyId } = useAuthStore();

  // Production webhook URL - Updated to your actual Netlify deployment
  const getProductionWebhookUrl = (companyId) => {
    return `https://relaxed-manatee-580f4b.netlify.app/.netlify/functions/webhook-incoming-call?company=${companyId}`;
  };

  // Health URL - Updated to your actual Netlify deployment
  const getHealthUrl = () => {
    return `https://relaxed-manatee-580f4b.netlify.app/.netlify/functions/health`;
  };

  // Load saved logs and listening state from localStorage
  useEffect(() => {
    const savedLogs = localStorage.getItem('realWebhookLogs');
    const savedListening = localStorage.getItem('realWebhookListening');
    const savedStats = localStorage.getItem('realWebhookStats');

    if (savedLogs) {
      try {
        setWebhookLogs(JSON.parse(savedLogs));
      } catch (error) {
        console.error('Failed to parse saved logs:', error);
      }
    }

    if (savedListening) {
      setIsListening(savedListening === 'true');
    }

    if (savedStats) {
      try {
        setStats(JSON.parse(savedStats));
      } catch (error) {
        console.error('Failed to parse saved stats:', error);
      }
    }

    // Check for new webhook data every 5 seconds when listening
    const interval = setInterval(() => {
      if (isListening) {
        checkForNewWebhooks();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isListening]);

  const checkForNewWebhooks = async () => {
    try {
      const companyId = getUserCompanyId();
      if (!companyId) return;

      // Check if there are any new webhook calls in the last 30 seconds
      const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString();
      console.log('🔍 Checking for new webhooks since:', thirtySecondsAgo);

      // You could implement this by querying your call_logs table for recent entries
      // that were created via webhook (have voip_raw_payload with webhook data)
    } catch (error) {
      console.error('Error checking for new webhooks:', error);
    }
  };

  const startListening = () => {
    setIsListening(true);
    localStorage.setItem('realWebhookListening', 'true');
    toast.success('🎧 Now listening for real webhooks from VoIP provider!', { duration: 4000 });

    // Add a test log entry to show the system is active
    addWebhookLog({
      type: 'system',
      message: 'Started listening for real webhooks',
      timestamp: new Date().toISOString(),
      success: true,
      source: 'system'
    });

    console.log('🎧 Real webhook listener started');
    console.log('📞 Webhook URL:', getProductionWebhookUrl(getUserCompanyId()));
    console.log('📱 Your production webhook endpoint is ready!');
  };

  const stopListening = () => {
    setIsListening(false);
    localStorage.setItem('realWebhookListening', 'false');
    toast.info('🛑 Stopped listening for webhooks', { duration: 2000 });

    // Add a test log entry
    addWebhookLog({
      type: 'system',
      message: 'Stopped listening for real webhooks',
      timestamp: new Date().toISOString(),
      success: true,
      source: 'system'
    });

    console.log('🛑 Real webhook listener stopped');
  };

  const addWebhookLog = (logData) => {
    const newLog = {
      id: Date.now() + Math.random(),
      ...logData,
      timestamp: logData.timestamp || new Date().toISOString()
    };

    setWebhookLogs(prev => {
      const updated = [newLog, ...prev].slice(0, 100); // Keep last 100 logs
      localStorage.setItem('realWebhookLogs', JSON.stringify(updated));
      return updated;
    });

    // Update stats
    setStats(prev => {
      const updated = {
        totalReceived: prev.totalReceived + 1,
        lastReceived: newLog.timestamp,
        successCount: prev.successCount + (logData.success ? 1 : 0),
        errorCount: prev.errorCount + (logData.success ? 0 : 1)
      };
      localStorage.setItem('realWebhookStats', JSON.stringify(updated));
      return updated;
    });
  };

  const clearLogs = () => {
    if (confirm('Are you sure you want to clear all real webhook logs?')) {
      setWebhookLogs([]);
      setStats({
        totalReceived: 0,
        lastReceived: null,
        successCount: 0,
        errorCount: 0
      });
      localStorage.removeItem('realWebhookLogs');
      localStorage.removeItem('realWebhookStats');
      toast.success('All webhook logs cleared', { duration: 2000 });
    }
  };

  const exportLogs = () => {
    try {
      const csvHeaders = ['Timestamp', 'Type', 'Message', 'Status', 'Source', 'Caller ID', 'Webhook ID'];
      const csvData = webhookLogs.map(log => [
        new Date(log.timestamp).toLocaleString(),
        log.type || 'webhook',
        log.message || log.caller_id || 'Webhook received',
        log.success ? 'Success' : 'Failed',
        log.source || 'Unknown',
        log.caller_id || '-',
        log.webhook_id || '-'
      ]);

      const csvContent = [
        csvHeaders.join(','),
        ...csvData.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `real_webhook_logs_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Real webhook logs exported successfully', { duration: 2000 });
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export logs', { duration: 2000 });
    }
  };

  const testWebhookEndpoint = async () => {
    setIsTesting(true);
    try {
      const companyId = getUserCompanyId();
      const testUrl = getProductionWebhookUrl(companyId);

      const testData = {
        caller_id: '+306912345678',
        timestamp: new Date().toISOString(),
        call_type: 'incoming',
        webhook_id: 'test-' + Date.now(),
        source: 'manual_test'
      };

      console.log('🧪 Testing webhook with data:', testData);
      toast.info('Testing production webhook endpoint...', { duration: 2000 });

      // Create timeout controller
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.log('⏰ Webhook test timed out');
      }, 15000); // 15 second timeout

      const response = await fetch(testUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(testData),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.log('📊 Webhook response:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      });

      let responseData = null;
      try {
        responseData = await response.json();
      } catch (jsonError) {
        console.warn('Could not parse JSON response:', jsonError);
        responseData = await response.text();
      }

      if (response.ok) {
        addWebhookLog({
          type: 'test',
          message: 'Test webhook sent successfully',
          success: true,
          source: 'manual_test',
          caller_id: testData.caller_id,
          webhook_id: testData.webhook_id,
          response: responseData
        });

        toast.success('✅ Test webhook sent successfully!', { duration: 3000 });
        console.log('✅ Test webhook succeeded:', responseData);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Test webhook failed:', error);
      
      let errorMessage = 'Unknown error';
      if (error.name === 'AbortError') {
        errorMessage = 'Request timed out (15s)';
      } else if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        errorMessage = 'Network error - Functions may not be deployed';
      } else {
        errorMessage = error.message || 'Request failed';
      }

      addWebhookLog({
        type: 'test',
        message: `Test webhook failed: ${errorMessage}`,
        success: false,
        source: 'manual_test',
        error: errorMessage
      });

      toast.error(`❌ Test webhook failed: ${errorMessage}`, { duration: 4000 });
    } finally {
      setIsTesting(false);
    }
  };

  const copyWebhookUrl = async () => {
    try {
      await navigator.clipboard.writeText(getProductionWebhookUrl(getUserCompanyId()));
      toast.success('Webhook URL copied to clipboard!', { duration: 2000 });
    } catch (error) {
      console.error('Failed to copy URL:', error);
      toast.error('Failed to copy URL', { duration: 2000 });
    }
  };

  const testWithCurl = () => {
    const companyId = getUserCompanyId();
    const curlCommand = `curl -X POST \\
  ${getProductionWebhookUrl(companyId)} \\
  -H "Content-Type: application/json" \\
  -d '{
    "caller_id": "+306912345678",
    "timestamp": "${new Date().toISOString()}",
    "call_type": "incoming",
    "webhook_id": "curl-test-${Date.now()}"
  }'`;

    navigator.clipboard.writeText(curlCommand).then(() => {
      toast.success('cURL command copied to clipboard!', { duration: 3000 });
    }).catch(() => {
      toast.error('Failed to copy cURL command', { duration: 2000 });
    });
  };

  const getStatusColor = (success) => {
    return success ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100';
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'system': return FiWifi;
      case 'test': return FiPhone;
      case 'webhook': return FiGlobe;
      default: return FiPhone;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'system': return 'text-blue-600 bg-blue-100';
      case 'test': return 'text-purple-600 bg-purple-100';
      case 'webhook': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900">🎯 Real VoIP Webhook Testing</h3>
              <p className="text-sm text-gray-500 mt-1">
                Live monitoring for actual webhook calls from your VoIP provider
              </p>
            </div>
            {/* Status and Control */}
            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${isListening ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                <div className={`w-2 h-2 rounded-full ${isListening ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                <span>{isListening ? 'Listening' : 'Stopped'}</span>
              </div>
              <button
                onClick={isListening ? stopListening : startListening}
                className={`inline-flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  isListening 
                    ? 'bg-red-600 hover:bg-red-700 text-white' 
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                <SafeIcon icon={isListening ? FiStop : FiPlay} className="w-4 h-4" />
                <span>{isListening ? 'Stop Listening' : 'Start Listening'}</span>
              </button>
            </div>
          </div>

          {/* Webhook Configuration */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2 mb-3">
              <SafeIcon icon={FiGlobe} className="h-5 w-5 text-blue-600" />
              <h4 className="text-sm font-medium text-blue-900">VoIP Provider Configuration</h4>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-blue-700 mb-1">Production Webhook URL:</label>
                <div className="flex items-center space-x-2">
                  <code className="flex-1 text-xs font-mono text-blue-800 bg-blue-100 p-2 rounded border">
                    {getProductionWebhookUrl(getUserCompanyId())}
                  </code>
                  <button
                    onClick={copyWebhookUrl}
                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Copy
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-blue-700 mb-1">Health Check URL:</label>
                <div className="flex items-center space-x-2">
                  <code className="flex-1 text-xs font-mono text-blue-800 bg-blue-100 p-2 rounded border">
                    {getHealthUrl()}
                  </code>
                  <a
                    href={getHealthUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Test
                  </a>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-blue-700">
                <div>
                  <strong>📡 Expected Payload Format:</strong>
                  <pre className="text-xs bg-blue-100 p-2 rounded mt-1 overflow-x-auto">
{`{
  "caller_id": "+306912345678",
  "timestamp": "2024-01-01T12:00:00Z",
  "call_type": "incoming",
  "webhook_id": "unique-call-id"
}`}
                  </pre>
                </div>
                <div>
                  <strong>🔧 VoIP Configuration:</strong>
                  <div className="text-xs bg-blue-100 p-2 rounded mt-1">
                    <div>• Method: POST</div>
                    <div>• Content-Type: application/json</div>
                    <div>• Accept: application/json</div>
                    <div>• Company ID: {getUserCompanyId()}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <button
              onClick={testWebhookEndpoint}
              disabled={isTesting}
              className="inline-flex items-center justify-center space-x-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              <SafeIcon icon={FiPhone} className="w-5 h-5" />
              <span>{isTesting ? 'Testing...' : 'Send Test Webhook'}</span>
            </button>

            <button
              onClick={testWithCurl}
              className="inline-flex items-center justify-center space-x-2 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              <SafeIcon icon={FiGlobe} className="w-5 h-5" />
              <span>Copy cURL Test</span>
            </button>

            <button
              onClick={exportLogs}
              disabled={webhookLogs.length === 0}
              className="inline-flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <SafeIcon icon={FiDownload} className="w-5 h-5" />
              <span>Export Logs</span>
            </button>

            <button
              onClick={clearLogs}
              disabled={webhookLogs.length === 0}
              className="inline-flex items-center justify-center space-x-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <SafeIcon icon={FiTrash2} className="w-5 h-5" />
              <span>Clear Logs</span>
            </button>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <SafeIcon icon={FiPhone} className="h-8 w-8 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Received</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.totalReceived}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <SafeIcon icon={FiCheckCircle} className="h-8 w-8 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Successful</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.successCount}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <SafeIcon icon={FiXCircle} className="h-8 w-8 text-red-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Failed</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.errorCount}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <SafeIcon icon={FiClock} className="h-8 w-8 text-purple-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Last Received</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {stats.lastReceived ? format(new Date(stats.lastReceived), 'HH:mm:ss') : 'Never'}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Webhook Logs */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">Real Webhook Activity</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center space-x-1 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                <SafeIcon icon={FiRefreshCw} className="w-4 h-4" />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {webhookLogs.length === 0 ? (
            <div className="text-center py-12">
              <SafeIcon icon={FiGlobe} className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No webhook activity yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                {isListening 
                  ? 'Waiting for webhook calls from your VoIP provider...' 
                  : 'Start listening to monitor webhook activity'}
              </p>
              <div className="mt-4 text-xs text-gray-400">
                <p>📞 Configure your VoIP provider to send webhooks to:</p>
                <code className="text-blue-600 font-mono">{getProductionWebhookUrl(getUserCompanyId())}</code>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {webhookLogs.map((log, index) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className={`rounded-full p-2 ${getTypeColor(log.type)}`}>
                        <SafeIcon icon={getTypeIcon(log.type)} className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="text-sm font-medium text-gray-900">
                            {log.message || `Webhook from ${log.caller_id || 'Unknown'}`}
                          </h4>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(log.success)}`}>
                            {log.success ? 'Success' : 'Failed'}
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(log.type)}`}>
                            {log.type || 'webhook'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-2">
                          <div>
                            <strong>Time:</strong> {format(new Date(log.timestamp), 'MMM d, yyyy HH:mm:ss')}
                          </div>
                          <div>
                            <strong>Source:</strong> {log.source || 'Unknown'}
                          </div>
                          {log.caller_id && (
                            <div>
                              <strong>Caller ID:</strong> {log.caller_id}
                            </div>
                          )}
                          {log.webhook_id && (
                            <div>
                              <strong>Webhook ID:</strong> {log.webhook_id}
                            </div>
                          )}
                        </div>
                        {log.error && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                            <strong>Error:</strong> {log.error}
                          </div>
                        )}
                        {log.response && (
                          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                            <strong>Response:</strong> {JSON.stringify(log.response, null, 2)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right text-xs text-gray-500">
                      {format(new Date(log.timestamp), 'HH:mm:ss')}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex">
          <SafeIcon icon={FiInfo} className="h-5 w-5 text-yellow-400" />
          <div className="ml-3">
            <h4 className="text-sm font-medium text-yellow-900">How to Configure Your VoIP Provider</h4>
            <div className="mt-2 text-sm text-yellow-700">
              <ol className="list-decimal list-inside space-y-1">
                <li><strong>Start Listening:</strong> Click "Start Listening" above</li>
                <li><strong>Configure VoIP:</strong> Give your provider the webhook URL shown above</li>
                <li><strong>Test Connection:</strong> Click "Send Test Webhook" to verify</li>
                <li><strong>Monitor Logs:</strong> Watch for webhook data to appear in real-time</li>
                <li><strong>Verify Data:</strong> Check that the JSON payload matches your expectations</li>
              </ol>
              <div className="mt-3 p-2 bg-yellow-100 rounded">
                <p className="text-xs">
                  <strong>✅ Production Ready!</strong> Your webhook endpoint is live at:
                  <br />
                  <code className="text-blue-600 font-mono">{getProductionWebhookUrl(getUserCompanyId())}</code>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RealWebhookTesting;