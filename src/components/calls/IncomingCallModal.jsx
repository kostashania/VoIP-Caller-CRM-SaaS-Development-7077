import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';

const { FiPhone, FiPhoneOff, FiInfo } = FiIcons;

// This component is now deprecated in favor of IncomingCallPopup
// Keeping for backward compatibility
function IncomingCallModal() {
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4"
          >
            <div className="text-center">
              <SafeIcon icon={FiInfo} className="mx-auto h-12 w-12 text-blue-500" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                VoIP Integration Active
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                This component has been replaced by the new VoIP call popup system.
                Please check the new IncomingCallPopup component.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}

export default IncomingCallModal;