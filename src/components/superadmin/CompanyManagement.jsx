import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';
import { companiesAPI } from '../../services/supabaseAPI';
import AddCompanyModal from './AddCompanyModal';
import EditCompanyModal from './EditCompanyModal';

const { FiBriefcase, FiPlus, FiEdit, FiTrash2, FiCalendar, FiUsers, FiCheckCircle, FiAlertCircle, FiRefreshCw } = FiIcons;

function CompanyManagement() {
  const [companies, setCompanies] = useState([]);
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [showEditCompany, setShowEditCompany] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('🔄 Loading companies...');
      const data = await companiesAPI.getAll();
      console.log('✅ Companies loaded:', data);
      setCompanies(data);
    } catch (error) {
      console.error('❌ Failed to load companies:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompanyAdded = () => {
    console.log('🎉 Company added, refreshing list...');
    setShowAddCompany(false);
    loadCompanies(); // Reload companies
  };

  const handleCompanyUpdated = () => {
    console.log('🎉 Company updated, refreshing list...');
    setShowEditCompany(false);
    setEditingCompany(null);
    loadCompanies(); // Reload companies
  };

  const handleEditCompany = (company) => {
    console.log('✏️ Editing company:', company);
    setEditingCompany(company);
    setShowEditCompany(true);
  };

  const handleDeleteCompany = async (companyId) => {
    if (!confirm('Are you sure you want to delete this company? This action cannot be undone.')) {
      return;
    }

    try {
      await companiesAPI.delete(companyId);
      toast.success('Company deleted successfully');
      loadCompanies();
    } catch (error) {
      console.error('Failed to delete company:', error);
      toast.error('Failed to delete company');
    }
  };

  const getSubscriptionStatus = (endDate) => {
    const end = new Date(endDate);
    const now = new Date();
    const daysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) {
      return {
        status: 'expired',
        label: 'Expired',
        color: 'text-red-600 bg-red-100'
      };
    } else if (daysLeft <= 30) {
      return {
        status: 'expiring',
        label: `${daysLeft} days left`,
        color: 'text-yellow-600 bg-yellow-100'
      };
    } else {
      return {
        status: 'active',
        label: 'Active',
        color: 'text-green-600 bg-green-100'
      };
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
        <p className="mt-4 text-gray-500">Loading companies...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <SafeIcon icon={FiAlertCircle} className="h-16 w-16 text-red-500 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load Companies</h3>
        <p className="text-gray-500 mb-4">{error}</p>
        <button
          onClick={loadCompanies}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <SafeIcon icon={FiRefreshCw} className="h-4 w-4" />
          <span>Retry</span>
        </button>
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
              Company Management
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Manage all companies and their subscriptions.
            </p>
          </div>
          <div className="mt-4 flex md:ml-4 md:mt-0 space-x-3">
            <button
              onClick={loadCompanies}
              className="inline-flex items-center space-x-2 rounded-md bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-200"
            >
              <SafeIcon icon={FiRefreshCw} className="h-4 w-4" />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => setShowAddCompany(true)}
              className="inline-flex items-center space-x-2 rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500"
            >
              <SafeIcon icon={FiPlus} className="h-4 w-4" />
              <span>Add Company</span>
            </button>
          </div>
        </div>

        {/* Companies Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {companies.map((company, index) => {
            const subscription = getSubscriptionStatus(company.subscription_end);

            return (
              <motion.div
                key={company.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
              >
                {/* Company Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-12 h-12 bg-primary-100 rounded-lg">
                      <SafeIcon icon={FiBriefcase} className="w-6 h-6 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{company.name}</h3>
                      <p className="text-sm text-gray-500">ID: {company.id.slice(0, 8)}...</p>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <button 
                      onClick={() => handleEditCompany(company)}
                      className="p-1 text-gray-400 hover:text-primary-600 transition-colors"
                      title="Edit company"
                    >
                      <SafeIcon icon={FiEdit} className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteCompany(company.id)}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete company"
                    >
                      <SafeIcon icon={FiTrash2} className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Subscription Status */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Subscription</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${subscription.color}`}>
                      <SafeIcon 
                        icon={subscription.status === 'active' ? FiCheckCircle : FiAlertCircle} 
                        className="w-3 h-3 mr-1" 
                      />
                      {subscription.label}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    <div className="flex items-center space-x-1 mb-1">
                      <SafeIcon icon={FiCalendar} className="w-4 h-4" />
                      <span>Start: {format(new Date(company.subscription_start), 'MMM d, yyyy')}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <SafeIcon icon={FiCalendar} className="w-4 h-4" />
                      <span>End: {format(new Date(company.subscription_end), 'MMM d, yyyy')}</span>
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-1 text-gray-500">
                      <SafeIcon icon={FiUsers} className="w-4 h-4" />
                      <span>Users: {company.user_count || 0}</span>
                    </div>
                    <button 
                      onClick={() => handleEditCompany(company)}
                      className="text-primary-600 hover:text-primary-500"
                    >
                      View Details →
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Empty State */}
        {companies.length === 0 && (
          <div className="text-center py-12">
            <SafeIcon icon={FiBriefcase} className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No companies</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by adding your first company.
            </p>
            <button
              onClick={() => setShowAddCompany(true)}
              className="mt-4 inline-flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              <SafeIcon icon={FiPlus} className="h-4 w-4" />
              <span>Add Company</span>
            </button>
          </div>
        )}
      </div>

      {/* Add Company Modal */}
      {showAddCompany && (
        <AddCompanyModal
          isOpen={showAddCompany}
          onClose={() => setShowAddCompany(false)}
          onSuccess={handleCompanyAdded}
        />
      )}

      {/* Edit Company Modal */}
      {showEditCompany && editingCompany && (
        <EditCompanyModal
          isOpen={showEditCompany}
          onClose={() => {
            setShowEditCompany(false);
            setEditingCompany(null);
          }}
          onSuccess={handleCompanyUpdated}
          company={editingCompany}
        />
      )}
    </>
  );
}

export default CompanyManagement;