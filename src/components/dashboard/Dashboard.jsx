import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';
import { useCallStore } from '../../store/callStore';
import { useCallerStore } from '../../store/callerStore';
import { useAuthStore } from '../../store/authStore';
import { callLogsAPI, callersAPI } from '../../services/supabaseAPI';
import StatsCards from './StatsCards';
import RecentCalls from './RecentCalls';
import QuickActions from './QuickActions';

const { FiPhone, FiPhoneCall, FiClock, FiTrendingUp } = FiIcons;

function Dashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const { calls, setCalls, setCallHistory } = useCallStore();
  const { setCallers } = useCallerStore();
  const { getUserCompanyId, user } = useAuthStore();

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setIsLoading(true);
        const companyId = getUserCompanyId();
        
        if (!companyId && user.role !== 'superadmin') {
          console.error('No company ID found for user');
          return;
        }

        console.log('Loading dashboard data for company:', companyId);

        // Load calls and callers for the user's company
        const [callsData, callersData] = await Promise.all([
          companyId ? callLogsAPI.getAll(companyId) : [],
          companyId ? callersAPI.getAll(companyId) : []
        ]);

        console.log('Loaded calls:', callsData.length);
        console.log('Loaded callers:', callersData.length);

        setCalls(callsData);
        setCallHistory(callsData);
        setCallers(callersData);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [setCalls, setCallHistory, setCallers, getUserCompanyId, user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Dashboard
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Welcome back, {user?.name}! Here's what's happening with your calls today.
          </p>
          {user?.company && (
            <p className="text-sm text-gray-400">
              Company: {user.company.name}
            </p>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <StatsCards calls={calls} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Calls */}
        <div className="lg:col-span-2">
          <RecentCalls calls={calls} />
        </div>

        {/* Quick Actions */}
        <div>
          <QuickActions />
        </div>
      </div>
    </div>
  );
}

export default Dashboard;