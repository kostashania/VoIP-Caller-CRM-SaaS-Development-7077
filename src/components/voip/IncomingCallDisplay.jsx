import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';
import { useCallStore } from '../../store/callStore';
import { useCallerStore } from '../../store/callerStore';
import { callLogsAPI, callersAPI, addressesAPI } from '../../services/supabaseAPI';
import { useAuthStore } from '../../store/authStore';
import AddressModal from '../callers/AddressModal';
import toast from 'react-hot-toast';

const { FiPhone, FiPhoneOff, FiUser, FiMapPin, FiPlus, FiEdit, FiTrash2, FiCheckCircle, FiX, FiFileText, FiHome, FiBriefcase } = FiIcons;

function IncomingCallDisplay() {
  const [callStartTime, setCallStartTime] = useState(null);
  const [callDuration, setCallDuration] = useState(0);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [showNewCallerForm, setShowNewCallerForm] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [callerData, setCallerData] = useState(null); // Track current caller data

  const { incomingCall, clearIncomingCall, updateCallLog } = useCallStore();
  const { addCaller, updateCaller } = useCallerStore();
  const { getUserCompanyId } = useAuthStore();

  // Update local caller data when incoming call changes
  useEffect(() => {
    if (incomingCall?.caller) {
      setCallerData(incomingCall.caller);
      console.log('📞 Call from existing customer:', incomingCall.caller.name);
    } else if (incomingCall) {
      setCallerData(null);
      console.log('📞 Call from unknown number:', incomingCall.caller_number);
    }
  }, [incomingCall]);

  useEffect(() => {
    let interval;
    if (isCallActive && callStartTime) {
      interval = setInterval(() => {
        setCallDuration(Math.floor((Date.now() - callStartTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isCallActive, callStartTime]);

  useEffect(() => {
    // Auto-clear incoming call after 30 seconds if not answered
    const timer = setTimeout(() => {
      if (incomingCall && !isCallActive && !callEnded) {
        handleMissed();
      }
    }, 30000);

    return () => clearTimeout(timer);
  }, [incomingCall, isCallActive, callEnded]);

  const handleAnswer = async () => {
    if (!incomingCall) return;

    try {
      setIsCallActive(true);
      setCallStartTime(Date.now());

      // Update call log status
      const updatedCall = await callLogsAPI.updateStatus(incomingCall.id, 'answered', {
        answered_at: new Date().toISOString()
      });

      updateCallLog(updatedCall);
      toast.success('Call answered', { duration: 1500 });
    } catch (error) {
      console.error('Failed to answer call:', error);
      toast.error('Failed to answer call');
    }
  };

  const handleEndCall = async () => {
    if (!incomingCall) return;

    try {
      // Update call log with final details
      const updateData = {
        duration_seconds: callDuration,
        ended_at: new Date().toISOString(),
        selected_address_id: selectedAddressId || null
      };

      const updatedCall = await callLogsAPI.updateStatus(incomingCall.id, 'completed', updateData);
      updateCallLog(updatedCall);

      setIsCallActive(false);
      setCallEnded(true); // Mark call as ended but don't close popup

      toast.success(`Call completed (${formatDuration(callDuration)})`, { duration: 2000 });
    } catch (error) {
      console.error('Failed to end call:', error);
      toast.error('Failed to end call');
    }
  };

  const handleMissed = async () => {
    if (!incomingCall) return;

    try {
      const updatedCall = await callLogsAPI.updateStatus(incomingCall.id, 'missed');
      updateCallLog(updatedCall);

      setCallEnded(true); // Mark call as ended but don't close popup
      toast.info('Call missed', { duration: 1500 });
    } catch (error) {
      console.error('Failed to mark call as missed:', error);
    }
  };

  const handleClosePopup = () => {
    clearIncomingCall();
    setCallEnded(false);
    setIsCallActive(false);
    setCallStartTime(null);
    setCallDuration(0);
    setSelectedAddressId(null);
    setShowNewCallerForm(false);
    setCallerData(null);
  };

  const handleCreateNewCaller = async (formData) => {
    try {
      const companyId = getUserCompanyId();
      
      console.log('🆕 Creating new caller with data:', formData);

      const newCaller = await callersAPI.create({
        company_id: companyId,
        phone_number: incomingCall.caller_number,
        name: formData.name,
        global_note: formData.notes || ''
      });

      console.log('✅ New caller created:', newCaller);

      // Add caller to store
      addCaller(newCaller);

      // Update local state
      setCallerData(newCaller);

      // Update the incoming call with the new caller
      const updatedCall = {
        ...incomingCall,
        caller: newCaller,
        caller_id: newCaller.id
      };
      updateCallLog(updatedCall);

      setShowNewCallerForm(false);
      toast.success('Customer created successfully', { duration: 2000 });
    } catch (error) {
      console.error('Failed to create caller:', error);
      toast.error('Failed to create customer');
    }
  };

  const handleAddressSelect = async (addressId) => {
    setSelectedAddressId(addressId);
    
    if (incomingCall.id) {
      try {
        await callLogsAPI.setSelectedAddress(incomingCall.id, addressId);
        toast.success('Address selected', { duration: 1500 });
      } catch (error) {
        console.error('Failed to set selected address:', error);
      }
    }
  };

  const handleEditAddress = (address) => {
    setEditingAddress(address);
    setShowAddressModal(true);
  };

  const handleDeleteAddress = async (addressId) => {
    if (!confirm('Are you sure you want to delete this address?')) return;

    try {
      await addressesAPI.delete(addressId);

      // Update local caller data
      if (callerData) {
        const updatedCaller = {
          ...callerData,
          addresses: callerData.addresses.filter(addr => addr.id !== addressId)
        };
        setCallerData(updatedCaller);
        updateCaller(callerData.id, updatedCaller);
      }

      toast.success('Address deleted successfully', { duration: 2000 });
    } catch (error) {
      console.error('Failed to delete address:', error);
      toast.error('Failed to delete address');
    }
  };

  const handleAddAddress = async (addressData) => {
    try {
      console.log('➕ Adding new address:', addressData);

      // Check if caller exists
      if (!callerData?.id) {
        toast.error('Please create the customer first');
        return;
      }

      const newAddress = await addressesAPI.create({
        caller_id: callerData.id,
        label: addressData.label,
        address: addressData.address,
        phone: addressData.phone || null,
        comment: addressData.comment || null,
        is_primary: false
      });

      console.log('✅ New address created:', newAddress);

      // Update local caller data
      const updatedCaller = {
        ...callerData,
        addresses: [...(callerData.addresses || []), newAddress]
      };
      
      setCallerData(updatedCaller);
      updateCaller(callerData.id, updatedCaller);

      setShowAddressModal(false);
      setEditingAddress(null);

      toast.success('Address added successfully', { duration: 2000 });
    } catch (error) {
      console.error('Failed to add address:', error);
      
      // Check for specific duplicate error
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        toast.error(`Address label "${addressData.label}" already exists for this customer. Please use a different label.`);
      } else {
        toast.error('Failed to add address');
      }
    }
  };

  const handleUpdateAddress = async (addressData) => {
    try {
      console.log('📝 Updating address:', editingAddress.id, addressData);

      const updatedAddress = await addressesAPI.update(editingAddress.id, {
        label: addressData.label,
        address: addressData.address,
        phone: addressData.phone || null,
        comment: addressData.comment || null
      });

      console.log('✅ Address updated:', updatedAddress);

      // Update local caller data
      if (callerData) {
        const updatedCaller = {
          ...callerData,
          addresses: callerData.addresses.map(addr =>
            addr.id === editingAddress.id ? updatedAddress : addr
          )
        };
        setCallerData(updatedCaller);
        updateCaller(callerData.id, updatedCaller);
      }

      setShowAddressModal(false);
      setEditingAddress(null);

      toast.success('Address updated successfully', { duration: 2000 });
    } catch (error) {
      console.error('Failed to update address:', error);
      
      // Check for specific duplicate error
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        toast.error(`Address label "${addressData.label}" already exists for this customer. Please use a different label.`);
      } else {
        toast.error('Failed to update address');
      }
    }
  };

  const handleAddAddressClick = () => {
    // Make sure we have a customer before allowing address creation
    if (!callerData?.id) {
      toast.error('Please create the customer first before adding addresses');
      return;
    }

    setEditingAddress(null);
    setShowAddressModal(true);
  };

  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getAddressIcon = (label) => {
    const lowerLabel = label.toLowerCase();
    if (lowerLabel.includes('home') || lowerLabel.includes('house')) return FiHome;
    if (lowerLabel.includes('work') || lowerLabel.includes('office') || lowerLabel.includes('business')) return FiBriefcase;
    return FiMapPin;
  };

  if (!incomingCall) return null;

  const addresses = callerData?.addresses || [];

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black bg-opacity-50" />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className={`${
            isCallActive 
              ? 'bg-gradient-to-r from-green-600 to-green-700' 
              : callEnded 
                ? 'bg-gradient-to-r from-gray-600 to-gray-700' 
                : 'bg-gradient-to-r from-blue-600 to-blue-700'
          } rounded-t-2xl p-6 text-white`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {callEnded ? '📞 Call Ended' : isCallActive ? '📞 Active Call' : '📱 Incoming Call'}
              </h3>
              <div className="flex items-center space-x-2">
                {isCallActive && (
                  <div className="flex items-center space-x-2 bg-white bg-opacity-20 rounded-full px-3 py-1">
                    <SafeIcon icon={FiPhone} className="w-4 h-4" />
                    <span className="text-sm font-mono">
                      {formatDuration(callDuration)}
                    </span>
                  </div>
                )}
                <button
                  onClick={handleClosePopup}
                  className="text-white hover:text-gray-200"
                >
                  <SafeIcon icon={FiX} className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Caller Info */}
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center w-16 h-16 bg-white bg-opacity-20 rounded-full mb-3">
                <SafeIcon icon={FiUser} className="w-8 h-8" />
              </div>
              <h4 className="text-xl font-bold">
                {callerData?.name || 'Unknown Caller'}
              </h4>
              <p className="text-lg opacity-90">
                {incomingCall.caller_number}
              </p>
              <p className="text-sm opacity-75">
                {format(new Date(incomingCall.timestamp), 'HH:mm:ss')}
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {callerData ? (
              <div className="space-y-6">
                {/* Customer Found */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <SafeIcon icon={FiCheckCircle} className="w-5 h-5 text-green-600" />
                    <h5 className="font-medium text-green-900">Customer Found</h5>
                  </div>
                  {callerData.global_note && (
                    <p className="text-sm text-green-700 italic">
                      "📝 {callerData.global_note}"
                    </p>
                  )}
                </div>

                {/* New Address Button */}
                <div className="text-center">
                  <button
                    onClick={handleAddAddressClick}
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    <SafeIcon icon={FiPlus} className="w-4 h-4" />
                    <span>Add New Address</span>
                  </button>
                </div>

                {/* Addresses */}
                {addresses.length > 0 ? (
                  <div>
                    <h5 className="font-medium text-gray-900 mb-4">📍 Delivery Addresses</h5>
                    <div className="space-y-3">
                      {addresses.map((address) => (
                        <motion.div
                          key={address.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`border-2 rounded-lg p-4 transition-colors cursor-pointer ${
                            selectedAddressId === address.id
                              ? 'border-primary-500 bg-primary-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => handleAddressSelect(address.id)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <SafeIcon icon={getAddressIcon(address.label)} className="w-5 h-5 text-gray-400" />
                                <span className="font-medium text-gray-900">{address.label}</span>
                                {selectedAddressId === address.id && (
                                  <SafeIcon icon={FiCheckCircle} className="w-5 h-5 text-primary-600" />
                                )}
                              </div>
                              <p className="text-gray-700 mb-2">{address.address}</p>
                              {address.comment && (
                                <p className="text-sm text-gray-500 italic mb-3">
                                  💬 {address.comment}
                                </p>
                              )}
                              {address.phone && address.phone !== callerData.phone_number && (
                                <p className="text-sm text-gray-600">
                                  📞 {address.phone}
                                </p>
                              )}
                            </div>
                            <div className="flex space-x-2 ml-4">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditAddress(address);
                                }}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="Edit address"
                              >
                                <SafeIcon icon={FiEdit} className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteAddress(address.id);
                                }}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Delete address"
                              >
                                <SafeIcon icon={FiTrash2} className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <SafeIcon icon={FiMapPin} className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No addresses found</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Add the first address for this customer.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* Unknown Caller */
              <div className="text-center py-8">
                <SafeIcon icon={FiUser} className="mx-auto h-12 w-12 text-gray-400" />
                <h5 className="mt-2 text-lg font-medium text-gray-900">❓ Unknown Caller</h5>
                <p className="text-sm text-gray-500 mt-1 mb-6">
                  This number is not in your customer database
                </p>

                {!showNewCallerForm ? (
                  <button
                    onClick={() => setShowNewCallerForm(true)}
                    className="inline-flex items-center space-x-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  >
                    <SafeIcon icon={FiPlus} className="w-5 h-5" />
                    <span>Create New Customer</span>
                  </button>
                ) : (
                  <div className="text-left bg-gray-50 rounded-lg p-4 max-w-md mx-auto">
                    <h6 className="font-medium text-gray-900 mb-4">Create New Customer</h6>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.target);
                        handleCreateNewCaller({
                          name: formData.get('name'),
                          notes: formData.get('notes')
                        });
                      }}
                    >
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Customer Name *
                          </label>
                          <input
                            name="name"
                            type="text"
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            placeholder="Enter customer name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Notes (Optional)
                          </label>
                          <textarea
                            name="notes"
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            placeholder="Any notes about this customer"
                          />
                        </div>
                        <div className="flex space-x-3">
                          <button
                            type="button"
                            onClick={() => setShowNewCallerForm(false)}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700"
                          >
                            Create
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons - Only show if call hasn't ended */}
          {!callEnded && (
            <div className="border-t border-gray-200 px-6 py-4">
              {!isCallActive ? (
                <div className="flex space-x-3">
                  <button
                    onClick={handleMissed}
                    className="flex-1 flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                  >
                    <SafeIcon icon={FiPhoneOff} className="w-5 h-5" />
                    <span>Decline</span>
                  </button>
                  <button
                    onClick={handleAnswer}
                    className="flex-1 flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors animate-pulse"
                  >
                    <SafeIcon icon={FiPhone} className="w-5 h-5" />
                    <span>Answer</span>
                  </button>
                </div>
              ) : (
                <div className="flex space-x-3">
                  <button
                    onClick={handleEndCall}
                    className="w-full flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                  >
                    <SafeIcon icon={FiPhoneOff} className="w-5 h-5" />
                    <span>End Call</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Show close button if call has ended */}
          {callEnded && (
            <div className="border-t border-gray-200 px-6 py-4">
              <button
                onClick={handleClosePopup}
                className="w-full flex items-center justify-center space-x-2 bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                <SafeIcon icon={FiX} className="w-5 h-5" />
                <span>Close</span>
              </button>
            </div>
          )}
        </motion.div>
      </div>

      {/* Address Modal */}
      {showAddressModal && callerData && (
        <AddressModal
          isOpen={showAddressModal}
          onClose={() => {
            setShowAddressModal(false);
            setEditingAddress(null);
          }}
          callerId={callerData.id}
          address={editingAddress}
          onSubmit={editingAddress ? handleUpdateAddress : handleAddAddress}
        />
      )}
    </>
  );
}

export default IncomingCallDisplay;