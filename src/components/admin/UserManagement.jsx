import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';
import { mockUsers } from '../../services/mockData';
import AddUserModal from './AddUserModal';

const { FiUsers, FiPlus, FiEdit, FiTrash2, FiMail, FiShield } = FiIcons;

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUsers = async () => {
      setIsLoading(true);
      try {
        // Mock API call - filter users by company
        const companyUsers = mockUsers.filter(user => user.company_id === 1);
        setUsers(companyUsers);
      } catch (error) {
        console.error('Failed to load users:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUsers();
  }, []);

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'user':
        return 'bg-blue-100 text-blue-800';
      case 'superadmin':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

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
              User Management
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Manage users in your organization.
            </p>
          </div>
          <div className="mt-4 flex md:ml-4 md:mt-0">
            <button
              onClick={() => setShowAddUser(true)}
              className="inline-flex items-center space-x-2 rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500"
            >
              <SafeIcon icon={FiPlus} className="h-4 w-4" />
              <span>Add User</span>
            </button>
          </div>
        </div>

        {/* Users List */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:p-6">
            {users.length === 0 ? (
              <div className="text-center py-8">
                <SafeIcon icon={FiUsers} className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No users</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by adding a new user.
                </p>
              </div>
            ) : (
              <div className="flow-root">
                <ul role="list" className="-my-5 divide-y divide-gray-200">
                  {users.map((user, index) => (
                    <motion.li
                      key={user.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="py-4"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <div className="flex items-center justify-center w-10 h-10 bg-primary-100 rounded-full">
                            <SafeIcon icon={FiUsers} className="w-5 h-5 text-primary-600" />
                          </div>
                        </div>
                        
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {user.name}
                              </p>
                              <div className="flex items-center space-x-2 mt-1">
                                <SafeIcon icon={FiMail} className="w-4 h-4 text-gray-400" />
                                <p className="text-sm text-gray-500">{user.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getRoleColor(user.role)}`}>
                                <SafeIcon icon={FiShield} className="w-3 h-3 mr-1" />
                                {user.role}
                              </span>
                              <div className="flex space-x-2">
                                <button className="text-gray-400 hover:text-primary-600">
                                  <SafeIcon icon={FiEdit} className="w-4 h-4" />
                                </button>
                                <button className="text-gray-400 hover:text-red-600">
                                  <SafeIcon icon={FiTrash2} className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddUser && (
        <AddUserModal
          isOpen={showAddUser}
          onClose={() => setShowAddUser(false)}
        />
      )}
    </>
  );
}

export default UserManagement;