import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';
import { useCallStore } from '../../store/callStore';
import { useCallerStore } from '../../store/callerStore';
import { callLogsAPI, callersAPI, addressesAPI } from '../../services/supabaseAPI';
import { useAuthStore } from '../../store/authStore';
import CreateCallerFromWebhookModal from './CreateCallerFromWebhookModal';
import PrintCallerInfo from './PrintCallerInfo';
import toast from 'react-hot-toast';

const { FiPhone, FiPhoneOff, FiUser, FiMapPin, FiPlus, FiEdit, FiClock, FiCheckCircle, FiX, FiFileText, FiPrinter, FiUserPlus } = FiIcons;

function WebhookCallPopup() {
  const [callStartTime, setCallStartTime] = useState(null);
  const [callDuration, setCallDuration] = useState(0);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [showCreateCaller, setShowCreateCaller] = useState(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);

  const { incomingCall, clearIncomingCall, updateCallLog } = useCallStore();
  const { addCaller, updateCaller } = useCallerStore();
  const { getUserCompanyId } = useAuthStore();

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
      if (incomingCall && !isCallActive && incomingCall.isWebhookCall) {
        handleMissed();
      }
    }, 30000);

    return () => clearTimeout(timer);
  }, [incomingCall, isCallActive]);

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
      const companyId = getUserCompanyId();
      const newCaller = await callersAPI.create({
        ...callerData,
        company_id: companyId,
        phone_number: incomingCall.caller_number
      });

      // Create the address if provided
      if (callerData.address) {
        const newAddress = await addressesAPI.create({
          caller_id: newCaller.id,
          label: callerData.addressType || 'Home',
          address: callerData.address,
          comment: callerData.comment || '',
          phone: incomingCall.caller_number,
          is_primary: true
        });

        // Update caller with the address
        newCaller.addresses = [newAddress];
      }

      addCaller(newCaller);

      // Update the incoming call with the new caller
      const updatedCall = {
        ...incomingCall,
        caller: newCaller,
        caller_id: newCaller.id
      };
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

  const handlePrint = () => {
    setShowPrintDialog(true);
  };

  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (!incomingCall || !incomingCall.isWebhookCall) return null;

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
              className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4"
            >
              {/* Header */}
              <div className={`${
                isCallActive 
                  ? 'bg-gradient-to-r from-green-600 to-green-700' 
                  : 'bg-gradient-to-r from-blue-600 to-blue-700'
              } rounded-t-2xl p-6 text-white`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">
                    {isCallActive ? '📞 Active Webhook Call' : '📱 Incoming Webhook Call'}
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
                  <div className="mt-2 text-xs opacity-75 bg-white bg-opacity-20 rounded-full px-3 py-1 inline-block">
                    📡 Webhook Call
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 max-h-96 overflow-y-auto">
                {caller ? (
                  <div className="space-y-4">
                    {/* Customer Found */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <SafeIcon icon={FiCheckCircle} className="w-5 h-5 text-green-600" />
                        <h5 className="font-medium text-green-900">✅ Customer Found</h5>
                      </div>
                      <p className="text-sm text-green-700">
                        This caller is registered in your system.
                      </p>
                    </div>

                    {/* Global Note */}
                    {caller.global_note && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-blue-800 italic">
                          "📝 {caller.global_note}"
                        </p>
                      </div>
                    )}

                    {/* Print Button */}
                    <div className="flex justify-center">
                      <button
                        onClick={handlePrint}
                        className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <SafeIcon icon={FiPrinter} className="w-4 h-4" />
                        <span>Print Customer Info</span>
                      </button>
                    </div>

                    {/* Addresses */}
                    {addresses.length > 0 ? (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-medium text-gray-900">📍 Delivery Addresses</h5>
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
                      <SafeIcon icon={FiUserPlus} className="w-4 h-4" />
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
        <CreateCallerFromWebhookModal
          isOpen={showCreateCaller}
          onClose={() => setShowCreateCaller(false)}
          onSubmit={handleCreateCaller}
          phoneNumber={incomingCall.caller_number}
        />
      )}

      {/* Print Dialog */}
      {showPrintDialog && caller && (
        <PrintCallerInfo
          isOpen={showPrintDialog}
          onClose={() => setShowPrintDialog(false)}
          caller={caller}
          selectedAddress={addresses.find(addr => addr.id === selectedAddressId)}
        />
      )}
    </>
  );
}

export default WebhookCallPopup;