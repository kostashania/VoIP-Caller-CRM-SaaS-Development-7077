import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';
import { useCallerStore } from '../../store/callerStore';
import { useAuthStore } from '../../store/authStore';
import { callersAPI } from '../../services/supabaseAPI';
import AddCallerModal from '../callers/AddCallerModal';
import EditCallerModal from './EditCallerModal';
import toast from 'react-hot-toast';

const { FiUsers, FiPlus, FiEdit, FiTrash2, FiPhone, FiMapPin, FiDownload, FiSearch, FiFilter, FiRefreshCw } = FiIcons;

function ContactsManagement() {
  const [isLoading, setIsLoading] = useState(true);
  const [showAddCaller, setShowAddCaller] = useState(false);
  const [showEditCaller, setShowEditCaller] = useState(false);
  const [editingCaller, setEditingCaller] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [isExporting, setIsExporting] = useState(false);
  
  const { callers, setCallers } = useCallerStore();
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

  const handleExportContacts = async () => {
    setIsExporting(true);
    try {
      // Create CSV content
      const csvHeaders = ['Name', 'Phone Number', 'Notes', 'Addresses Count', 'Created Date'];
      const csvData = filteredAndSortedCallers.map(caller => [
        caller.name,
        caller.phone_number,
        caller.global_note || '',
        caller.addresses?.length || 0,
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

        {/* Contacts Table */}
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
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Phone Number
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Addresses
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Notes
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Added
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAndSortedCallers.map((caller, index) => (
                      <motion.tr
                        key={caller.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                                <SafeIcon icon={FiUsers} className="h-5 w-5 text-primary-600" />
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {caller.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                ID: {caller.id.slice(0, 8)}...
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <SafeIcon icon={FiPhone} className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-900 font-mono">
                              {caller.phone_number}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <SafeIcon icon={FiMapPin} className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-900">
                              {caller.addresses?.length || 0} address{caller.addresses?.length !== 1 ? 'es' : ''}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 max-w-xs truncate">
                            {caller.global_note || (
                              <span className="text-gray-400 italic">No notes</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {format(new Date(caller.created_at), 'MMM d, yyyy')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <Link
                              to={`/caller/${caller.id}`}
                              className="text-primary-600 hover:text-primary-900"
                            >
                              View
                            </Link>
                            <button
                              onClick={() => handleEditCaller(caller)}
                              className="text-gray-600 hover:text-gray-900"
                            >
                              <SafeIcon icon={FiEdit} className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteCaller(caller.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <SafeIcon icon={FiTrash2} className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
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
    </>
  );
}

export default ContactsManagement;