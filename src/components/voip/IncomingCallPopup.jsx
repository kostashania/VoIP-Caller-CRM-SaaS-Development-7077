import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';
import { useCallStore } from '../../store/callStore';
import { useCallerStore } from '../../store/callerStore';
import { callLogsAPI, callersAPI, addressesAPI } from '../../services/supabaseAPI';
import { sipService } from '../../services/sipService';
import CreateCallerModal from './CreateCallerModal';
import AddressModal from '../callers/AddressModal';
import toast from 'react-hot-toast';

const { 
  FiPhone, FiPhoneOff, FiUser, FiMapPin, FiPlus, FiEdit, 
  FiClock, FiCheckCircle, FiTruck, FiX, FiFileText 
} = FiIcons;

function IncomingCallPopup() {
  const [callStartTime, setCallStartTime] = useState(null);
  const [callDuration, setCallDuration] = useState(0);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [deliveryStatus, setDeliveryStatus] = useState('pending');
  const [callNote, setCallNote] = useState('');
  const [showCreateCaller, setShowCreateCaller] = useState(false);
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);

  const { incomingCall, clearIncomingCall, updateCallLog } = useCallStore();
  const { addCaller, updateCaller } = useCallerStore();

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
    // Auto-clear incoming call after 25 seconds if not answered
    const timer = setTimeout(() => {
      if (incomingCall && !isCallActive) {
        handleMissed();
      }
    }, 25000);

    return () => clearTimeout(timer);
  }, [incomingCall, isCallActive]);

  const handleAnswer = async () => {
    if (!incomingCall) return;

    try {
      setIsCallActive(true);
      setCallStartTime(Date.now());
      
      await sipService.answerCall(incomingCall.id);
      
      // Update call log status
      const updatedCall = await callLogsAPI.updateStatus(incomingCall.id, 'answered');
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
      await sipService.endCall(incomingCall.id, callDuration);
      
      // Update call log with final details
      const updateData = {
        duration_seconds: callDuration,
        ended_at: new Date().toISOString(),
        call_note: callNote || null,
        selected_address_id: selectedAddressId || null,
        delivery_status: deliveryStatus
      };
      
      const updatedCall = await callLogsAPI.updateStatus(incomingCall.id, 'completed', updateData);
      updateCallLog(updatedCall);
      
      setIsCallActive(false);
      clearIncomingCall();
      
      toast.success(`Call completed (${formatDuration(callDuration)})`, { duration: 2000 });
    } catch (error) {
      console.error('Failed to end call:', error);
      toast.error('Failed to end call');
    }
  };

  const handleMissed = async () => {
    if (!incomingCall) return;

    try {
      await sipService.missCall(incomingCall.id);
      
      const updatedCall = await callLogsAPI.updateStatus(incomingCall.id, 'missed');
      updateCallLog(updatedCall);
      
      clearIncomingCall();
      toast.info('Call missed', { duration: 1500 });
    } catch (error) {
      console.error('Failed to mark call as missed:', error);
    }
  };

  const handleCreateCaller = async (callerData) => {
    try {
      const newCaller = await callersAPI.create({
        ...callerData,
        phone_number: incomingCall.caller_number
      });
      
      addCaller(newCaller);
      
      // Update the incoming call with the new caller
      const updatedCall = { ...incomingCall, caller: newCaller, caller_id: newCaller.id };
      updateCallLog(updatedCall);
      
      setShowCreateCaller(false);
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

  const handleAddAddress = async (addressData) => {
    try {
      const newAddress = await addressesAPI.create({
        ...addressData,
        caller_id: incomingCall.caller.id
      });
      
      // Update caller with new address
      const updatedCaller = {
        ...incomingCall.caller,
        addresses: [...(incomingCall.caller.addresses || []), newAddress]
      };
      
      updateCaller(incomingCall.caller.id, updatedCaller);
      setShowAddAddress(false);
      setSelectedAddressId(newAddress.id);
      
      toast.success('Address added successfully', { duration: 2000 });
    } catch (error) {
      console.error('Failed to add address:', error);
      toast.error('Failed to add address');
    }
  };

  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleDeliveryStatusChange = async (status) => {
    setDeliveryStatus(status);
    
    if (incomingCall.id) {
      try {
        await callLogsAPI.updateDeliveryStatus(incomingCall.id, status);
        toast.success(`Delivery status: ${status}`, { duration: 1500 });
      } catch (error) {
        console.error('Failed to update delivery status:', error);
      }
    }
  };

  if (!incomingCall) return null;

  const caller = incomingCall.caller;
  const addresses = caller?.addresses || [];

  return (
    <>
      <AnimatePresence>
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 modal-backdrop"
            />

            {/* Popup */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4"
            >
              {/* Header */}
              <div className={`${isCallActive ? 'bg-gradient-to-r from-green-600 to-green-700' : 'bg-gradient-to-r from-primary-600 to-primary-700'} rounded-t-2xl p-6 text-white`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">
                    {isCallActive ? '📞 Active Call' : '📱 Incoming Call'}
                  </h3>
                  <div className="flex items-center space-x-2">
                    {isCallActive && (
                      <div className="flex items-center space-x-2 bg-white bg-opacity-20 rounded-full px-3 py-1">
                        <SafeIcon icon={FiClock} className="w-4 h-4" />
                        <span className="text-sm font-mono">
                          {formatDuration(callDuration)}
                        </span>
                      </div>
                    )}
                    {!isCallActive && (
                      <button
                        onClick={handleMissed}
                        className="text-white hover:text-gray-200"
                      >
                        <SafeIcon icon={FiX} className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Caller Info */}
                <div className="text-center">
                  <div className="mx-auto flex items-center justify-center w-16 h-16 bg-white bg-opacity-20 rounded-full mb-3">
                    <SafeIcon icon={FiUser} className="w-8 h-8" />
                  </div>
                  <h4 className="text-xl font-bold">
                    {caller?.name || 'Unknown Caller'}
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
              <div className="p-6 max-h-96 overflow-y-auto">
                {/* Caller Details */}
                {caller ? (
                  <div className="space-y-4">
                    {/* Global Note */}
                    {caller.global_note && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-blue-800 italic">
                          "📝 {caller.global_note}"
                        </p>
                      </div>
                    )}

                    {/* Addresses */}
                    {addresses.length > 0 ? (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-medium text-gray-900">📍 Select Delivery Address</h5>
                          <button
                            onClick={() => setShowAddAddress(true)}
                            className="text-primary-600 hover:text-primary-500"
                          >
                            <SafeIcon icon={FiPlus} className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {addresses.map((address) => (
                            <button
                              key={address.id}
                              onClick={() => handleAddressSelect(address.id)}
                              className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
                                selectedAddressId === address.id
                                  ? 'border-primary-500 bg-primary-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <div className="flex items-start space-x-2">
                                <SafeIcon icon={FiMapPin} className="w-4 h-4 text-gray-400 mt-0.5" />
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900">{address.label}</p>
                                  <p className="text-sm text-gray-600">{address.address}</p>
                                  {address.comment && (
                                    <p className="text-xs text-gray-500 mt-1">💬 {address.comment}</p>
                                  )}
                                </div>
                                {selectedAddressId === address.id && (
                                  <SafeIcon icon={FiCheckCircle} className="w-5 h-5 text-primary-600" />
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <SafeIcon icon={FiMapPin} className="mx-auto h-8 w-8 text-gray-400" />
                        <p className="text-sm text-gray-500 mt-2">No addresses found</p>
                        <button
                          onClick={() => setShowAddAddress(true)}
                          className="mt-2 text-primary-600 hover:text-primary-500 text-sm"
                        >
                          ➕ Add Address
                        </button>
                      </div>
                    )}

                    {/* Delivery Status */}
                    {isCallActive && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          🚚 Delivery Status
                        </label>
                        <select
                          value={deliveryStatus}
                          onChange={(e) => handleDeliveryStatusChange(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        >
                          <option value="pending">⏳ Pending</option>
                          <option value="started">🚛 Delivery Started</option>
                          <option value="completed">✅ Completed</option>
                          <option value="cancelled">❌ Cancelled</option>
                        </select>
                      </div>
                    )}

                    {/* Call Notes */}
                    {isCallActive && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          📝 Call Notes
                        </label>
                        <textarea
                          value={callNote}
                          onChange={(e) => setCallNote(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          placeholder="Add notes about this call..."
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  /* Unknown Caller */
                  <div className="text-center py-6">
                    <SafeIcon icon={FiUser} className="mx-auto h-12 w-12 text-gray-400" />
                    <h5 className="mt-2 text-lg font-medium text-gray-900">❓ Unknown Caller</h5>
                    <p className="text-sm text-gray-500 mt-1">
                      This number is not in your customer database
                    </p>
                    <button
                      onClick={() => setShowCreateCaller(true)}
                      className="mt-4 inline-flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                    >
                      <SafeIcon icon={FiPlus} className="w-4 h-4" />
                      <span>Create New Customer</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
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
            </motion.div>
          </div>
        </div>
      </AnimatePresence>

      {/* Create Caller Modal */}
      {showCreateCaller && (
        <CreateCallerModal
          isOpen={showCreateCaller}
          onClose={() => setShowCreateCaller(false)}
          onSubmit={handleCreateCaller}
          phoneNumber={incomingCall.caller_number}
        />
      )}

      {/* Add Address Modal */}
      {showAddAddress && caller && (
        <AddressModal
          isOpen={showAddAddress}
          onClose={() => setShowAddAddress(false)}
          callerId={caller.id}
          onSubmit={handleAddAddress}
        />
      )}
    </>
  );
}

export default IncomingCallPopup;