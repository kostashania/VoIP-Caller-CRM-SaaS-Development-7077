// Mock data for development
export const mockUsers = [
  {
    id: 1,
    name: 'John Admin',
    email: 'admin@company1.com',
    role: 'admin',
    company_id: 1,
    company: { id: 1, name: 'TechCorp Solutions' }
  },
  {
    id: 2,
    name: 'Jane User',
    email: 'user@company1.com',
    role: 'user',
    company_id: 1,
    company: { id: 1, name: 'TechCorp Solutions' }
  },
  {
    id: 3,
    name: 'Super Admin',
    email: 'super@voipcrm.com',
    role: 'superadmin',
    company_id: null,
    company: null
  }
];

export const mockCallers = [
  {
    id: 1,
    company_id: 1,
    phone_number: '+1234567890',
    name: 'John Smith',
    global_note: 'Frequent customer, prefers morning calls',
    addresses: [
      {
        id: 1,
        caller_id: 1,
        label: 'Home',
        address: '123 Main St, New York, NY 10001',
        comment: 'Apartment 4B, ring twice'
      },
      {
        id: 2,
        caller_id: 1,
        label: 'Work',
        address: '456 Business Ave, New York, NY 10002',
        comment: 'Reception desk, ask for John'
      }
    ]
  },
  {
    id: 2,
    company_id: 1,
    phone_number: '+0987654321',
    name: 'Sarah Johnson',
    global_note: 'VIP client, handle with priority',
    addresses: [
      {
        id: 3,
        caller_id: 2,
        label: 'Office',
        address: '789 Corporate Blvd, Manhattan, NY 10003',
        comment: 'CEO office, 45th floor'
      }
    ]
  }
];

export const mockCalls = [
  {
    id: 1,
    company_id: 1,
    caller_id: 1,
    caller: mockCallers[0],
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    call_status: 'answered',
    duration_sec: 180,
    voip_raw_payload: '{"caller_id": "+1234567890", "duration": 180}'
  },
  {
    id: 2,
    company_id: 1,
    caller_id: 2,
    caller: mockCallers[1],
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    call_status: 'missed',
    duration_sec: 0,
    voip_raw_payload: '{"caller_id": "+0987654321", "duration": 0}'
  },
  {
    id: 3,
    company_id: 1,
    caller_id: 1,
    caller: mockCallers[0],
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    call_status: 'answered',
    duration_sec: 320,
    voip_raw_payload: '{"caller_id": "+1234567890", "duration": 320}'
  }
];

export const mockCompanies = [
  {
    id: 1,
    name: 'TechCorp Solutions',
    subscription_start: '2024-01-01',
    subscription_end: '2024-12-31',
    voip_url: 'https://api.voipservice.com/webhook',
    voip_username: 'techcorp_user',
    voip_password: '***hidden***',
    voip_settings_json: JSON.stringify({
      protocol: 'SIP',
      sip_id: 'techcorp123',
      timeout: 30
    })
  },
  {
    id: 2,
    name: 'Global Enterprises',
    subscription_start: '2024-02-01',
    subscription_end: '2024-12-31',
    voip_url: 'https://webhook.globalent.com/calls',
    voip_username: 'global_admin',
    voip_password: '***hidden***',
    voip_settings_json: JSON.stringify({
      protocol: 'HTTP',
      api_key: 'gbl_key_123',
      timeout: 45
    })
  }
];

// Mock API responses
export const mockAPI = {
  login: async (email, password) => {
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
    
    const user = mockUsers.find(u => u.email === email);
    if (!user) {
      throw new Error('Invalid credentials');
    }
    
    return {
      user,
      token: 'mock-jwt-token-' + user.id
    };
  },
  
  getCallers: async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockCallers;
  },
  
  getCalls: async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockCalls;
  },
  
  getCompanies: async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockCompanies;
  },
  
  testVoipConnection: async (settings) => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    // Simulate success/failure randomly
    if (Math.random() > 0.3) {
      return { success: true, message: 'Connection successful' };
    } else {
      throw new Error('Connection failed: Invalid credentials');
    }
  }
};