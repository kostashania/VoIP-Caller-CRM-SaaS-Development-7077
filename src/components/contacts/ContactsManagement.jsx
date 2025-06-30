import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';
import { useCallerStore } from '../../store/callerStore';
import { useAuthStore } from '../../store/authStore';
import { callersAPI, addressesAPI } from '../../services/supabaseAPI';
import AddCallerModal from '../callers/AddCallerModal';
import EditCallerModal from './EditCallerModal';
import AddressModal from '../callers/AddressModal';
import toast from 'react-hot-toast';

const { FiUsers, FiPlus, FiEdit, FiTrash2, FiPhone, FiMapPin, FiDownload, FiSearch, FiFilter, FiRefreshCw, FiEye } = FiIcons;

function ContactsManagement() {
  const [isLoading, setIsLoading] = useState(true);
  const [showAddCaller, setShowAddCaller] = useState(false);
  const [showEditCaller, setShowEditCaller] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingCaller, setEditingCaller] = useState(null);
  const [editingAddress, setEditingAddress] = useState(null);
  const [selectedCaller, setSelectedCaller] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [isExporting, setIsExporting] = useState(false);
  
  const { callers, setCallers, updateCaller } = useCallerStore();
  const { getUserCompanyId } = useAuthStore();

  useEffect(() => {
    loadCallers();
  }, []);

  const loadCallers = async () => {
    setIsLoading(true);
    try {
      const companyId = getUserCompanyId();
      if (!companyId) {
        throw new Error('No company ID found');
      }
      
      console.log('Loading callers for company:', companyId);
      const callersData = await callersAPI.getAll(companyId);
      console.log('Callers loaded:', callersData.length);
      setCallers(callersData);
    } catch (error) {
      console.error('Failed to load callers:', error);
      toast.error('Failed to load contacts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditCaller = (caller) => {
    setEditingCaller(caller);
    setShowEditCaller(true);
  };

  const handleDeleteCaller = async (callerId) => {
    if (!confirm('Are you sure you want to delete this contact? This action cannot be undone.')) {
      return;
    }

    try {
      await callersAPI.delete(callerId);
      toast.success('Contact deleted successfully');
      loadCallers(); // Reload the list
    } catch (error) {
      console.error('Failed to delete caller:', error);
      toast.error('Failed to delete contact');
    }
  };

  const handleAddAddress = (caller) => {
    setSelectedCaller(caller);
    setEditingAddress(null);
    setShowAddressModal(true);
  };

  const handleEditAddress = (caller, address) => {
    setSelectedCaller(caller);
    setEditingAddress(address);
    setShowAddressModal(true);
  };

  const handleDeleteAddress = async (callerId, addressId) => {
    if (!confirm('Are you sure you want to delete this address?')) {
      return;
    }

    try {
      await addressesAPI.delete(addressId);
      toast.success('Address deleted successfully');
      
      // Update the caller in the local state
      const updatedCaller = callers.find(c => c.id === callerId);
      if (updatedCaller) {
        const newAddresses = updatedCaller.addresses.filter(addr => addr.id !== addressId);
        updateCaller(callerId, { addresses: newAddresses });
      }
    } catch (error) {
      console.error('Failed to delete address:', error);
      toast.error('Failed to delete address');
    }
  };

  const handleAddressSubmit = async (addressData) => {
    try {
      let result;
      if (editingAddress) {
        // Update existing address
        result = await addressesAPI.update(editingAddress.id, addressData);
        toast.success('Address updated successfully');
        
        // Update local state
        const updatedCaller = callers.find(c => c.id === selectedCaller.id);
        if (updatedCaller) {
          const newAddresses = updatedCaller.addresses.map(addr => 
            addr.id === editingAddress.id ? result : addr
          );
          updateCaller(selectedCaller.id, { addresses: newAddresses });
        }
      } else {
        // Create new address
        result = await addressesAPI.create({
          ...addressData,
          caller_id: selectedCaller.id
        });
        toast.success('Address added successfully');
        
        // Update local state
        const updatedCaller = callers.find(c => c.id === selectedCaller.id);
        if (updatedCaller) {
          const newAddresses = [...(updatedCaller.addresses || []), result];
          updateCaller(selectedCaller.id, { addresses: newAddresses });
        }
      }

      setShowAddressModal(false);
      setEditingAddress(null);
      setSelectedCaller(null);
    } catch (error) {
      console.error('Failed to save address:', error);
      toast.error('Failed to save address');
    }
  };

  const handleExportContacts = async () => {
    setIsExporting(true);
    try {
      // Create CSV content
      const csvHeaders = ['Name', 'Phone Number', 'Notes', 'Addresses', 'Created Date'];
      const csvData = filteredAndSortedCallers.map(caller => [
        caller.name,
        caller.phone_number,
        caller.global_note || '',
        caller.addresses?.map(addr => `${addr.label}: ${addr.address}`).join('; ') || '',
        format(new Date(caller.created_at), 'yyyy-MM-dd HH:mm')
      ]);

      const csvContent = [
        csvHeaders.join(','),
        ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `contacts_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Contacts exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export contacts');
    } finally {
      setIsExporting(false);
    }
  };

  // Filter and sort callers
  const filteredAndSortedCallers = callers
    .filter(caller => 
      caller.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      caller.phone_number.includes(searchTerm) ||
      (caller.global_note && caller.global_note.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      if (sortBy === 'name') {
        aValue = aValue?.toLowerCase() || '';
        bValue = bValue?.toLowerCase() || '';
      } else if (sortBy === 'created_at') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      } else if (sortBy === 'addresses_count') {
        aValue = a.addresses?.length || 0;
        bValue = b.addresses?.length || 0;
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="md:flex md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
              Contacts Management
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Manage your customer contacts and their delivery addresses.
            </p>
          </div>
          <div className="mt-4 flex md:ml-4 md:mt-0 space-x-3">
            <button
              onClick={loadCallers}
              className="inline-flex items-center space-x-2 rounded-md bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-200"
            >
              <SafeIcon icon={FiRefreshCw} className="h-4 w-4" />
              <span>Refresh</span>
            </button>
            <button
              onClick={handleExportContacts}
              disabled={isExporting}
              className="inline-flex items-center space-x-2 rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 disabled:opacity-50"
            >
              <SafeIcon icon={FiDownload} className="h-4 w-4" />
              <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
            </button>
            <button
              onClick={() => setShowAddCaller(true)}
              className="inline-flex items-center space-x-2 rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500"
            >
              <SafeIcon icon={FiPlus} className="h-4 w-4" />
              <span>Add Contact</span>
            </button>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white shadow rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Contacts
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <SafeIcon icon={FiSearch} className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Search by name, phone, or notes..."
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="name">Name</option>
                <option value="phone_number">Phone Number</option>
                <option value="created_at">Date Added</option>
                <option value="addresses_count">Address Count</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sort Order
              </label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <SafeIcon icon={FiUsers} className="h-8 w-8 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Contacts
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {callers.length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <SafeIcon icon={FiMapPin} className="h-8 w-8 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Addresses
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {callers.reduce((total, caller) => total + (caller.addresses?.length || 0), 0)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <SafeIcon icon={FiFilter} className="h-8 w-8 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Filtered Results
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {filteredAndSortedCallers.length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contacts List */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:p-6">
            {filteredAndSortedCallers.length === 0 ? (
              <div className="text-center py-8">
                <SafeIcon icon={FiUsers} className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  {searchTerm ? 'No contacts found' : 'No contacts'}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm 
                    ? 'Try adjusting your search terms.'
                    : 'Get started by adding your first contact.'
                  }
                </p>
                {!searchTerm && (
                  <div className="mt-6">
                    <button
                      onClick={() => setShowAddCaller(true)}
                      className="inline-flex items-center space-x-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
                    >
                      <SafeIcon icon={FiPlus} className="h-4 w-4" />
                      <span>Add Contact</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {filteredAndSortedCallers.map((caller, index) => (
                  <motion.div
                    key={caller.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                  >
                    {/* Contact Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0 h-12 w-12">
                          <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center">
                            <SafeIcon icon={FiUsers} className="h-6 w-6 text-primary-600" />
                          </div>
                        </div>
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">{caller.name}</h3>
                          <div className="flex items-center space-x-2 mt-1">
                            <SafeIcon icon={FiPhone} className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600 font-mono">{caller.phone_number}</span>
                          </div>
                          {caller.global_note && (
                            <p className="text-sm text-gray-500 mt-1 italic">"{caller.global_note}"</p>
                          )}
                        </div>
                      </div>
                      
                      {/* Contact Actions */}
                      <div className="flex items-center space-x-2">
                        <Link
                          to={`/caller/${caller.id}`}
                          className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <SafeIcon icon={FiEye} className="h-4 w-4 mr-1" />
                          View
                        </Link>
                        <button
                          onClick={() => handleEditCaller(caller)}
                          className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <SafeIcon icon={FiEdit} className="h-4 w-4 mr-1" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteCaller(caller.id)}
                          className="inline-flex items-center px-3 py-1 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
                        >
                          <SafeIcon icon={FiTrash2} className="h-4 w-4 mr-1" />
                          Delete
                        </button>
                      </div>
                    </div>

                    {/* Addresses Section */}
                    <div className="border-t border-gray-200 pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-gray-900">
                          📍 Addresses ({caller.addresses?.length || 0})
                        </h4>
                        <button
                          onClick={() => handleAddAddress(caller)}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md text-primary-700 bg-primary-100 hover:bg-primary-200"
                        >
                          <SafeIcon icon={FiPlus} className="h-3 w-3 mr-1" />
                          Add Address
                        </button>
                      </div>

                      {caller.addresses && caller.addresses.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {caller.addresses.map((address) => (
                            <div
                              key={address.id}
                              className="border border-gray-200 rounded-md p-3 bg-gray-50"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <SafeIcon icon={FiMapPin} className="h-4 w-4 text-gray-400" />
                                    <span className="text-sm font-medium text-gray-900">{address.label}</span>
                                  </div>
                                  <p className="text-sm text-gray-600">{address.address}</p>
                                  {address.comment && (
                                    <p className="text-xs text-gray-500 mt-1 italic">💬 {address.comment}</p>
                                  )}
                                  {address.phone && address.phone !== caller.phone_number && (
                                    <p className="text-xs text-gray-500 mt-1">📞 {address.phone}</p>
                                  )}
                                </div>
                                <div className="flex space-x-1 ml-2">
                                  <button
                                    onClick={() => handleEditAddress(caller, address)}
                                    className="p-1 text-gray-400 hover:text-blue-600"
                                    title="Edit address"
                                  >
                                    <SafeIcon icon={FiEdit} className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteAddress(caller.id, address.id)}
                                    className="p-1 text-gray-400 hover:text-red-600"
                                    title="Delete address"
                                  >
                                    <SafeIcon icon={FiTrash2} className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-gray-500 text-sm">
                          No addresses added yet
                        </div>
                      )}
                    </div>

                    {/* Contact Info */}
                    <div className="border-t border-gray-200 pt-3 mt-3">
                      <div className="text-xs text-gray-500">
                        Added: {format(new Date(caller.created_at), 'MMM d, yyyy HH:mm')}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Caller Modal */}
      {showAddCaller && (
        <AddCallerModal
          isOpen={showAddCaller}
          onClose={() => setShowAddCaller(false)}
          onSuccess={() => {
            setShowAddCaller(false);
            loadCallers();
          }}
        />
      )}

      {/* Edit Caller Modal */}
      {showEditCaller && editingCaller && (
        <EditCallerModal
          isOpen={showEditCaller}
          onClose={() => {
            setShowEditCaller(false);
            setEditingCaller(null);
          }}
          caller={editingCaller}
          onSuccess={() => {
            setShowEditCaller(false);
            setEditingCaller(null);
            loadCallers();
          }}
        />
      )}

      {/* Address Modal */}
      {showAddressModal && selectedCaller && (
        <AddressModal
          isOpen={showAddressModal}
          onClose={() => {
            setShowAddressModal(false);
            setEditingAddress(null);
            setSelectedCaller(null);
          }}
          callerId={selectedCaller.id}
          address={editingAddress}
          onSubmit={handleAddressSubmit}
        />
      )}
    </>
  );
}

export default ContactsManagement;