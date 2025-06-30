import React from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';

const { FiPhone, FiPhoneCall, FiClock, FiTrendingUp } = FiIcons;

function StatsCards({ calls }) {
  const today = new Date();
  const todayString = today.toISOString().split('T')[0];
  
  const todayCalls = calls.filter(call => 
    call.timestamp.startsWith(todayString)
  );
  
  const answeredCalls = calls.filter(call => 
    call.call_status === 'answered'
  );
  
  const missedCalls = calls.filter(call => 
    call.call_status === 'missed'
  );
  
  const totalDuration = answeredCalls.reduce((sum, call) => 
    sum + (call.duration_seconds || call.duration_sec || 0), 0
  );
  
  const avgDuration = answeredCalls.length > 0 
    ? Math.round(totalDuration / answeredCalls.length) 
    : 0;

  const stats = [
    {
      name: 'Total Calls Today',
      value: todayCalls.length,
      icon: FiPhone,
      change: '+12%',
      changeType: 'increase',
      color: 'blue'
    },
    {
      name: 'Answered Calls',
      value: answeredCalls.length,
      icon: FiPhoneCall,
      change: '+8%',
      changeType: 'increase',
      color: 'green'
    },
    {
      name: 'Missed Calls',
      value: missedCalls.length,
      icon: FiClock,
      change: '-3%',
      changeType: 'decrease',
      color: 'red'
    },
    {
      name: 'Avg Duration',
      value: `${Math.floor(avgDuration / 60)}:${(avgDuration % 60).toString().padStart(2, '0')}`,
      icon: FiTrendingUp,
      change: '+5%',
      changeType: 'increase',
      color: 'purple'
    }
  ];

  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600'
  };

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.name}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="relative overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:px-6"
        >
          <dt>
            <div className={`absolute rounded-md p-3 ${colorClasses[stat.color]}`}>
              <SafeIcon icon={stat.icon} className="h-6 w-6" />
            </div>
            <p className="ml-16 truncate text-sm font-medium text-gray-500">
              {stat.name}
            </p>
          </dt>
          <dd className="ml-16 flex items-baseline">
            <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
            <p className={`ml-2 flex items-baseline text-sm font-semibold ${
              stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
            }`}>
              {stat.change}
            </p>
          </dd>
        </motion.div>
      ))}
    </div>
  );
}

export default StatsCards;