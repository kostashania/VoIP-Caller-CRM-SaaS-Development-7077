import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';
import { useAuthStore } from '../../store/authStore';
import { authAPI } from '../../services/supabaseAPI';

const { FiPhone, FiUser, FiLock, FiEye, FiEyeOff, FiLogIn } = FiIcons;

// Demo users for easy login
const DEMO_USERS = [
  {
    id: 'super',
    name: 'Super Admin',
    email: 'super@voipcrm.com',
    role: 'superadmin',
    description: 'Full system access, manage all companies',
    color: 'bg-red-50 border-red-200 hover:bg-red-100',
    textColor: 'text-red-700',
    icon: '👑'
  },
  {
    id: 'admin1',
    name: 'John Admin',
    email: 'admin@company1.com',
    role: 'admin',
    description: 'TechCorp Solutions - Admin access',
    color: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
    textColor: 'text-blue-700',
    icon: '🏢'
  },
  {
    id: 'user1',
    name: 'Jane User',
    email: 'user@company1.com',
    role: 'user',
    description: 'TechCorp Solutions - Standard user',
    color: 'bg-green-50 border-green-200 hover:bg-green-100',
    textColor: 'text-green-700',
    icon: '👤'
  },
  {
    id: 'admin2',
    name: 'Company 2 Admin',
    email: 'admin@company2.com',
    role: 'admin',
    description: 'Global Enterprises - Admin access',
    color: 'bg-purple-50 border-purple-200 hover:bg-purple-100',
    textColor: 'text-purple-700',
    icon: '🌍'
  }
];

function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDemo, setSelectedDemo] = useState(null);
  const navigate = useNavigate();
  const { login } = useAuthStore();
  
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm();
  const emailValue = watch('email');

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      const response = await authAPI.login(data.email, data.password);
      login(response.user, response.token);
      toast.success(`Welcome back, ${response.user.name}!`);
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async (demoUser) => {
    setSelectedDemo(demoUser.id);
    setIsLoading(true);
    
    try {
      // Set form values
      setValue('email', demoUser.email);
      setValue('password', 'demo');
      
      // Login with demo user
      const response = await authAPI.login(demoUser.email, 'demo');
      login(response.user, response.token);
      toast.success(`Welcome, ${response.user.name}!`);
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
      setSelectedDemo(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
            <SafeIcon icon={FiPhone} className="w-8 h-8 text-primary-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">VoIP Caller CRM</h1>
          <p className="text-gray-600 mt-2">Sign in to your account</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Easy Demo Login */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              🚀 Quick Demo Access
            </h3>
            <div className="space-y-3">
              {DEMO_USERS.map((user) => (
                <motion.button
                  key={user.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleDemoLogin(user)}
                  disabled={isLoading}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-all ${user.color} disabled:opacity-50`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">{user.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <p className={`font-semibold ${user.textColor}`}>
                          {user.name}
                        </p>
                        {selectedDemo === user.id && (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {user.description}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {user.email}
                      </p>
                    </div>
                    <SafeIcon icon={FiLogIn} className="w-5 h-5 text-gray-400" />
                  </div>
                </motion.button>
              ))}
            </div>
            
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600">
                💡 <strong>Tip:</strong> Click any user above for instant access. 
                No password required for demo accounts!
              </p>
            </div>
          </div>

          {/* Manual Login Form */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              🔐 Manual Login
            </h3>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <SafeIcon icon={FiUser} className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('email', {
                      required: 'Email is required',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Invalid email address'
                      }
                    })}
                    type="email"
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Enter your email"
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <SafeIcon icon={FiLock} className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('password', { required: 'Password is required' })}
                    type={showPassword ? 'text' : 'password'}
                    className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Enter password (or 'demo')"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <SafeIcon
                      icon={showPassword ? FiEyeOff : FiEye}
                      className="h-5 w-5 text-gray-400 hover:text-gray-600"
                    />
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-600">
                <strong>Demo Mode:</strong> Use any email from the quick access buttons 
                with password "demo" or any text.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center border-t border-gray-200 pt-6">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <Link to="/register" className="font-medium text-primary-600 hover:text-primary-500">
              Sign up
            </Link>
          </p>
          <p className="text-xs text-gray-500 mt-2">
            🔗 Connected to Supabase database with real-time data
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default Login;