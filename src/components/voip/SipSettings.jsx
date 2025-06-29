import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';
import { useAuthStore } from '../../store/authStore';
import { sipAPI } from '../../services/supabaseAPI';
import { sipService } from '../../services/sipService';

const { 
  FiPhone, FiServer, FiLock, FiSettings, FiPlay, FiStop,
  FiCheckCircle, FiAlertCircle, FiGlobe, FiShield
} = FiIcons;

function SipSettings() {
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const { getUserCompanyId, hasRole } = useAuthStore();
  
  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm({
    defaultValues: {
      transport: 'UDP',
      port: 5060
    }
  });

  useEffect(() => {
    loadSipSettings();
  }, []);

  const loadSipSettings = async () => {
    if (!hasRole('admin')) return;
    
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
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data) => {
    try {
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
      if (data.password) {
        configData.password = data.password;
      }

      await sipAPI.updateConfig(companyId, configData);
      toast.success('SIP settings saved successfully');
      
      // Reinitialize SIP service with new settings
      await sipService.initialize(companyId);
    } catch (error) {
      console.error('Failed to save SIP settings:', error);
      toast.error(error.message || 'Failed to save SIP settings');
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
      
      const result = await sipAPI.testConnection(companyId, formData);
      setConnectionStatus(result);
      
      if (result.success) {
        toast.success('SIP connection test successful');
      } else {
        toast.error('SIP connection test failed');
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
        toast.success('SIP monitoring stopped');
      } else {
        await sipService.initialize(companyId);
        const success = await sipService.startMonitoring();
        
        if (success) {
          setIsMonitoring(true);
          toast.success('SIP monitoring started');
        } else {
          toast.error('Failed to start SIP monitoring');
        }
      }
    } catch (error) {
      console.error('Failed to toggle SIP monitoring:', error);
      toast.error(error.message || 'Failed to toggle SIP monitoring');
    }
  };

  if (!hasRole('admin')) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center">
          <SafeIcon icon={FiShield} className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Access Restricted</h3>
          <p className="mt-1 text-sm text-gray-500">
            Only administrators can configure SIP settings.
          </p>
        </div>
      </div>
    );
  }

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
            
            {/* Monitoring Status */}
            <div className="flex items-center space-x-3">
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
                isMonitoring 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  isMonitoring ? 'bg-green-500' : 'bg-gray-400'
                }`}></div>
                <span>{isMonitoring ? 'Monitoring' : 'Stopped'}</span>
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
                      {...register('username', { required: 'SIP Username is required' })}
                      type="text"
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="your_sip_username"
                    />
                  </div>
                  {errors.username && (
                    <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>
                  )}
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
                      {...register('domain', { required: 'SIP Domain is required' })}
                      type="text"
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="sip.modulus.gr"
                    />
                  </div>
                  {errors.domain && (
                    <p className="mt-1 text-sm text-red-600">{errors.domain.message}</p>
                  )}
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
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Leave blank to keep current password"
                    />
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
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
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="proxy.modulus.gr"
                    />
                  </div>
                </div>

                {/* Transport */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Transport Protocol
                  </label>
                  <select
                    {...register('transport')}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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
                      required: 'Port is required',
                      min: { value: 1024, message: 'Port must be >= 1024' },
                      max: { value: 65535, message: 'Port must be <= 65535' }
                    })}
                    type="number"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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

              {/* Provider Examples */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  Popular SIP Providers
                </h4>
                <div className="space-y-2 text-sm text-gray-600">
                  <div>
                    <strong>Modulus.gr:</strong> Domain: sip.modulus.gr, Proxy: proxy.modulus.gr
                  </div>
                  <div>
                    <strong>Linphone.org:</strong> Domain: sip.linphone.org
                  </div>
                  <div>
                    <strong>FreePBX:</strong> Domain: your-server.com, Port: 5060
                  </div>
                </div>
              </div>

              {/* Actions */}
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
                  className="px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700"
                >
                  Save SIP Settings
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* SIP Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <SafeIcon icon={FiSettings} className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3">
            <h4 className="text-sm font-medium text-blue-900">
              How SIP Integration Works
            </h4>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>The system registers with your SIP provider to monitor incoming calls</li>
                <li>When calls arrive, caller ID is extracted and looked up in your database</li>
                <li>Customer information and addresses are displayed in a popup</li>
                <li>You can select delivery addresses and log call details</li>
                <li>All call activity is tracked for reporting and analytics</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SipSettings;