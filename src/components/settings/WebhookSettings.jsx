import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';
import { useAuthStore } from '../../store/authStore';
import { webhookService } from '../../services/webhookService';

const { FiGlobe, FiSettings, FiPlay, FiStop, FiCopy, FiCheckCircle, FiAlertCircle, FiInfo, FiLink, FiActivity, FiClock, FiPhone } = FiIcons;

function WebhookSettings() {
  const [isListening, setIsListening] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
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
      const url = webhookService.getWebhookUrl(companyId);
      setWebhookUrl(url);
      setIsListening(webhookService.getListeningStatus());
      setIsSimulating(webhookService.getSimulationStatus());
      
      // Load webhook statistics
      loadWebhookStats();
    }

    // Update status every 5 seconds
    const statusInterval = setInterval(() => {
      setIsListening(webhookService.getListeningStatus());
      setIsSimulating(webhookService.getSimulationStatus());
      loadWebhookStats();
    }, 5000);

    return () => clearInterval(statusInterval);
  }, [getUserCompanyId]);

  const loadWebhookStats = () => {
    const stats = webhookService.getStats();
    setWebhookStats(stats);
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
        webhookService.startListening(companyId);
        setIsListening(true);
        toast.success('Webhook listener started - test call in 10 seconds!', { duration: 3000 });
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
        if (!isListening) {
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

  const testWebhook = () => {
    if (!isListening) {
      toast.error('Please start webhook listener first');
      return;
    }

    const companyId = getUserCompanyId();
    webhookService.sendTestCall(companyId);
    toast.success('Test webhook call sent!', { duration: 2000 });
    loadWebhookStats();
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

            {/* Status Indicators */}
            <div className="flex items-center space-x-3">
              {/* Listener Status */}
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
                isListening ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                <div className={`w-2 h-2 rounded-full ${isListening ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                <span>{isListening ? 'Listening' : 'Stopped'}</span>
              </div>

              {/* Simulation Status */}
              {isSimulating && (
                <div className="flex items-center space-x-2 px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                  <SafeIcon icon={FiActivity} className="w-3 h-3 animate-pulse" />
                  <span>Simulating</span>
                </div>
              )}

              {/* Control Buttons */}
              <button
                onClick={toggleWebhookListener}
                className={`inline-flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  isListening 
                    ? 'bg-red-600 hover:bg-red-700 text-white' 
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                <SafeIcon icon={isListening ? FiStop : FiPlay} className="w-4 h-4" />
                <span>{isListening ? 'Stop Listener' : 'Start Listener'}</span>
              </button>
            </div>
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
              Configure your VoIP system to send POST requests to this URL when calls are received.
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
                disabled={!isListening}
                className="inline-flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <SafeIcon icon={FiSettings} className="w-4 h-4" />
                <span>Send Test Call Now</span>
              </button>
              {!isListening && (
                <p className="mt-2 text-sm text-red-600">
                  Start the webhook listener first to test.
                </p>
              )}
            </div>

            {/* Random Simulation */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Random Call Simulation</h4>
              <p className="text-sm text-gray-500 mb-3">
                Simulate incoming calls every 1-3 minutes for testing.
              </p>
              <button
                onClick={toggleSimulation}
                disabled={!isListening}
                className={`inline-flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  isSimulating
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                <SafeIcon icon={isSimulating ? FiStop : FiPlay} className="w-4 h-4" />
                <span>{isSimulating ? 'Stop Simulation' : 'Start Simulation'}</span>
              </button>
              {!isListening && (
                <p className="mt-2 text-sm text-red-600">
                  Start the webhook listener first.
                </p>
              )}
            </div>
          </div>

          {/* Step-by-step Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <SafeIcon icon={FiInfo} className="h-5 w-5 text-blue-400 mt-0.5" />
              <div className="ml-3">
                <h4 className="text-sm font-medium text-blue-900 mb-2">
                  Quick Testing Steps
                </h4>
                <div className="text-sm text-blue-700">
                  <ol className="list-decimal list-inside space-y-1">
                    <li><strong>Start Listener:</strong> Click "Start Listener" - you'll get a test call in 10 seconds</li>
                    <li><strong>Enable Simulation:</strong> Click "Start Simulation" for random calls every 1-3 minutes</li>
                    <li><strong>Manual Test:</strong> Use "Send Test Call Now" for immediate testing</li>
                    <li><strong>Answer Calls:</strong> When a call appears, test the address management features</li>
                  </ol>
                </div>
              </div>
            </div>
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
                  Webhook Listener
                </label>
                <p className={`mt-1 text-sm ${isListening ? 'text-green-600' : 'text-red-600'}`}>
                  {isListening ? '✅ Active - Ready to receive calls' : '❌ Stopped'}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Call Simulation
                </label>
                <p className={`mt-1 text-sm ${isSimulating ? 'text-blue-600' : 'text-gray-600'}`}>
                  {isSimulating ? '🎭 Active - Generating test calls' : '⏸️ Inactive'}
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