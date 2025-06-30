import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';
import { addressesAPI } from '../../services/supabaseAPI';

const { FiX, FiMapPin, FiTag, FiFileText, FiPhone } = FiIcons;

function AddressModal({ isOpen, onClose, callerId, address, onSubmit }) {
  const isEditing = !!address;
  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    defaultValues: {
      label: address?.label || 'Home',
      address: address?.address || '',
      phone: address?.phone || '',
      comment: address?.comment || ''
    }
  });

  const handleFormSubmit = async (data) => {
    try {
      console.log('Address modal form submit:', { isEditing, callerId, data });
      
      let result;
      if (isEditing) {
        // Update existing address
        result = await addressesAPI.update(address.id, {
          label: data.label,
          address: data.address,
          phone: data.phone || null,
          comment: data.comment || null
        });
        console.log('Address updated:', result);
        toast.success('Address updated successfully');
      } else {
        // Create new address
        result = await addressesAPI.create({
          caller_id: callerId,
          label: data.label,
          address: data.address,
          phone: data.phone || null,
          comment: data.comment || null,
          is_primary: false
        });
        console.log('Address created:', result);
        toast.success('Address added successfully');
      }

      // Call the onSubmit callback if provided
      if (onSubmit) {
        await onSubmit(result);
      }

      reset();
      onClose();
    } catch (error) {
      console.error(`Failed to ${isEditing ? 'update' : 'add'} address:`, error);
      toast.error(error.message || `Failed to ${isEditing ? 'update' : 'add'} address`);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
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
              className="relative bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">
                  {isEditing ? 'Edit Address' : 'Add New Address'}
                </h3>
                <button
                  onClick={handleClose}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <SafeIcon icon={FiX} className="w-6 h-6" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Label
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <SafeIcon icon={FiTag} className="h-5 w-5 text-gray-400" />
                    </div>
                    <select
                      {...register('label', { required: 'Label is required' })}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="Home">🏠 Home</option>
                      <option value="Work">🏢 Work</option>
                      <option value="Office">🏬 Office</option>
                      <option value="Home 2">🏡 Home 2</option>
                      <option value="Warehouse">🏭 Warehouse</option>
                      <option value="Store">🏪 Store</option>
                      <option value="Other">📍 Other</option>
                    </select>
                  </div>
                  {errors.label && (
                    <p className="mt-1 text-sm text-red-600">{errors.label.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address
                  </label>
                  <div className="relative">
                    <div className="absolute top-3 left-0 pl-3 flex items-start pointer-events-none">
                      <SafeIcon icon={FiMapPin} className="h-5 w-5 text-gray-400" />
                    </div>
                    <textarea
                      {...register('address', { required: 'Address is required' })}
                      rows={3}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Enter full address"
                    />
                  </div>
                  {errors.address && (
                    <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number (Optional)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <SafeIcon icon={FiPhone} className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      {...register('phone')}
                      type="tel"
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Phone number for this address"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Comments (Optional)
                  </label>
                  <div className="relative">
                    <div className="absolute top-3 left-0 pl-3 flex items-start pointer-events-none">
                      <SafeIcon icon={FiFileText} className="h-5 w-5 text-gray-400" />
                    </div>
                    <textarea
                      {...register('comment')}
                      rows={2}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Any special instructions or notes"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700"
                  >
                    {isEditing ? 'Update' : 'Add'} Address
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

export default AddressModal;