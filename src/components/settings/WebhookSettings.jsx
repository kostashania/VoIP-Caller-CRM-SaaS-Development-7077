import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';
import { useAuthStore } from '../../store/authStore';
import { webhookService } from '../../services/webhookService';

const { FiGlobe, FiSettings, FiPlay, FiStop, FiCopy, FiCheckCircle, FiAlertCircle, FiInfo, FiLink } = FiIcons;

function WebhookSettings() {
  const [isListening, setIsListening] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [copied, setCopied] = useState(false);
  
  const { getUserCompanyId, hasRole } = useAuthStore();

  useEffect(() => {
    // Get webhook URL and listening status
    const companyId = getUserCompanyId();
    if (companyId) {
      const url = webhookService.getWebhookUrl(companyId);
      setWebhookUrl(url);
      setIsListening(webhookService.getListeningStatus());
    }
  }, [getUserCompanyId]);

  const toggleWebhookListener = async () => {
    try {
      const companyId = getUserCompanyId();
      if (!companyId) {
        throw new Error('No company ID found');
      }

      if (isListening) {
        webhookService.stopListening();
        setIsListening(false);
        toast.success('Webhook listener stopped', { duration: 2000 });
      } else {
        webhookService.startListening(companyId);
        setIsListening(true);
        toast.success('Webhook listener started - ready to receive calls!', { duration: 3000 });
      }
    } catch (error) {
      console.error('Failed to toggle webhook listener:', error);
      toast.error(error.message || 'Failed to toggle webhook listener');
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
    // Simulate a test webhook call
    const testCallerId = '+1234567890';
    console.log('🧪 Simulating test webhook call...');
    
    const companyId = getUserCompanyId();
    webhookService.handleWebhookCall({
      caller_id: testCallerId,
      timestamp: new Date().toISOString(),
      call_type: 'incoming',
      webhook_id: `test-${Date.now()}`,
      source: 'test_webhook'
    }, companyId);
    
    toast.success('Test webhook call sent!', { duration: 2000 });
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

            {/* Listener Status */}
            <div className="flex items-center space-x-3">
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
                isListening ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  isListening ? 'bg-green-500' : 'bg-gray-400'
                }`}></div>
                <span>{isListening ? 'Listening for Webhooks' : 'Webhook Listener Stopped'}</span>
              </div>

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

          {/* Webhook URL Section */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Webhook URL
            </label>
            <p className="text-sm text-gray-500 mb-3">
              Configure your phone system to send POST requests to this URL when calls are received.
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

          {/* Webhook Format Documentation */}
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <SafeIcon icon={FiInfo} className="h-5 w-5 text-blue-400 mt-0.5" />
              <div className="ml-3">
                <h4 className="text-sm font-medium text-blue-900 mb-2">
                  Webhook Request Format
                </h4>
                <p className="text-sm text-blue-700 mb-3">
                  Your phone system should send a POST request with the following JSON payload:
                </p>
                <div className="bg-white rounded border p-3 font-mono text-sm">
                  <pre className="text-gray-800">{`{
  "caller_id": "+1234567890",
  "timestamp": "2024-01-01T12:00:00Z",
  "call_type": "incoming",
  "webhook_id": "unique-call-id"
}`}</pre>
                </div>
                <div className="mt-3 space-y-1 text-xs text-blue-600">
                  <p><strong>caller_id:</strong> The phone number of the incoming caller (required)</p>
                  <p><strong>timestamp:</strong> When the call was received (optional, defaults to now)</p>
                  <p><strong>call_type:</strong> Type of call, usually "incoming" (optional)</p>
                  <p><strong>webhook_id:</strong> Unique identifier for this call (optional)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Test Section */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Test Webhook</h4>
            <p className="text-sm text-gray-500 mb-3">
              Test your webhook integration by simulating an incoming call.
            </p>
            <button
              onClick={testWebhook}
              disabled={!isListening}
              className="inline-flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <SafeIcon icon={FiSettings} className="w-4 h-4" />
              <span>Send Test Call</span>
            </button>
            {!isListening && (
              <p className="mt-2 text-sm text-red-600">
                Start the webhook listener first to test webhooks.
              </p>
            )}
          </div>

          {/* Status Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Current Status</h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Webhook Listener
                </label>
                <p className={`mt-1 text-sm ${isListening ? 'text-green-600' : 'text-red-600'}`}>
                  {isListening ? '✅ Active' : '❌ Stopped'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Endpoint URL
                </label>
                <p className="mt-1 text-sm text-gray-900 font-mono break-all">
                  {webhookUrl}
                </p>
              </div>
            </div>
          </div>

          {/* Integration Guide */}
          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex">
              <SafeIcon icon={FiLink} className="h-5 w-5 text-yellow-400" />
              <div className="ml-3">
                <h4 className="text-sm font-medium text-yellow-900">
                  Integration Steps
                </h4>
                <div className="mt-2 text-sm text-yellow-700">
                  <ol className="list-decimal list-inside space-y-1">
                    <li><strong>Copy the webhook URL</strong> above to your clipboard</li>
                    <li><strong>Configure your phone system</strong> to send POST requests to this URL</li>
                    <li><strong>Include caller_id</strong> in the JSON payload for each incoming call</li>
                    <li><strong>Start the webhook listener</strong> in this interface</li>
                    <li><strong>Test</strong> by making a call or using the test button</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WebhookSettings;