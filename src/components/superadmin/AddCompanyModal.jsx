import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';
import { companiesAPI } from '../../services/supabaseAPI';

const { FiX, FiBriefcase, FiCalendar, FiUser, FiMail, FiLock, FiEye, FiEyeOff } = FiIcons;

function AddCompanyModal({ isOpen, onClose, onSuccess }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch
  } = useForm();

  const password = watch('adminPassword');

  const onSubmit = async (data) => {
    try {
      setIsSubmitting(true);
      console.log('🚀 Submitting company creation form with data:', {
        ...data,
        adminPassword: '[HIDDEN]'
      });
      
      const result = await companiesAPI.create({
        name: data.name,
        subscriptionStart: data.subscriptionStart,
        subscriptionEnd: data.subscriptionEnd,
        adminName: data.adminName,
        adminEmail: data.adminEmail,
        adminPassword: data.adminPassword || 'admin123' // Default password if not provided
      });
      
      console.log('✅ Company created successfully:', result);
      toast.success('Company and admin user created successfully!', { duration: 3000 });
      reset();
      onSuccess(); // Call the success callback
    } catch (error) {
      console.error('❌ Failed to add company:', error);
      toast.error(error.message || 'Failed to add company', { duration: 4000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      reset();
      onClose();
    }
  };

  // Set default dates
  const today = new Date().toISOString().split('T')[0];
  const nextYear = new Date();
  nextYear.setFullYear(nextYear.getFullYear() + 1);
  const defaultEndDate = nextYear.toISOString().split('T')[0];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50"
              onClick={handleClose}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-lg shadow-xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">Add New Company</h3>
                <button
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                >
                  <SafeIcon icon={FiX} className="w-6 h-6" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Company Information */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4">Company Information</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Company Name *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <SafeIcon icon={FiBriefcase} className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          {...register('name', { required: 'Company name is required' })}
                          type="text"
                          disabled={isSubmitting}
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-50"
                          placeholder="Enter company name"
                        />
                      </div>
                      {errors.name && (
                        <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Subscription Details */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4">Subscription</h4>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Start Date *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <SafeIcon icon={FiCalendar} className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          {...register('subscriptionStart', { required: 'Start date is required' })}
                          type="date"
                          defaultValue={today}
                          disabled={isSubmitting}
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-50"
                        />
                      </div>
                      {errors.subscriptionStart && (
                        <p className="mt-1 text-sm text-red-600">{errors.subscriptionStart.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        End Date *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <SafeIcon icon={FiCalendar} className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          {...register('subscriptionEnd', { required: 'End date is required' })}
                          type="date"
                          defaultValue={defaultEndDate}
                          disabled={isSubmitting}
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-50"
                        />
                      </div>
                      {errors.subscriptionEnd && (
                        <p className="mt-1 text-sm text-red-600">{errors.subscriptionEnd.message}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Admin User */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4">Company Admin</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Admin Name *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <SafeIcon icon={FiUser} className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          {...register('adminName', { required: 'Admin name is required' })}
                          type="text"
                          disabled={isSubmitting}
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-50"
                          placeholder="Enter admin full name"
                        />
                      </div>
                      {errors.adminName && (
                        <p className="mt-1 text-sm text-red-600">{errors.adminName.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Admin Email *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <SafeIcon icon={FiMail} className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          {...register('adminEmail', {
                            required: 'Admin email is required',
                            pattern: {
                              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                              message: 'Invalid email address'
                            }
                          })}
                          type="email"
                          disabled={isSubmitting}
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-50"
                          placeholder="Enter admin email"
                        />
                      </div>
                      {errors.adminEmail && (
                        <p className="mt-1 text-sm text-red-600">{errors.adminEmail.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Admin Password
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <SafeIcon icon={FiLock} className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          {...register('adminPassword', {
                            minLength: {
                              value: 6,
                              message: 'Password must be at least 6 characters'
                            }
                          })}
                          type={showPassword ? 'text' : 'password'}
                          disabled={isSubmitting}
                          className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-50"
                          placeholder="Enter admin password (default: admin123)"
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
                      {errors.adminPassword && (
                        <p className="mt-1 text-sm text-red-600">{errors.adminPassword.message}</p>
                      )}
                      <p className="mt-1 text-xs text-gray-500">
                        If left empty, default password "admin123" will be used. Admin can change it later.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Creating...</span>
                      </div>
                    ) : (
                      'Add Company'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default AddCompanyModal;