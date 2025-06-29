import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';
import { useAuthStore } from '../../store/authStore';
import { sipAPI } from '../../services/supabaseAPI';
import { sipService } from '../../services/sipService';

const { FiPhone, FiServer, FiLock, FiSettings, FiPlay, FiStop, FiCheckCircle, FiAlertCircle, FiGlobe, FiShield, FiEye, FiDatabase, FiInfo } = FiIcons;

function SipSettings() {
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [registrationStatus, setRegistrationStatus] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedConfig, setSavedConfig] = useState(null);
  const [loadingSavedConfig, setLoadingSavedConfig] = useState(false);
  
  const { getUserCompanyId, hasRole } = useAuthStore();
  
  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm({
    defaultValues: {
      transport: 'UDP',
      port: 5060
    }
  });

  useEffect(() => {
    loadSipSettings();
    loadSavedConfig();
    
    // Check monitoring status
    setIsMonitoring(sipService.getMonitoringStatus());
    
    // Get registration status
    const regStatus = sipService.getRegistrationStatus();
    setRegistrationStatus(regStatus);
  }, []);

  const loadSipSettings = async () => {
    try {
      setIsLoading(true);
      const companyId = getUserCompanyId();
      if (!companyId) return;

      const config = await sipAPI.getConfig(companyId);
      if (config) {
        setValue('username', config.username || '');
        setValue('domain', config.domain || '');
        setValue('proxy', config.proxy || '');
        setValue('transport', config.transport || 'UDP');
        setValue('port', config.port || 5060);
        setValue('password', ''); // Don't populate password for security

        if (config.last_test_status) {
          setConnectionStatus({
            success: config.last_test_status === 'success',
            message: config.last_test_status === 'success' 
              ? 'Last test was successful' 
              : 'Last test failed',
            tested_at: config.last_test_at
          });
        }
      }
    } catch (error) {
      console.error('Failed to load SIP settings:', error);
      toast.error('Failed to load SIP settings');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSavedConfig = async () => {
    try {
      setLoadingSavedConfig(true);
      const companyId = getUserCompanyId();
      if (!companyId) return;

      const config = await sipAPI.getConfig(companyId);
      setSavedConfig(config);
    } catch (error) {
      console.error('Failed to load saved SIP config:', error);
    } finally {
      setLoadingSavedConfig(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      setIsSaving(true);
      const companyId = getUserCompanyId();
      if (!companyId) {
        throw new Error('No company ID found');
      }

      const configData = {
        username: data.username,
        domain: data.domain,
        proxy: data.proxy || null,
        transport: data.transport,
        port: parseInt(data.port),
        is_active: true
      };

      // Only include password if provided
      if (data.password && data.password.trim()) {
        configData.password = data.password;
        console.log('Saving SIP config with new password');
      } else {
        console.log('Saving SIP config without password change');
      }

      console.log('Saving SIP config:', configData);
      const savedData = await sipAPI.updateConfig(companyId, configData);
      console.log('SIP config saved successfully:', savedData);

      toast.success('SIP settings saved successfully', { duration: 2000 });

      // Reinitialize SIP service with new settings
      await sipService.initialize(companyId);

      // Clear password field after successful save
      setValue('password', '');

      // Reload saved config display
      await loadSavedConfig();

      // Update registration status
      const regStatus = sipService.getRegistrationStatus();
      setRegistrationStatus(regStatus);

    } catch (error) {
      console.error('Failed to save SIP settings:', error);
      toast.error(error.message || 'Failed to save SIP settings');
    } finally {
      setIsSaving(false);
    }
  };

  const testConnection = async () => {
    try {
      const companyId = getUserCompanyId();
      if (!companyId) {
        throw new Error('No company ID found');
      }

      setIsTesting(true);
      const formData = watch();

      // First save the settings if they've changed
      if (formData.username && formData.domain) {
        await onSubmit(formData);
      }

      const result = await sipService.testConnection();
      setConnectionStatus(result);

      if (result.success) {
        toast.success('SIP connection test successful', { duration: 2000 });
        
        // Update registration status
        const regStatus = sipService.getRegistrationStatus();
        setRegistrationStatus(regStatus);
      } else {
        toast.error('SIP connection test failed', { duration: 3000 });
      }
    } catch (error) {
      console.error('SIP connection test failed:', error);
      setConnectionStatus({
        success: false,
        message: error.message || 'SIP connection test failed',
        tested_at: new Date().toISOString()
      });
      toast.error('SIP connection test failed');
    } finally {
      setIsTesting(false);
    }
  };

  const toggleMonitoring = async () => {
    try {
      const companyId = getUserCompanyId();
      if (!companyId) {
        throw new Error('No company ID found');
      }

      if (isMonitoring) {
        sipService.stopMonitoring();
        setIsMonitoring(false);
        setRegistrationStatus(sipService.getRegistrationStatus());
        toast.success('SIP monitoring stopped', { duration: 2000 });
      } else {
        // Check if we have saved SIP configuration
        if (!savedConfig || !savedConfig.username || !savedConfig.domain) {
          toast.error('Please save SIP configuration first before starting monitoring');
          return;
        }

        await sipService.initialize(companyId);
        const success = await sipService.startMonitoring();
        
        if (success) {
          setIsMonitoring(true);
          setRegistrationStatus(sipService.getRegistrationStatus());
          toast.success('SIP monitoring started - incoming calls will appear as popups', { duration: 3000 });
        } else {
          toast.error('Failed to start SIP monitoring - check your configuration');
        }
      }
    } catch (error) {
      console.error('Failed to toggle SIP monitoring:', error);
      toast.error(error.message || 'Failed to toggle SIP monitoring');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900">SIP/VoIP Configuration</h3>
              <p className="text-sm text-gray-500 mt-1">
                Configure SIP settings to enable incoming call detection and monitoring.
              </p>
            </div>

            {/* Monitoring Status - Available to all users */}
            <div className="flex items-center space-x-3">
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
                isMonitoring ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  isMonitoring ? 'bg-green-500' : 'bg-gray-400'
                }`}></div>
                <span>{isMonitoring ? 'Monitoring Active' : 'Monitoring Stopped'}</span>
              </div>

              <button
                onClick={toggleMonitoring}
                className={`inline-flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  isMonitoring 
                    ? 'bg-red-600 hover:bg-red-700 text-white' 
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                <SafeIcon icon={isMonitoring ? FiStop : FiPlay} className="w-4 h-4" />
                <span>{isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}</span>
              </button>
            </div>
          </div>

          {/* Registration Status */}
          {registrationStatus && registrationStatus.config && (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <SafeIcon icon={FiPhone} className="h-5 w-5 text-blue-600" />
                <h4 className="text-sm font-medium text-blue-900">SIP Registration Status</h4>
              </div>
              <div className="mt-2 space-y-1">
                <p className="text-sm text-blue-700">
                  <strong>Registered as:</strong> {registrationStatus.config.registered_as}
                </p>
                <p className="text-sm text-blue-700">
                  <strong>Status:</strong> 
                  <span className={`ml-1 ${registrationStatus.isRegistered ? 'text-green-600' : 'text-red-600'}`}>
                    {registrationStatus.isRegistered ? '✅ Registered' : '❌ Not Registered'}
                  </span>
                </p>
                {registrationStatus.isRegistered && (
                  <p className="text-xs text-blue-600 mt-2">
                    📞 Ready to receive calls! You can now call: <strong>{registrationStatus.config.registered_as}</strong>
                  </p>
                )}
              </div>
            </div>
          )}

          {!hasRole('admin') && (
            <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex">
                <SafeIcon icon={FiShield} className="h-5 w-5 text-yellow-400" />
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    <strong>Note:</strong> Only administrators can modify SIP settings. 
                    You can start/stop monitoring but cannot change the configuration.
                  </p>
                </div>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {/* SIP Username */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SIP Username *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <SafeIcon icon={FiPhone} className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      {...register('username', { 
                        required: hasRole('admin') ? 'SIP Username is required' : false
                      })}
                      type="text"
                      disabled={!hasRole('admin')}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-50 disabled:text-gray-500"
                      placeholder="kostashania"
                    />
                  </div>
                  {errors.username && (
                    <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Enter your SIP username (without @domain)
                  </p>
                </div>

                {/* SIP Domain */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SIP Domain/Registrar *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <SafeIcon icon={FiGlobe} className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      {...register('domain', { 
                        required: hasRole('admin') ? 'SIP Domain is required' : false
                      })}
                      type="text"
                      disabled={!hasRole('admin')}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-50 disabled:text-gray-500"
                      placeholder="sip.linphone.org"
                    />
                  </div>
                  {errors.domain && (
                    <p className="mt-1 text-sm text-red-600">{errors.domain.message}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Your SIP provider's domain (e.g., sip.linphone.org)
                  </p>
                </div>

                {/* SIP Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SIP Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <SafeIcon icon={FiLock} className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      {...register('password')}
                      type="password"
                      disabled={!hasRole('admin')}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-50 disabled:text-gray-500"
                      placeholder={hasRole('admin') ? "Enter new password (leave blank to keep current)" : "Hidden"}
                    />
                  </div>
                  {hasRole('admin') && (
                    <p className="mt-1 text-xs text-gray-500">
                      Leave blank to keep current password. Enter new password to update.
                    </p>
                  )}
                </div>

                {/* SIP Proxy */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SIP Proxy (Optional)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <SafeIcon icon={FiServer} className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      {...register('proxy')}
                      type="text"
                      disabled={!hasRole('admin')}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-50 disabled:text-gray-500"
                      placeholder="proxy.linphone.org"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Optional proxy server (usually same as domain)
                  </p>
                </div>

                {/* Transport */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Transport Protocol
                  </label>
                  <select
                    {...register('transport')}
                    disabled={!hasRole('admin')}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-50 disabled:text-gray-500"
                  >
                    <option value="UDP">UDP</option>
                    <option value="TCP">TCP</option>
                    <option value="TLS">TLS</option>
                  </select>
                </div>

                {/* Port */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SIP Port
                  </label>
                  <input
                    {...register('port', {
                      required: hasRole('admin') ? 'Port is required' : false,
                      min: { value: 1024, message: 'Port must be >= 1024' },
                      max: { value: 65535, message: 'Port must be <= 65535' }
                    })}
                    type="number"
                    disabled={!hasRole('admin')}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-50 disabled:text-gray-500"
                    placeholder="5060"
                  />
                  {errors.port && (
                    <p className="mt-1 text-sm text-red-600">{errors.port.message}</p>
                  )}
                </div>
              </div>

              {/* Connection Status */}
              {connectionStatus && (
                <div className={`rounded-md p-4 ${
                  connectionStatus.success ? 'bg-green-50' : 'bg-red-50'
                }`}>
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <SafeIcon 
                        icon={connectionStatus.success ? FiCheckCircle : FiAlertCircle} 
                        className={`h-5 w-5 ${
                          connectionStatus.success ? 'text-green-400' : 'text-red-400'
                        }`} 
                      />
                    </div>
                    <div className="ml-3">
                      <p className={`text-sm font-medium ${
                        connectionStatus.success ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {connectionStatus.message}
                      </p>
                      {connectionStatus.tested_at && (
                        <p className={`text-xs mt-1 ${
                          connectionStatus.success ? 'text-green-600' : 'text-red-600'
                        }`}>
                          Last tested: {new Date(connectionStatus.tested_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Actions - Only show to admins */}
              {hasRole('admin') && (
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={testConnection}
                    disabled={isTesting}
                    className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <SafeIcon icon={FiSettings} className="w-4 h-4" />
                    <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
                  </button>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Save SIP Settings'}
                  </button>
                </div>
              )}
            </form>
          )}
        </div>
      </div>

      {/* Current Saved Settings Display */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center space-x-2 mb-4">
            <SafeIcon icon={FiDatabase} className="h-5 w-5 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900">Current Saved Configuration</h3>
          </div>

          {loadingSavedConfig ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
            </div>
          ) : savedConfig ? (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Username
                  </label>
                  <p className="mt-1 text-sm text-gray-900 font-mono">
                    {savedConfig.username || 'Not set'}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Domain
                  </label>
                  <p className="mt-1 text-sm text-gray-900 font-mono">
                    {savedConfig.domain || 'Not set'}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Complete SIP Address
                  </label>
                  <p className="mt-1 text-sm text-gray-900 font-mono bg-blue-50 px-2 py-1 rounded">
                    {savedConfig.username && savedConfig.domain 
                      ? `${savedConfig.username}@${savedConfig.domain}`
                      : 'Not configured'
                    }
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Password
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {savedConfig.password_encrypted ? '••••••••' : 'Not set'}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Proxy
                  </label>
                  <p className="mt-1 text-sm text-gray-900 font-mono">
                    {savedConfig.proxy || 'Not set'}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Transport
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {savedConfig.transport || 'UDP'}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Port
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {savedConfig.port || '5060'}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Status
                  </label>
                  <p className={`mt-1 text-sm ${savedConfig.is_active ? 'text-green-600' : 'text-red-600'}`}>
                    {savedConfig.is_active ? 'Active' : 'Inactive'}
                  </p>
                </div>
              </div>

              {savedConfig.last_test_at && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center space-x-2">
                    <SafeIcon 
                      icon={savedConfig.last_test_status === 'success' ? FiCheckCircle : FiAlertCircle} 
                      className={`h-4 w-4 ${
                        savedConfig.last_test_status === 'success' ? 'text-green-500' : 'text-red-500'
                      }`} 
                    />
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Last Test:
                    </span>
                    <span className={`text-sm ${
                      savedConfig.last_test_status === 'success' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {savedConfig.last_test_status} - {new Date(savedConfig.last_test_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6">
              <SafeIcon icon={FiDatabase} className="mx-auto h-8 w-8 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">No SIP configuration saved yet</p>
              <p className="text-xs text-gray-400">Save your settings above to see them here</p>
            </div>
          )}
        </div>
      </div>

      {/* Troubleshooting Guide */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <SafeIcon icon={FiInfo} className="h-5 w-5 text-yellow-400" />
          </div>
          <div className="ml-3">
            <h4 className="text-sm font-medium text-yellow-900">
              Troubleshooting "Busy" Signal
            </h4>
            <div className="mt-2 text-sm text-yellow-700">
              <p className="mb-2">If you're getting a "busy" signal when calling your SIP address:</p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Check Registration:</strong> Ensure SIP monitoring is active and shows "Registered"</li>
                <li><strong>Verify Credentials:</strong> Double-check your username, domain, and password</li>
                <li><strong>Test Connection:</strong> Use the "Test Connection" button first</li>
                <li><strong>Network Issues:</strong> Ensure your network allows SIP traffic on the configured port</li>
                <li><strong>Provider Settings:</strong> Contact your SIP provider to verify account status</li>
                <li><strong>Demo Mode:</strong> This demo simulates calls - real SIP calls will show as popups when monitoring is active</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Provider Examples */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">
          Popular SIP Providers
        </h4>
        <div className="space-y-2 text-sm text-gray-600">
          <div>
            <strong>Linphone.org:</strong> Domain: sip.linphone.org, Free accounts available
          </div>
          <div>
            <strong>Modulus.gr:</strong> Domain: sip.modulus.gr, Proxy: proxy.modulus.gr
          </div>
          <div>
            <strong>FreePBX:</strong> Domain: your-server.com, Port: 5060
          </div>
        </div>
      </div>

      {/* Demo Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <SafeIcon icon={FiSettings} className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3">
            <h4 className="text-sm font-medium text-blue-900">
              Demo Mode Active
            </h4>
            <p className="mt-1 text-sm text-blue-700">
              This is a demonstration of SIP integration. In production, this would connect to real SIP providers. 
              Save your SIP configuration first, then click "Start Monitoring" to begin receiving simulated incoming calls.
              Real calls to your configured SIP address will also appear as popups when monitoring is active.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SipSettings;