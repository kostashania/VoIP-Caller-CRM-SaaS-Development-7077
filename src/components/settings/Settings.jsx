import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';
import { useAuthStore } from '../../store/authStore';
import { mockAPI } from '../../services/mockData';

const { FiSettings, FiPhone, FiGlobe, FiUser, FiLock, FiCheckCircle, FiAlertCircle } = FiIcons;

function Settings() {
  const [activeTab, setActiveTab] = useState('voip');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const { user, hasRole } = useAuthStore();

  const { register, handleSubmit, formState: { errors }, setValue } = useForm();

  useEffect(() => {
    // Load existing VoIP settings
    const loadSettings = async () => {
      try {
        // Mock existing settings
        setValue('voipUrl', 'https://api.voipservice.com/webhook');
        setValue('voipUsername', 'techcorp_user');
        setValue('voipPassword', '');
        setValue('sipId', 'techcorp123');
        setValue('protocol', 'SIP');
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };

    loadSettings();
  }, [setValue]);

  const onSubmitVoip = async (data) => {
    try {
      // Mock API call
      toast.success('VoIP settings saved successfully');
    } catch (error) {
      toast.error('Failed to save VoIP settings');
    }
  };

  const testConnection = async () => {
    setIsTestingConnection(true);
    try {
      const result = await mockAPI.testVoipConnection({});
      setConnectionStatus({ success: true, message: result.message });
      toast.success('Connection test successful');
    } catch (error) {
      setConnectionStatus({ success: false, message: error.message });
      toast.error('Connection test failed');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const tabs = [
    { id: 'voip', name: 'VoIP Settings', icon: FiPhone },
    { id: 'profile', name: 'Profile', icon: FiUser },
  ];

  if (hasRole('superadmin')) {
    tabs.push({ id: 'system', name: 'System', icon: FiSettings });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
          Settings
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Manage your account and application settings.
        </p>
      </div>

      <div className="bg-white shadow rounded-lg">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm
                  ${activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <SafeIcon icon={tab.icon} className="w-5 h-5" />
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'voip' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">VoIP Integration</h3>
                <p className="text-sm text-gray-500 mb-6">
                  Configure your VoIP service connection to receive incoming call notifications.
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmitVoip)} className="space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Webhook URL
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <SafeIcon icon={FiGlobe} className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        {...register('voipUrl', { required: 'Webhook URL is required' })}
                        type="url"
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        placeholder="https://api.voipservice.com/webhook"
                      />
                    </div>
                    {errors.voipUrl && (
                      <p className="mt-1 text-sm text-red-600">{errors.voipUrl.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Username
                    </label>
                    <input
                      {...register('voipUsername', { required: 'Username is required' })}
                      type="text"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Enter username"
                    />
                    {errors.voipUsername && (
                      <p className="mt-1 text-sm text-red-600">{errors.voipUsername.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password / API Key
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <SafeIcon icon={FiLock} className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        {...register('voipPassword', { required: 'Password is required' })}
                        type="password"
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Enter password or API key"
                      />
                    </div>
                    {errors.voipPassword && (
                      <p className="mt-1 text-sm text-red-600">{errors.voipPassword.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SIP ID (Optional)
                    </label>
                    <input
                      {...register('sipId')}
                      type="text"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Enter SIP ID"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Protocol
                    </label>
                    <select
                      {...register('protocol')}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="SIP">SIP</option>
                      <option value="HTTP">HTTP</option>
                      <option value="HTTPS">HTTPS</option>
                    </select>
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
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={testConnection}
                    disabled={isTestingConnection}
                    className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <SafeIcon icon={FiPhone} className="w-4 h-4" />
                    <span>{isTestingConnection ? 'Testing...' : 'Test Connection'}</span>
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700"
                  >
                    Save Settings
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {activeTab === 'profile' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Profile Information</h3>
                <p className="text-sm text-gray-500 mb-6">
                  Update your personal information and account settings.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    defaultValue={user?.name}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    defaultValue={user?.email}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role
                  </label>
                  <input
                    type="text"
                    defaultValue={user?.role}
                    disabled
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                  />
                </div>

                {user?.company && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company
                    </label>
                    <input
                      type="text"
                      defaultValue={user.company.name}
                      disabled
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                    />
                  </div>
                )}

                <button
                  type="button"
                  className="px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700"
                >
                  Update Profile
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'system' && hasRole('superadmin') && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">System Settings</h3>
                <p className="text-sm text-gray-500 mb-6">
                  Global system configuration and platform settings.
                </p>
              </div>

              <div className="text-center py-8">
                <SafeIcon icon={FiSettings} className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">System Settings</h3>
                <p className="mt-1 text-sm text-gray-500">
                  System configuration options will be available here.
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Settings;