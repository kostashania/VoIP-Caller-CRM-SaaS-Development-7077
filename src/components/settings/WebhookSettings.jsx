import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';
import { useAuthStore } from '../../store/authStore';
import { webhookService } from '../../services/webhookService';
import { websocketService } from '../../services/websocketService';
import WebhookLogs from './WebhookLogs';
import RealWebhookTesting from './RealWebhookTesting';
import WebhookTester from './WebhookTester';

const { FiGlobe, FiSettings, FiPlay, FiStop, FiCopy, FiCheckCircle, FiAlertCircle, FiInfo, FiLink, FiActivity, FiClock, FiPhone, FiWifi, FiList, FiExternalLink, FiTarget, FiTerminal } = FiIcons;

function WebhookSettings() {
  const [isListening, setIsListening] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isRealMode, setIsRealMode] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [webhookStats, setWebhookStats] = useState({
    totalReceived: 0,
    todayReceived: 0,
    lastReceived: null
  });
  const [activeTab, setActiveTab] = useState('tester'); // 'tester', 'settings', 'logs', or 'real'
  const { getUserCompanyId } = useAuthStore();

  // Production webhook URL - you can change this based on your deployment
  const getProductionWebhookUrl = (companyId) => {
    // Check if we're on Netlify or local development
    const baseUrl = window.location.hostname.includes('netlify.app') 
      ? 'https://relaxed-manatee-580f4b.netlify.app'
      : window.location.origin;
    return `${baseUrl}/api/webhook/incoming-call/${companyId}`;
  };

  useEffect(() => {
    // Get webhook URL and listening status
    const companyId = getUserCompanyId();
    if (companyId) {
      const demoUrl = webhookService.getWebhookUrl(companyId);
      const realUrl = getProductionWebhookUrl(companyId);
      setWebhookUrl(isRealMode ? realUrl : demoUrl);
      setIsListening(webhookService.getListeningStatus());
      setIsSimulating(webhookService.getSimulationStatus());

      // Load webhook statistics
      loadWebhookStats();

      // Check WebSocket connection status (but don't auto-connect)
      const wsStatus = websocketService.getConnectionStatus();
      setConnectionStatus(wsStatus);
    }

    // Update status every 5 seconds
    const statusInterval = setInterval(() => {
      setIsListening(webhookService.getListeningStatus());
      setIsSimulating(webhookService.getSimulationStatus());
      loadWebhookStats();
      const wsStatus = websocketService.getConnectionStatus();
      setConnectionStatus(wsStatus);
    }, 5000);

    return () => clearInterval(statusInterval);
  }, [getUserCompanyId, isRealMode]);

  const loadWebhookStats = () => {
    const stats = webhookService.getStats();
    setWebhookStats(stats);
  };

  const toggleMode = () => {
    const newRealMode = !isRealMode;
    setIsRealMode(newRealMode);
    
    const companyId = getUserCompanyId();
    if (companyId) {
      const demoUrl = webhookService.getWebhookUrl(companyId);
      const realUrl = getProductionWebhookUrl(companyId);
      setWebhookUrl(newRealMode ? realUrl : demoUrl);
    }

    // If switching to demo mode, disable WebSocket
    if (!newRealMode) {
      websocketService.disable();
      setConnectionStatus({
        isConnected: false,
        isEnabled: false
      });
    }
  };

  const toggleWebhookListener = async () => {
    try {
      const companyId = getUserCompanyId();
      if (!companyId) {
        throw new Error('No company ID found');
      }

      if (isListening) {
        // Stop both webhook and WebSocket services
        webhookService.stopListening();
        websocketService.disable();
        setIsListening(false);
        setIsSimulating(false);
        toast.success('Webhook listener stopped', { duration: 2000 });
      } else {
        if (isRealMode) {
          // For real mode, we'll use the server endpoint directly
          console.log('🌐 Activating real webhook mode...');
          
          // Since we're using server-side webhook processing, we don't need WebSocket for production
          // We'll rely on the server endpoint at /api/webhook/incoming-call/:companyId
          webhookService.startListening(companyId);
          setIsListening(true);
          toast.success('Real webhook mode activated - ready to receive calls!', { duration: 4000 });
          
          // Show additional info about the production URL
          setTimeout(() => {
            toast.info(`Webhook URL: ${getProductionWebhookUrl(companyId)}`, { duration: 6000 });
          }, 1000);
        } else {
          // Demo mode
          webhookService.startListening(companyId);
          setIsListening(true);
          toast.success('Demo webhook listener started - test call in 10 seconds!', { duration: 3000 });
        }
      }
    } catch (error) {
      console.error('Failed to toggle webhook listener:', error);
      toast.error(error.message || 'Failed to toggle webhook listener');
    }
  };

  const toggleSimulation = () => {
    try {
      if (isSimulating) {
        webhookService.stopSimulation();
        setIsSimulating(false);
        toast.success('Call simulation stopped', { duration: 2000 });
      } else {
        if (!isListening && !connectionStatus?.isConnected) {
          toast.error('Please start webhook listener first');
          return;
        }

        const companyId = getUserCompanyId();
        webhookService.startRandomSimulation(companyId);
        setIsSimulating(true);
        toast.success('Random call simulation started (every 1-3 minutes)', { duration: 3000 });
      }
    } catch (error) {
      console.error('Failed to toggle simulation:', error);
      toast.error('Failed to toggle call simulation');
    }
  };

  const copyWebhookUrl = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      toast.success('Webhook URL copied to clipboard!', { duration: 2000 });
      // Reset copied state after 3 seconds
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      console.error('Failed to copy URL:', error);
      toast.error('Failed to copy URL');
    }
  };

  const testWebhook = async () => {
    try {
      const companyId = getUserCompanyId();
      
      if (isRealMode) {
        // Test real webhook endpoint
        try {
          const testUrl = getProductionWebhookUrl(companyId);
          const response = await fetch(testUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              caller_id: '+1234567890',
              timestamp: new Date().toISOString(),
              call_type: 'incoming',
              webhook_id: 'test-' + Date.now(),
              source: 'manual_test'
            })
          });

          if (response.ok) {
            const result = await response.json();
            console.log('Real webhook test result:', result);
            toast.success('Real webhook test sent successfully!', { duration: 3000 });
          } else {
            console.error('Real webhook test failed:', response.status, response.statusText);
            toast.error(`Webhook test failed: ${response.status} ${response.statusText}`);
          }
        } catch (fetchError) {
          console.log('Real webhook server error:', fetchError);
          // Fall back to demo test
          webhookService.sendTestCall(companyId);
          toast.success('Demo test webhook call sent (server endpoint not available)!', { duration: 2000 });
        }
      } else {
        // Demo mode test
        if (!isListening) {
          toast.error('Please start webhook listener first');
          return;
        }

        webhookService.sendTestCall(companyId);
        toast.success('Demo test webhook call sent!', { duration: 2000 });
      }

      loadWebhookStats();
    } catch (error) {
      console.error('Webhook test failed:', error);
      toast.error('Webhook test failed');
    }
  };

  const testProductionEndpoint = async () => {
    try {
      const companyId = getUserCompanyId();
      const testUrl = getProductionWebhookUrl(companyId);
      
      toast.info('Testing production webhook endpoint...', { duration: 2000 });
      
      const response = await fetch(testUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          caller_id: '+306912345678',
          timestamp: new Date().toISOString(),
          call_type: 'incoming',
          webhook_id: 'production-test-' + Date.now(),
          source: 'production_test'
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Production test result:', result);
        toast.success('✅ Production webhook endpoint is working!', { duration: 4000 });
      } else {
        console.error('Production test failed:', response.status, response.statusText);
        const errorText = await response.text();
        toast.error(`❌ Production test failed: ${response.status}`, { duration: 4000 });
        console.error('Error details:', errorText);
      }
    } catch (error) {
      console.error('Production endpoint test error:', error);
      toast.error(`❌ Production test error: ${error.message}`, { duration: 4000 });
    }
  };

  const isActivelyConnected = isListening || connectionStatus?.isConnected;

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('tester')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'tester' 
                ? 'border-primary-500 text-primary-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <SafeIcon icon={FiTerminal} className="w-4 h-4" />
              <span>🧪 Webhook Tester</span>
              <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-bold">
                NEW
              </span>
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'settings' 
                ? 'border-primary-500 text-primary-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <SafeIcon icon={FiSettings} className="w-4 h-4" />
              <span>Demo Webhooks</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('real')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'real' 
                ? 'border-primary-500 text-primary-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <SafeIcon icon={FiTarget} className="w-4 h-4" />
              <span>🎯 Real VoIP Testing</span>
              <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-bold">
                PRIORITY
              </span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'logs' 
                ? 'border-primary-500 text-primary-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <SafeIcon icon={FiList} className="w-4 h-4" />
              <span>Demo Logs</span>
              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                {webhookService.getWebhookLogsCount()}
              </span>
            </div>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'tester' ? (
        <WebhookTester />
      ) : activeTab === 'real' ? (
        <RealWebhookTesting />
      ) : activeTab === 'settings' ? (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Demo Webhook Configuration</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Configure demo webhook endpoint for testing call notifications.
                </p>
              </div>

              {/* Mode Toggle */}
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Demo</span>
                  <button
                    onClick={toggleMode}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      isRealMode ? 'bg-green-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isRealMode ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className="text-sm text-gray-600">Real</span>
                </div>

                {/* Status Indicators */}
                <div className="flex items-center space-x-3">
                  {/* Connection Status */}
                  <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
                    isRealMode && isListening 
                      ? 'bg-green-100 text-green-800' 
                      : isListening 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${
                      isRealMode && isListening 
                        ? 'bg-green-500' 
                        : isListening 
                        ? 'bg-blue-500' 
                        : 'bg-gray-400'
                    }`}></div>
                    <span>
                      {isRealMode && isListening 
                        ? 'Production Ready' 
                        : isListening 
                        ? 'Demo Active' 
                        : 'Not Active'}
                    </span>
                    {isRealMode && isListening && (
                      <SafeIcon icon={FiExternalLink} className="w-3 h-3" />
                    )}
                  </div>

                  {/* Simulation Status */}
                  {isSimulating && (
                    <div className="flex items-center space-x-2 px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800">
                      <SafeIcon icon={FiActivity} className="w-3 h-3 animate-pulse" />
                      <span>Simulating</span>
                    </div>
                  )}

                  {/* Control Button */}
                  <button
                    onClick={toggleWebhookListener}
                    className={`inline-flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActivelyConnected 
                        ? 'bg-red-600 hover:bg-red-700 text-white' 
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    <SafeIcon icon={isActivelyConnected ? FiStop : FiPlay} className="w-4 h-4" />
                    <span>
                      {isActivelyConnected ? 'Stop' : (isRealMode ? 'Start Production' : 'Start Demo')}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Mode Information */}
            <div className={`mb-6 border rounded-lg p-4 ${
              isRealMode ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'
            }`}>
              <div className="flex items-center space-x-2 mb-2">
                <SafeIcon icon={isRealMode ? FiExternalLink : FiActivity} className="h-5 w-5 text-blue-600" />
                <h4 className="text-sm font-medium text-blue-900">
                  {isRealMode ? '🌐 Production Webhook Mode' : '🎭 Demo Simulation Mode'}
                </h4>
              </div>
              <p className="text-sm text-blue-700">
                {isRealMode 
                  ? 'Ready to receive real webhook calls from your VoIP system. Your VoIP provider should send POST requests to the URL below when calls are received.'
                  : 'Demo mode with simulated calls for testing. Switch to Production mode when ready for live calls.'
                }
              </p>
              {isRealMode && (
                <div className="mt-3 p-3 bg-white border border-green-200 rounded-md">
                  <p className="text-sm text-green-800">
                    <strong>📞 For VoIP Provider:</strong> Configure your PBX/VoIP system to send webhooks to:
                  </p>
                  <code className="block mt-1 text-xs font-mono text-green-700 bg-green-50 p-2 rounded">
                    {getProductionWebhookUrl(getUserCompanyId())}
                  </code>
                </div>
              )}
            </div>

            {/* Webhook Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center">
                  <SafeIcon icon={FiPhone} className="h-8 w-8 text-blue-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-blue-900">Total Received</p>
                    <p className="text-2xl font-bold text-blue-600">{webhookStats.totalReceived}</p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <SafeIcon icon={FiClock} className="h-8 w-8 text-green-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-900">Today</p>
                    <p className="text-2xl font-bold text-green-600">{webhookStats.todayReceived}</p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center">
                  <SafeIcon icon={FiActivity} className="h-8 w-8 text-purple-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-purple-900">Last Received</p>
                    <p className="text-sm font-medium text-purple-600">
                      {webhookStats.lastReceived 
                        ? new Date(webhookStats.lastReceived).toLocaleTimeString() 
                        : 'Never'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Webhook URL Section */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isRealMode ? 'Production Webhook Endpoint URL' : 'Demo Webhook URL'}
              </label>
              <p className="text-sm text-gray-500 mb-3">
                {isRealMode 
                  ? 'Give this URL to your VoIP provider to configure webhook notifications for incoming calls.'
                  : 'Demo URL for testing webhook functionality with simulated calls.'
                }
              </p>
              <div className="flex space-x-2">
                <div className="flex-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <SafeIcon icon={FiGlobe} className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={webhookUrl}
                    readOnly
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 font-mono text-sm"
                  />
                </div>
                <button
                  onClick={copyWebhookUrl}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    copied 
                      ? 'bg-green-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <SafeIcon icon={copied ? FiCheckCircle : FiCopy} className="w-4 h-4" />
                </button>
              </div>
              {isRealMode && (
                <div className="mt-2 flex items-center text-xs text-green-600">
                  <SafeIcon icon={FiCheckCircle} className="w-3 h-3 mr-1" />
                  <span>This is your production webhook endpoint</span>
                </div>
              )}
            </div>

            {/* Control Buttons Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Test Webhook */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Test Webhook</h4>
                <p className="text-sm text-gray-500 mb-3">
                  Send a test webhook call to verify integration.
                </p>
                <button
                  onClick={testWebhook}
                  className="inline-flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <SafeIcon icon={FiSettings} className="w-4 h-4" />
                  <span>Send Test Call</span>
                </button>
              </div>

              {/* Production Test */}
              {isRealMode && (
                <div className="border border-green-200 rounded-lg p-4 bg-green-50">
                  <h4 className="text-sm font-medium text-green-900 mb-2">Production Test</h4>
                  <p className="text-sm text-green-700 mb-3">
                    Test the live production webhook endpoint.
                  </p>
                  <button
                    onClick={testProductionEndpoint}
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
                  >
                    <SafeIcon icon={FiExternalLink} className="w-4 h-4" />
                    <span>Test Production</span>
                  </button>
                </div>
              )}

              {/* Random Simulation */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Random Simulation</h4>
                <p className="text-sm text-gray-500 mb-3">
                  Simulate calls every 1-3 minutes for testing.
                </p>
                <button
                  onClick={toggleSimulation}
                  disabled={!isActivelyConnected}
                  className={`inline-flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    isSimulating 
                      ? 'bg-red-600 hover:bg-red-700 text-white' 
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  <SafeIcon icon={isSimulating ? FiStop : FiPlay} className="w-4 h-4" />
                  <span>{isSimulating ? 'Stop Simulation' : 'Start Simulation'}</span>
                </button>
                {!isActivelyConnected && (
                  <p className="mt-2 text-sm text-red-600">
                    Start the webhook listener first.
                  </p>
                )}
              </div>
            </div>

            {/* Integration Documentation */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex">
                <SafeIcon icon={FiLink} className="h-5 w-5 text-gray-400 mt-0.5" />
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    VoIP Provider Webhook Configuration
                  </h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Your VoIP provider/PBX should send POST requests with this JSON payload format:
                  </p>
                  <div className="bg-white rounded border p-3 font-mono text-sm mb-3">
                    <pre className="text-gray-800">
{`{
  "caller_id": "+306912345678",
  "timestamp": "2024-01-01T12:00:00Z",
  "call_type": "incoming",
  "webhook_id": "unique-call-id"
}`}
                    </pre>
                  </div>
                  <div className="space-y-1 text-xs text-gray-600">
                    <p><strong>caller_id:</strong> Phone number in international format (+306912345678) - REQUIRED</p>
                    <p><strong>timestamp:</strong> ISO 8601 timestamp (optional, defaults to current time)</p>
                    <p><strong>call_type:</strong> Type of call, usually "incoming" (optional)</p>
                    <p><strong>webhook_id:</strong> Unique identifier for this specific call (optional)</p>
                  </div>
                  {isRealMode && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
                      <p className="text-sm font-medium text-green-800 mb-1">📞 Production Webhook URL:</p>
                      <code className="text-xs text-green-700 font-mono break-all">
                        {getProductionWebhookUrl(getUserCompanyId())}
                      </code>
                      <p className="text-xs text-green-600 mt-2">
                        ✅ Configure your VoIP system to POST to this URL when calls are received
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Current Status */}
            <div className="mt-6 bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Current Status</h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Mode
                  </label>
                  <p className={`mt-1 text-sm ${isRealMode ? 'text-green-600' : 'text-blue-600'}`}>
                    {isRealMode ? '🌐 Production Mode' : '🎭 Demo Mode'}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Status
                  </label>
                  <p className={`mt-1 text-sm ${
                    isRealMode && isListening 
                      ? 'text-green-600' 
                      : isListening 
                      ? 'text-blue-600' 
                      : 'text-gray-600'
                  }`}>
                    {isRealMode && isListening 
                      ? '✅ Ready for real calls' 
                      : isListening 
                      ? '✅ Demo active' 
                      : '⏸️ Not active'}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Calls Today
                  </label>
                  <p className="mt-1 text-sm text-purple-600">
                    📞 {webhookStats.todayReceived} calls received
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <WebhookLogs />
      )}
    </div>
  );
}

export default WebhookSettings;