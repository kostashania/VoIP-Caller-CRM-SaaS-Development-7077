import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';

const { FiPhone, FiPhoneCall, FiClock, FiUser } = FiIcons;

function RecentCalls({ calls }) {
  const recentCalls = calls.slice(0, 10);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'answered':
        return FiPhoneCall;
      case 'missed':
        return FiClock;
      default:
        return FiPhone;
    }
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

  const formatDuration = (seconds) => {
    if (!seconds) return '-';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Calls</h3>
        
        {recentCalls.length === 0 ? (
          <div className="text-center py-8">
            <SafeIcon icon={FiPhone} className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No calls yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Your recent calls will appear here.
            </p>
          </div>
        ) : (
          <div className="flow-root">
            <ul role="list" className="-my-5 divide-y divide-gray-200">
              {recentCalls.map((call, index) => (
                <motion.li
                  key={call.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="py-4"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className={`rounded-full p-2 ${getStatusColor(call.call_status)}`}>
                        <SafeIcon 
                          icon={getStatusIcon(call.call_status)} 
                          className="h-4 w-4" 
                        />
                      </div>
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {call.caller?.name || 'Unknown Caller'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {call.caller?.phone_number || 'No number'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-900">
                            {format(new Date(call.timestamp), 'MMM d, HH:mm')}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatDuration(call.duration_sec)}
                          </p>
                        </div>
                      </div>
                      
                      {call.caller && (
                        <div className="mt-2">
                          <Link
                            to={`/caller/${call.caller.id}`}
                            className="text-sm text-primary-600 hover:text-primary-500"
                          >
                            View details →
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default RecentCalls;