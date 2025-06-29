import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';
import { useCallerStore } from '../../store/callerStore';
import { useCallStore } from '../../store/callStore';
import { mockCallers, mockCalls } from '../../services/mockData';
import AddressModal from './AddressModal';

const { FiArrowLeft, FiPhone, FiMapPin, FiPlus, FiEdit, FiTrash2, FiClock, FiPhoneCall } = FiIcons;

function CallerDetails() {
  const { id } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const { currentCaller, setCurrentCaller } = useCallerStore();
  const { callHistory } = useCallStore();

  useEffect(() => {
    const loadCallerDetails = async () => {
      setIsLoading(true);
      try {
        // Mock API call - find caller by ID
        const caller = mockCallers.find(c => c.id === parseInt(id));
        if (caller) {
          setCurrentCaller(caller);
        }
      } catch (error) {
        console.error('Failed to load caller details:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCallerDetails();
  }, [id, setCurrentCaller]);

  const callerCalls = callHistory.filter(call => call.caller_id === parseInt(id));

  const handleEditAddress = (address) => {
    setEditingAddress(address);
    setShowAddressModal(true);
  };

  const handleAddAddress = () => {
    setEditingAddress(null);
    setShowAddressModal(true);
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '-';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'answered':
        return 'text-green-600 bg-green-100';
      case 'missed':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!currentCaller) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">Caller not found</h3>
        <p className="mt-1 text-sm text-gray-500">
          The caller you're looking for doesn't exist.
        </p>
        <Link
          to="/dashboard"
          className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
        >
          <SafeIcon icon={FiArrowLeft} className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Link
            to="/dashboard"
            className="flex items-center space-x-2 text-sm text-gray-500 hover:text-gray-700"
          >
            <SafeIcon icon={FiArrowLeft} className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>
        </div>

        {/* Caller Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white shadow rounded-lg overflow-hidden"
        >
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center space-x-4">
              <div className="flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full">
                <SafeIcon icon={FiPhone} className="w-8 h-8 text-primary-600" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900">{currentCaller.name}</h1>
                <p className="text-lg text-gray-600">{currentCaller.phone_number}</p>
                {currentCaller.global_note && (
                  <p className="mt-2 text-sm text-gray-500 italic">
                    "{currentCaller.global_note}"
                  </p>
                )}
              </div>
              <button className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                <SafeIcon icon={FiEdit} className="w-4 h-4" />
                <span>Edit Caller</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Addresses */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white shadow rounded-lg"
        >
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Addresses</h3>
              <button
                onClick={handleAddAddress}
                className="flex items-center space-x-2 px-3 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                <SafeIcon icon={FiPlus} className="w-4 h-4" />
                <span>Add Address</span>
              </button>
            </div>

            {currentCaller.addresses && currentCaller.addresses.length > 0 ? (
              <div className="space-y-4">
                {currentCaller.addresses.map((address) => (
                  <div key={address.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <SafeIcon icon={FiMapPin} className="w-4 h-4 text-gray-400" />
                          <span className="font-medium text-gray-900">{address.label}</span>
                        </div>
                        <p className="text-gray-600 mb-2">{address.address}</p>
                        {address.comment && (
                          <p className="text-sm text-gray-500 italic">"{address.comment}"</p>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditAddress(address)}
                          className="p-1 text-gray-400 hover:text-primary-600"
                        >
                          <SafeIcon icon={FiEdit} className="w-4 h-4" />
                        </button>
                        <button className="p-1 text-gray-400 hover:text-red-600">
                          <SafeIcon icon={FiTrash2} className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <SafeIcon icon={FiMapPin} className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No addresses</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Add an address to get started.
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Call History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white shadow rounded-lg"
        >
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Call History</h3>

            {callerCalls.length > 0 ? (
              <div className="space-y-4">
                {callerCalls.map((call) => (
                  <div key={call.id} className="flex items-center space-x-4 p-3 border border-gray-200 rounded-lg">
                    <div className={`rounded-full p-2 ${getStatusColor(call.call_status)}`}>
                      <SafeIcon 
                        icon={call.call_status === 'answered' ? FiPhoneCall : FiClock} 
                        className="h-4 w-4" 
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900 capitalize">
                            {call.call_status} Call
                          </p>
                          <p className="text-sm text-gray-500">
                            {format(new Date(call.timestamp), 'MMM d, yyyy HH:mm')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-900">
                            Duration: {formatDuration(call.duration_sec)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <SafeIcon icon={FiPhoneCall} className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No call history</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Call history will appear here once calls are made.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Address Modal */}
      {showAddressModal && (
        <AddressModal
          isOpen={showAddressModal}
          onClose={() => {
            setShowAddressModal(false);
            setEditingAddress(null);
          }}
          callerId={currentCaller.id}
          address={editingAddress}
        />
      )}
    </>
  );
}

export default CallerDetails;