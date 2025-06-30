import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';
import { useAuthStore } from '../../store/authStore';
import { webhookService } from '../../services/webhookService';
import { websocketService } from '../../services/websocketService';

const { FiGlobe, FiSettings, FiPlay, FiStop, FiCopy, FiCheckCircle, FiAlertCircle, FiInfo, FiLink, FiActivity, FiClock, FiPhone, FiWifi } = FiIcons;

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

  const { getUserCompanyId, hasRole } = useAuthStore();

  useEffect(() => {
    // Get webhook URL and listening status
    const companyId = getUserCompanyId();
    if (companyId) {
      const demoUrl = webhookService.getWebhookUrl(companyId);
      const realUrl = `${window.location.origin}/api/webhook/incoming-call/${companyId}`;
      
      setWebhookUrl(isRealMode ? realUrl : demoUrl);
      setIsListening(webhookService.getListeningStatus());
      setIsSimulating(webhookService.getSimulationStatus());

      // Load webhook statistics
      loadWebhookStats();

      // Check WebSocket connection status
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
    setIsRealMode(!isRealMode);
    const companyId = getUserCompanyId();
    if (companyId) {
      const demoUrl = webhookService.getWebhookUrl(companyId);
      const realUrl = `${window.location.origin}/api/webhook/incoming-call/${companyId}`;
      setWebhookUrl(!isRealMode ? realUrl : demoUrl);
    }
  };

  const toggleWebhookListener = async () => {
    try {
      const companyId = getUserCompanyId();
      if (!companyId) {
        throw new Error('No company ID found');
      }

      if (isListening) {
        webhookService.stopListening();
        setIsListening(false);
        setIsSimulating(false);
        toast.success('Webhook listener stopped', { duration: 2000 });
      } else {
        if (isRealMode) {
          // For real mode, ensure WebSocket connection
          websocketService.connect();
          toast.success('Real webhook mode activated - connect your VoIP system now!', { duration: 4000 });
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
        if (!isListening && !isRealMode) {
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
        const response = await fetch(`/api/webhook/test/${companyId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        const result = await response.json();
        
        if (result.success) {
          toast.success('Real webhook test successful!', { duration: 2000 });
        } else {
          toast.error('Real webhook test failed');
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

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Webhook Configuration</h3>
              <p className="text-sm text-gray-500 mt-1">
                Configure webhook endpoint to receive incoming call notifications.
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
                  isRealMode 
                    ? (connectionStatus?.isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800')
                    : (isListening ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800')
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    isRealMode
                      ? (connectionStatus?.isConnected ? 'bg-green-500' : 'bg-red-500')
                      : (isListening ? 'bg-blue-500' : 'bg-gray-400')
                  }`}></div>
                  <span>
                    {isRealMode 
                      ? (connectionStatus?.isConnected ? 'Connected' : 'Disconnected')
                      : (isListening ? 'Demo Active' : 'Demo Stopped')
                    }
                  </span>
                  {isRealMode && connectionStatus?.isConnected && (
                    <SafeIcon icon={FiWifi} className="w-3 h-3" />
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
                    (isListening || (isRealMode && connectionStatus?.isConnected))
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  <SafeIcon icon={(isListening || (isRealMode && connectionStatus?.isConnected)) ? FiStop : FiPlay} className="w-4 h-4" />
                  <span>
                    {isRealMode 
                      ? (connectionStatus?.isConnected ? 'Disconnect' : 'Connect')
                      : (isListening ? 'Stop Demo' : 'Start Demo')
                    }
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
              <SafeIcon icon={isRealMode ? FiWifi : FiActivity} className="h-5 w-5 text-blue-600" />
              <h4 className="text-sm font-medium text-blue-900">
                {isRealMode ? '🌐 Real Webhook Mode' : '🎭 Demo Simulation Mode'}
              </h4>
            </div>
            <p className="text-sm text-blue-700">
              {isRealMode 
                ? 'Ready to receive real webhook calls from your VoIP system. Configure your PBX to send POST requests to the URL below.'
                : 'Demo mode with simulated calls for testing. Switch to Real mode when ready for production.'
              }
            </p>
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
                      : 'Never'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Webhook URL Section */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Webhook Endpoint URL
            </label>
            <p className="text-sm text-gray-500 mb-3">
              {isRealMode 
                ? 'Configure your VoIP system to send POST requests to this URL when calls are received.'
                : 'Demo URL for testing webhook functionality.'
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
          </div>

          {/* Control Buttons Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Test Webhook */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Test Webhook</h4>
              <p className="text-sm text-gray-500 mb-3">
                Send a test webhook call immediately to verify your integration.
              </p>
              <button
                onClick={testWebhook}
                className="inline-flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <SafeIcon icon={FiSettings} className="w-4 h-4" />
                <span>Send Test Call Now</span>
              </button>
            </div>

            {/* Random Simulation */}
            {!isRealMode && (
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Random Call Simulation</h4>
                <p className="text-sm text-gray-500 mb-3">
                  Simulate incoming calls every 1-3 minutes for testing.
                </p>
                <button
                  onClick={toggleSimulation}
                  disabled={!isListening && !isRealMode}
                  className={`inline-flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    isSimulating 
                      ? 'bg-red-600 hover:bg-red-700 text-white' 
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  <SafeIcon icon={isSimulating ? FiStop : FiPlay} className="w-4 h-4" />
                  <span>{isSimulating ? 'Stop Simulation' : 'Start Simulation'}</span>
                </button>
                {!isListening && !isRealMode && (
                  <p className="mt-2 text-sm text-red-600">
                    Start the webhook listener first.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Integration Documentation */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex">
              <SafeIcon icon={FiLink} className="h-5 w-5 text-gray-400 mt-0.5" />
              <div className="ml-3">
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  Webhook Request Format
                </h4>
                <p className="text-sm text-gray-600 mb-3">
                  Your VoIP system should send a POST request with the following JSON payload:
                </p>
                <div className="bg-white rounded border p-3 font-mono text-sm">
                  <pre className="text-gray-800">
{`{
  "caller_id": "+1234567890",
  "timestamp": "2024-01-01T12:00:00Z",
  "call_type": "incoming",
  "webhook_id": "unique-call-id"
}`}
                  </pre>
                </div>
                <div className="mt-3 space-y-1 text-xs text-gray-600">
                  <p><strong>caller_id:</strong> Phone number in international format (required)</p>
                  <p><strong>timestamp:</strong> ISO 8601 timestamp (optional, defaults to now)</p>
                  <p><strong>call_type:</strong> Type of call, usually "incoming" (optional)</p>
                  <p><strong>webhook_id:</strong> Unique identifier for this call (optional)</p>
                </div>
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
                  {isRealMode ? '🌐 Real Webhook Mode' : '🎭 Demo Mode'}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Connection
                </label>
                <p className={`mt-1 text-sm ${
                  isRealMode 
                    ? (connectionStatus?.isConnected ? 'text-green-600' : 'text-red-600')
                    : (isListening ? 'text-blue-600' : 'text-gray-600')
                }`}>
                  {isRealMode 
                    ? (connectionStatus?.isConnected ? '✅ Ready for real calls' : '❌ Not connected')
                    : (isListening ? '✅ Demo active' : '⏸️ Demo stopped')
                  }
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Total Calls Today
                </label>
                <p className="mt-1 text-sm text-purple-600">
                  📞 {webhookStats.todayReceived} calls received
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WebhookSettings;