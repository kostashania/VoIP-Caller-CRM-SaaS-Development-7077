import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

const { FiPhone, FiPlay, FiStop, FiRefreshCw, FiDownload, FiTrash2, FiClock, FiCheckCircle, FiXCircle, FiGlobe, FiInfo, FiWifi, FiCopy, FiSend, FiTerminal, FiExternalLink, FiAlertTriangle } = FiIcons;

function WebhookTester() {
  const [isListening, setIsListening] = useState(false);
  const [webhookLogs, setWebhookLogs] = useState([]);
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [stats, setStats] = useState({
    totalReceived: 0,
    lastReceived: null,
    successCount: 0,
    errorCount: 0
  });
  const { getUserCompanyId } = useAuthStore();

  // Load saved data from localStorage
  useEffect(() => {
    const savedLogs = localStorage.getItem('webhookTestLogs');
    const savedStats = localStorage.getItem('webhookTestStats');

    if (savedLogs) {
      try {
        setWebhookLogs(JSON.parse(savedLogs));
      } catch (error) {
        console.error('Failed to parse saved logs:', error);
      }
    }

    if (savedStats) {
      try {
        setStats(JSON.parse(savedStats));
      } catch (error) {
        console.error('Failed to parse saved stats:', error);
      }
    }
  }, []);

  const getWebhookUrl = () => {
    const companyId = getUserCompanyId();
    // 🔧 FIXED: Use proper Netlify Functions URL structure
    return `${window.location.origin}/.netlify/functions/webhook-incoming-call?company=${companyId}`;
  };

  const getHealthUrl = () => {
    // 🔧 FIXED: Use proper Netlify Functions URL structure  
    return `${window.location.origin}/.netlify/functions/health`;
  };

  const addTestLog = (logData) => {
    const newLog = {
      id: Date.now() + Math.random(),
      ...logData,
      timestamp: new Date().toISOString()
    };

    setWebhookLogs(prev => {
      const updated = [newLog, ...prev].slice(0, 50);
      localStorage.setItem('webhookTestLogs', JSON.stringify(updated));
      return updated;
    });

    setStats(prev => {
      const updated = {
        totalReceived: prev.totalReceived + 1,
        lastReceived: newLog.timestamp,
        successCount: prev.successCount + (logData.success ? 1 : 0),
        errorCount: prev.errorCount + (logData.success ? 0 : 1)
      };
      localStorage.setItem('webhookTestStats', JSON.stringify(updated));
      return updated;
    });
  };

  // Test 1: Check Health Endpoint
  const testHealthEndpoint = async () => {
    setIsTesting(true);
    toast.info('🏥 Testing health endpoint...', { duration: 2000 });

    try {
      const healthUrl = getHealthUrl();
      console.log('🎯 Testing health URL:', healthUrl);

      const startTime = Date.now();
      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        },
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });

      const responseTime = Date.now() - startTime;
      const isSuccess = response.ok;

      console.log('📊 Health response:', {
        status: response.status,
        ok: response.ok,
        responseTime
      });

      let responseData = null;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        try {
          responseData = await response.json();
        } catch (jsonError) {
          console.warn('Failed to parse JSON response:', jsonError);
          responseData = await response.text();
        }
      } else {
        responseData = await response.text();
      }

      const result = {
        test: 'Health Check',
        success: isSuccess,
        status: response.status,
        responseTime: responseTime,
        response: responseData,
        url: healthUrl,
        contentType: contentType
      };

      setTestResults(result);
      addTestLog({
        type: 'health',
        message: `Health check ${isSuccess ? 'passed' : 'failed'} (${response.status})`,
        success: isSuccess,
        details: result
      });

      if (isSuccess) {
        toast.success(`✅ Health check passed (${responseTime}ms)`, { duration: 3000 });
      } else {
        toast.error(`❌ Health check failed: ${response.status} ${response.statusText}`, { duration: 4000 });
      }

    } catch (error) {
      console.error('Health test error:', error);

      const result = {
        test: 'Health Check',
        success: false,
        error: error.message,
        url: getHealthUrl(),
        errorType: error.name
      };

      setTestResults(result);
      addTestLog({
        type: 'health',
        message: `Health check failed: ${error.message}`,
        success: false,
        error: error.message
      });

      if (error.name === 'TimeoutError') {
        toast.error(`❌ Health check timed out (30s)`, { duration: 4000 });
      } else if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        toast.error(`❌ Network error: Functions not deployed or inaccessible`, { duration: 4000 });
      } else {
        toast.error(`❌ Health check failed: ${error.message}`, { duration: 4000 });
      }
    } finally {
      setIsTesting(false);
    }
  };

  // Test 2: Send Test Webhook
  const testWebhookEndpoint = async () => {
    setIsTesting(true);
    toast.info('📞 Testing webhook endpoint...', { duration: 2000 });

    try {
      const companyId = getUserCompanyId();
      const testData = {
        caller_id: '+306912345678',
        timestamp: new Date().toISOString(),
        call_type: 'incoming',
        webhook_id: `test-${Date.now()}`,
        source: 'ui_test'
      };

      const webhookUrl = getWebhookUrl();
      console.log('🎯 Testing webhook URL:', webhookUrl);
      console.log('📞 Test data:', testData);

      const startTime = Date.now();
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify(testData),
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });

      const responseTime = Date.now() - startTime;
      const isSuccess = response.ok;

      console.log('📊 Webhook response:', {
        status: response.status,
        ok: response.ok,
        responseTime
      });

      let responseData = null;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        try {
          responseData = await response.json();
        } catch (jsonError) {
          console.warn('Failed to parse JSON response:', jsonError);
          responseData = await response.text();
        }
      } else {
        responseData = await response.text();
      }

      const result = {
        test: 'Webhook POST',
        success: isSuccess,
        status: response.status,
        responseTime: responseTime,
        request: testData,
        response: responseData,
        url: webhookUrl,
        contentType: contentType
      };

      setTestResults(result);
      addTestLog({
        type: 'webhook',
        message: `Webhook test ${isSuccess ? 'passed' : 'failed'} (${response.status})`,
        success: isSuccess,
        caller_id: testData.caller_id,
        webhook_id: testData.webhook_id,
        details: result
      });

      if (isSuccess) {
        toast.success(`✅ Webhook test passed (${responseTime}ms)`, { duration: 3000 });
      } else {
        toast.error(`❌ Webhook test failed: ${response.status} ${response.statusText}`, { duration: 4000 });
      }

    } catch (error) {
      console.error('Webhook test error:', error);

      const result = {
        test: 'Webhook POST',
        success: false,
        error: error.message,
        url: getWebhookUrl(),
        errorType: error.name
      };

      setTestResults(result);
      addTestLog({
        type: 'webhook',
        message: `Webhook test failed: ${error.message}`,
        success: false,
        error: error.message
      });

      if (error.name === 'TimeoutError') {
        toast.error(`❌ Webhook test timed out (30s)`, { duration: 4000 });
      } else if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        toast.error(`❌ Network error: Functions not deployed or inaccessible`, { duration: 4000 });
      } else {
        toast.error(`❌ Webhook test failed: ${error.message}`, { duration: 4000 });
      }
    } finally {
      setIsTesting(false);
    }
  };

  // Test 3: Run Full Test Suite
  const runFullTestSuite = async () => {
    setIsTesting(true);
    toast.info('🧪 Running full test suite...', { duration: 2000 });

    // Test 1: Health Check
    await testHealthEndpoint();
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 2: Webhook POST
    await testWebhookEndpoint();
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 3: Multiple webhooks
    for (let i = 1; i <= 3; i++) {
      try {
        const companyId = getUserCompanyId();
        const testData = {
          caller_id: `+155500000${i}`,
          timestamp: new Date().toISOString(),
          call_type: 'incoming',
          webhook_id: `batch-test-${Date.now()}-${i}`,
          source: 'batch_test'
        };

        const response = await fetch(getWebhookUrl(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(testData),
          signal: AbortSignal.timeout(15000) // 15 second timeout for batch
        });

        addTestLog({
          type: 'batch',
          message: `Batch test ${i}/3 ${response.ok ? 'passed' : 'failed'} (${response.status})`,
          success: response.ok,
          caller_id: testData.caller_id,
          webhook_id: testData.webhook_id
        });

        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        addTestLog({
          type: 'batch',
          message: `Batch test ${i}/3 failed: ${error.message}`,
          success: false,
          error: error.message
        });
      }
    }

    setIsTesting(false);
    toast.success('🎉 Test suite completed! Check logs below.', { duration: 3000 });
  };

  const copyWebhookUrl = async () => {
    try {
      await navigator.clipboard.writeText(getWebhookUrl());
      toast.success('📋 Webhook URL copied to clipboard!', { duration: 2000 });
    } catch (error) {
      toast.error('Failed to copy URL', { duration: 2000 });
    }
  };

  const copyCurlCommand = async () => {
    const curlCommand = `curl -X POST \\
  "${getWebhookUrl()}" \\
  -H "Content-Type: application/json" \\
  -H "Accept: application/json" \\
  -d '{
    "caller_id": "+306912345678",
    "timestamp": "${new Date().toISOString()}",
    "call_type": "incoming", 
    "webhook_id": "curl-test-${Date.now()}",
    "source": "curl_test"
  }'`;

    try {
      await navigator.clipboard.writeText(curlCommand);
      toast.success('📋 cURL command copied to clipboard!', { duration: 2000 });
    } catch (error) {
      toast.error('Failed to copy cURL command', { duration: 2000 });
    }
  };

  const clearLogs = () => {
    if (confirm('Clear all test logs?')) {
      setWebhookLogs([]);
      setStats({
        totalReceived: 0,
        lastReceived: null,
        successCount: 0,
        errorCount: 0
      });
      setTestResults(null);
      localStorage.removeItem('webhookTestLogs');
      localStorage.removeItem('webhookTestStats');
      toast.success('🗑️ Logs cleared', { duration: 1500 });
    }
  };

  const exportLogs = () => {
    try {
      const csvHeaders = ['Timestamp', 'Type', 'Message', 'Status', 'Caller ID', 'Webhook ID', 'Error'];
      const csvData = webhookLogs.map(log => [
        new Date(log.timestamp).toLocaleString(),
        log.type || 'test',
        log.message || 'Test executed',
        log.success ? 'Success' : 'Failed',
        log.caller_id || '-',
        log.webhook_id || '-',
        log.error || '-'
      ]);

      const csvContent = [
        csvHeaders.join(','),
        ...csvData.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `webhook_test_logs_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('📊 Logs exported successfully', { duration: 2000 });
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export logs', { duration: 2000 });
    }
  };

  const getStatusColor = (success) => {
    return success ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100';
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'health': return FiWifi;
      case 'webhook': return FiPhone;
      case 'batch': return FiGlobe;
      default: return FiTerminal;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'health': return 'text-blue-600 bg-blue-100';
      case 'webhook': return 'text-green-600 bg-green-100';
      case 'batch': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Detect deployment type
  const isNetlify = window.location.hostname.includes('netlify.app') || window.location.hostname.includes('netlify.com');
  const isLocalhost = window.location.hostname === 'localhost';

  return (
    <div className="space-y-6">
      {/* Deployment Status */}
      <div className={`border rounded-lg p-4 ${isNetlify ? 'bg-green-50 border-green-200' : isLocalhost ? 'bg-blue-50 border-blue-200' : 'bg-yellow-50 border-yellow-200'}`}>
        <div className="flex items-center space-x-2 mb-2">
          <SafeIcon icon={isNetlify ? FiCheckCircle : FiInfo} className={`h-5 w-5 ${isNetlify ? 'text-green-600' : 'text-blue-600'}`} />
          <h4 className={`text-sm font-medium ${isNetlify ? 'text-green-900' : 'text-blue-900'}`}>
            {isNetlify ? '🚀 Netlify Deployment Detected' : isLocalhost ? '💻 Local Development Mode' : '🌐 Custom Domain Deployment'}
          </h4>
        </div>
        <p className={`text-sm ${isNetlify ? 'text-green-700' : 'text-blue-700'}`}>
          {isNetlify 
            ? 'Testing Netlify Functions endpoints as configured by Greta Support.'
            : isLocalhost 
              ? 'Testing local development endpoints. Functions will use Netlify structure.'
              : 'Testing deployed endpoints with Netlify Functions structure.'
          }
        </p>
        <div className="mt-3 p-3 bg-white border border-gray-200 rounded">
          <p className="text-sm font-medium text-gray-900">📍 Current Function Endpoints:</p>
          <div className="mt-1 space-y-1">
            <p className="text-xs text-gray-600">Health: <code className="bg-gray-100 px-1 rounded">{getHealthUrl()}</code></p>
            <p className="text-xs text-gray-600">Webhook: <code className="bg-gray-100 px-1 rounded">{getWebhookUrl()}</code></p>
          </div>
        </div>
      </div>

      {/* Rest of the component remains the same... */}
      {/* Header */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900">🧪 Netlify Function Tester</h3>
              <p className="text-sm text-gray-500 mt-1">
                Test your Netlify Functions with real HTTP requests
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isTesting ? 'bg-yellow-500 animate-pulse' : 'bg-gray-400'}`}></div>
              <span className="text-sm text-gray-600">
                {isTesting ? 'Testing...' : 'Ready'}
              </span>
            </div>
          </div>

          {/* Endpoint Information */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">🎯 Webhook Endpoint:</label>
                <div className="flex items-center space-x-2">
                  <code className="flex-1 text-xs font-mono text-gray-800 bg-white border p-2 rounded break-all">
                    {getWebhookUrl()}
                  </code>
                  <button 
                    onClick={copyWebhookUrl}
                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    <SafeIcon icon={FiCopy} className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">🏥 Health Endpoint:</label>
                <div className="flex items-center space-x-2">
                  <code className="flex-1 text-xs font-mono text-gray-800 bg-white border p-2 rounded break-all">
                    {getHealthUrl()}
                  </code>
                  <a 
                    href={getHealthUrl()} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    <SafeIcon icon={FiExternalLink} className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Test Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <button
              onClick={testHealthEndpoint}
              disabled={isTesting}
              className="inline-flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <SafeIcon icon={FiWifi} className="w-5 h-5" />
              <span>Test Health</span>
            </button>

            <button
              onClick={testWebhookEndpoint}
              disabled={isTesting}
              className="inline-flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <SafeIcon icon={FiPhone} className="w-5 h-5" />
              <span>Test Webhook</span>
            </button>

            <button
              onClick={runFullTestSuite}
              disabled={isTesting}
              className="inline-flex items-center justify-center space-x-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              <SafeIcon icon={FiPlay} className="w-5 h-5" />
              <span>Full Test Suite</span>
            </button>

            <button
              onClick={copyCurlCommand}
              className="inline-flex items-center justify-center space-x-2 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              <SafeIcon icon={FiTerminal} className="w-5 h-5" />
              <span>Copy cURL</span>
            </button>
          </div>

          {/* Test Results */}
          {testResults && (
            <div className={`border rounded-lg p-4 mb-6 ${testResults.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-center space-x-2 mb-3">
                <SafeIcon 
                  icon={testResults.success ? FiCheckCircle : FiXCircle} 
                  className={`w-5 h-5 ${testResults.success ? 'text-green-600' : 'text-red-600'}`} 
                />
                <h4 className={`font-medium ${testResults.success ? 'text-green-900' : 'text-red-900'}`}>
                  {testResults.test} - {testResults.success ? 'Success' : 'Failed'}
                </h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Status:</strong> {testResults.status || 'N/A'}
                </div>
                <div>
                  <strong>Response Time:</strong> {testResults.responseTime || 'N/A'}ms
                </div>
                <div className="md:col-span-2">
                  <strong>URL:</strong> 
                  <code className="text-xs bg-white px-1 py-0.5 rounded break-all">{testResults.url}</code>
                </div>
                {testResults.contentType && (
                  <div className="md:col-span-2">
                    <strong>Content Type:</strong> {testResults.contentType}
                  </div>
                )}
                {testResults.error && (
                  <div className="md:col-span-2">
                    <strong>Error:</strong> 
                    <span className="text-red-600">{testResults.error}</span>
                    {testResults.errorType && (
                      <span className="ml-2 text-xs text-red-500">({testResults.errorType})</span>
                    )}
                  </div>
                )}
                {testResults.response && (
                  <div className="md:col-span-2">
                    <strong>Response:</strong>
                    <pre className="text-xs bg-white p-2 rounded mt-1 overflow-x-auto max-h-32 whitespace-pre-wrap">
                      {typeof testResults.response === 'string' ? testResults.response : JSON.stringify(testResults.response, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <SafeIcon icon={FiTerminal} className="h-8 w-8 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Tests</dt>
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
                  <dt className="text-sm font-medium text-gray-500 truncate">Passed</dt>
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
                  <dt className="text-sm font-medium text-gray-500 truncate">Last Test</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {stats.lastReceived ? format(new Date(stats.lastReceived), 'HH:mm:ss') : 'Never'}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Test Logs */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">Test Activity Log</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={exportLogs}
                disabled={webhookLogs.length === 0}
                className="inline-flex items-center space-x-1 px-3 py-1 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200 disabled:opacity-50"
              >
                <SafeIcon icon={FiDownload} className="w-4 h-4" />
                <span>Export</span>
              </button>
              <button
                onClick={clearLogs}
                disabled={webhookLogs.length === 0}
                className="inline-flex items-center space-x-1 px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 disabled:opacity-50"
              >
                <SafeIcon icon={FiTrash2} className="w-4 h-4" />
                <span>Clear</span>
              </button>
            </div>
          </div>

          {webhookLogs.length === 0 ? (
            <div className="text-center py-12">
              <SafeIcon icon={FiTerminal} className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No tests run yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Click a test button above to start testing your Netlify Functions
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {webhookLogs.map((log, index) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className="border border-gray-200 rounded-lg p-3 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className={`rounded-full p-1.5 ${getTypeColor(log.type)}`}>
                        <SafeIcon icon={getTypeIcon(log.type)} className="h-3 w-3" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-1">
                          <h4 className="text-sm font-medium text-gray-900">
                            {log.message}
                          </h4>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(log.success)}`}>
                            {log.success ? 'Pass' : 'Fail'}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getTypeColor(log.type)}`}>
                            {log.type}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 text-xs text-gray-600">
                          <span>{format(new Date(log.timestamp), 'HH:mm:ss')}</span>
                          {log.caller_id && <span>📞 {log.caller_id}</span>}
                          {log.webhook_id && <span>🆔 {log.webhook_id}</span>}
                        </div>
                        {log.error && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                            <strong>Error:</strong> {log.error}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <SafeIcon icon={FiInfo} className="h-5 w-5 text-blue-400" />
          <div className="ml-3">
            <h4 className="text-sm font-medium text-blue-900">
              Netlify Functions Testing Guide
            </h4>
            <div className="mt-2 text-sm text-blue-700">
              <ol className="list-decimal list-inside space-y-1">
                <li><strong>Deploy Functions:</strong> Make sure your functions are deployed to Netlify</li>
                <li><strong>Check Functions:</strong> Verify functions appear in your Netlify dashboard</li>
                <li><strong>Test Health:</strong> Verify the health endpoint is responding</li>
                <li><strong>Test Webhook:</strong> Send a POST request to the webhook function</li>
                <li><strong>Monitor Logs:</strong> Check test results and error messages below</li>
              </ol>
              <div className="mt-3 p-2 bg-blue-100 rounded">
                <p className="text-xs">
                  <strong>✅ Greta Support Configuration Applied:</strong> Using proper Netlify Functions URL structure (/.netlify/functions/*)
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WebhookTester;