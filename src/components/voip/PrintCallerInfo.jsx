import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';

const { FiX, FiPrinter, FiMapPin, FiPhone, FiUser, FiFileText } = FiIcons;

function PrintCallerInfo({ isOpen, onClose, caller, selectedAddress }) {
  const printRef = useRef();

  const handlePrint = () => {
    const printContent = printRef.current;
    const originalContents = document.body.innerHTML;
    
    // Create print-specific styles
    const printStyles = `
      <style>
        @media print {
          body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
          .print-container { max-width: 100%; }
          .print-header { border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
          .print-section { margin-bottom: 15px; }
          .print-label { font-weight: bold; margin-bottom: 5px; }
          .print-value { margin-bottom: 10px; }
          .print-address { border: 1px solid #ccc; padding: 10px; margin: 10px 0; }
          .no-print { display: none !important; }
        }
      </style>
    `;

    document.body.innerHTML = printStyles + printContent.innerHTML;
    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload(); // Reload to restore event listeners
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[70] overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50"
              onClick={onClose}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 no-print">
                <h3 className="text-lg font-medium text-gray-900">Print Customer Information</h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handlePrint}
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <SafeIcon icon={FiPrinter} className="w-4 h-4" />
                    <span>Print</span>
                  </button>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <SafeIcon icon={FiX} className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Print Content */}
              <div ref={printRef} className="p-6 print-container">
                <div className="print-header">
                  <h1 className="text-2xl font-bold text-center">Customer Information</h1>
                  <p className="text-center text-gray-600 mt-2">
                    Generated on {format(new Date(), 'PPP p')}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Customer Details */}
                  <div className="print-section">
                    <h2 className="text-lg font-semibold mb-4 print-label">Customer Details</h2>
                    
                    <div className="space-y-3">
                      <div>
                        <div className="print-label flex items-center space-x-2">
                          <SafeIcon icon={FiUser} className="w-4 h-4" />
                          <span>Name:</span>
                        </div>
                        <div className="print-value text-lg font-medium">{caller.name}</div>
                      </div>

                      <div>
                        <div className="print-label flex items-center space-x-2">
                          <SafeIcon icon={FiPhone} className="w-4 h-4" />
                          <span>Phone:</span>
                        </div>
                        <div className="print-value text-lg font-mono">{caller.phone_number}</div>
                      </div>

                      {caller.global_note && (
                        <div>
                          <div className="print-label flex items-center space-x-2">
                            <SafeIcon icon={FiFileText} className="w-4 h-4" />
                            <span>Notes:</span>
                          </div>
                          <div className="print-value italic text-gray-700">{caller.global_note}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Addresses */}
                  <div className="print-section">
                    <h2 className="text-lg font-semibold mb-4 print-label">Addresses</h2>
                    
                    {caller.addresses && caller.addresses.length > 0 ? (
                      <div className="space-y-3">
                        {caller.addresses.map((address, index) => (
                          <div 
                            key={address.id} 
                            className={`print-address ${
                              selectedAddress?.id === address.id ? 'border-blue-500 bg-blue-50' : ''
                            }`}
                          >
                            <div className="flex items-center space-x-2 mb-2">
                              <SafeIcon icon={FiMapPin} className="w-4 h-4" />
                              <span className="font-medium">{address.label}</span>
                              {selectedAddress?.id === address.id && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                  Selected for Delivery
                                </span>
                              )}
                            </div>
                            <div className="text-gray-700 mb-2">{address.address}</div>
                            {address.comment && (
                              <div className="text-sm text-gray-600 italic">
                                Note: {address.comment}
                              </div>
                            )}
                            {address.phone && address.phone !== caller.phone_number && (
                              <div className="text-sm text-gray-600">
                                Phone: {address.phone}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 italic">No addresses on file</p>
                    )}
                  </div>
                </div>

                {/* Selected Address Highlight */}
                {selectedAddress && (
                  <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg print-section">
                    <h3 className="font-semibold text-yellow-900 mb-2">🎯 Selected Delivery Address:</h3>
                    <div className="text-yellow-800">
                      <div className="font-medium">{selectedAddress.label}</div>
                      <div>{selectedAddress.address}</div>
                      {selectedAddress.comment && (
                        <div className="text-sm italic mt-1">Note: {selectedAddress.comment}</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="mt-8 pt-4 border-t border-gray-200 text-center text-sm text-gray-500 print-section">
                  <p>VoIP Caller CRM - Customer Information Sheet</p>
                  <p>This document was generated automatically from the customer database.</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default PrintCallerInfo;