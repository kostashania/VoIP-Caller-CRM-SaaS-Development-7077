import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';
import { useCallStore } from '../../store/callStore';
import { callsAPI } from '../../services/supabaseAPI';

const { FiPhone, FiPhoneOff, FiUser, FiMapPin } = FiIcons;

function IncomingCallModal() {
  const { incomingCall, clearIncomingCall, updateCallStatus } = useCallStore();

  useEffect(() => {
    // Auto-clear incoming call after 30 seconds
    const timer = setTimeout(() => {
      if (incomingCall) {
        handleMissed();
      }
    }, 30000);

    return () => clearTimeout(timer);
  }, [incomingCall]);

  const handleAnswer = async () => {
    if (incomingCall) {
      try {
        await callsAPI.updateStatus(incomingCall.id, 'answered', {
          duration_seconds: 0 // Will be updated when call ends
        });
        updateCallStatus(incomingCall.id, 'answered');
        clearIncomingCall();
      } catch (error) {
        console.error('Failed to update call status:', error);
      }
    }
  };

  const handleMissed = async () => {
    if (incomingCall) {
      try {
        await callsAPI.updateStatus(incomingCall.id, 'missed');
        updateCallStatus(incomingCall.id, 'missed');
        clearIncomingCall();
      } catch (error) {
        console.error('Failed to update call status:', error);
      }
    }
  };

  if (!incomingCall) return null;

  const caller = incomingCall.caller;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={handleMissed}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4"
          >
            {/* Pulsing ring animation */}
            <div className="absolute -inset-4">
              <div className="animate-pulse-ring rounded-full border-4 border-primary-400 opacity-75"></div>
            </div>

            {/* Content */}
            <div className="text-center">
              {/* Avatar */}
              <div className="mx-auto flex items-center justify-center w-24 h-24 bg-primary-100 rounded-full mb-6 relative">
                <SafeIcon icon={FiUser} className="w-12 h-12 text-primary-600" />
                <div className="absolute -bottom-2 -right-2 bg-green-500 rounded-full p-2 animate-bounce-gentle">
                  <SafeIcon icon={FiPhone} className="w-4 h-4 text-white" />
                </div>
              </div>

              {/* Caller Info */}
              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {caller?.name || 'Unknown Caller'}
                </h3>
                <p className="text-lg text-gray-600 mb-4">
                  {incomingCall.caller_number}
                </p>

                {/* Caller Details */}
                {caller && (
                  <div className="space-y-2 text-sm text-gray-500">
                    {caller.global_note && (
                      <p className="italic">"{caller.global_note}"</p>
                    )}
                    {caller.addresses && caller.addresses.length > 0 && (
                      <div className="space-y-1">
                        {caller.addresses.slice(0, 2).map((address, index) => (
                          <div key={address.id} className="flex items-center justify-center space-x-1">
                            <SafeIcon icon={FiMapPin} className="w-4 h-4" />
                            <span className="font-medium">{address.label}:</span>
                            <span>{address.address}</span>
                          </div>
                        ))}
                        {caller.addresses.length > 2 && (
                          <p className="text-xs text-gray-400">
                            +{caller.addresses.length - 2} more addresses
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleMissed}
                  className="flex-1 flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-6 rounded-xl shadow-lg transition-colors"
                >
                  <SafeIcon icon={FiPhoneOff} className="w-5 h-5" />
                  <span>Decline</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleAnswer}
                  className="flex-1 flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-xl shadow-lg transition-colors"
                >
                  <SafeIcon icon={FiPhone} className="w-5 h-5" />
                  <span>Answer</span>
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}

export default IncomingCallModal;