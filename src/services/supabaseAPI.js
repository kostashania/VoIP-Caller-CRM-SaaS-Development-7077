import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

// Helper function to handle Supabase errors
const handleSupabaseError = (error, operation = 'Operation') => {
  console.error(`${operation} failed:`, error);
  const message = error.message || `${operation} failed`;
  throw new Error(message);
};

// Encryption helper (simplified for demo - use proper encryption in production)
const encryptPassword = (password) => {
  // In production, use proper encryption like AES-256
  return btoa(password + '_encrypted_salt');
};

const decryptPassword = (encryptedPassword) => {
  // In production, use proper decryption
  try {
    return atob(encryptedPassword).replace('_encrypted_salt', '');
  } catch {
    return encryptedPassword; // Fallback for demo
  }
};

// Auth API
export const authAPI = {
  login: async (email, password = 'demo') => {
    try {
      // Get user from database
      const { data: userData, error: userError } = await supabase
        .from('users_crm_8x9p2k')
        .select(`
          *,
          company:companies_crm_8x9p2k(*)
        `)
        .eq('email', email)
        .eq('is_active', true)
        .single();

      if (userError || !userData) {
        throw new Error('Invalid email address. User not found.');
      }

      console.log('Login successful for user:', userData);

      // Simulate delay for better UX
      await new Promise(resolve => setTimeout(resolve, 1000));

      return {
        user: {
          id: userData.id,
          email: userData.email,
          name: userData.name,
          role: userData.role,
          company_id: userData.company_id,
          company: userData.company
        },
        token: `supabase-token-${userData.id}`
      };
    } catch (error) {
      handleSupabaseError(error, 'Login');
    }
  },

  register: async (userData) => {
    throw new Error('Registration is not available in demo mode');
  }
};

// SIP Configuration API
export const sipAPI = {
  getConfig: async (companyId) => {
    try {
      const { data, error } = await supabase
        .from('sip_configurations_crm_8x9p2k')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data && data.password_encrypted) {
        // Decrypt password for use (in production, handle this securely)
        data.password = decryptPassword(data.password_encrypted);
      }
      
      return data || null;
    } catch (error) {
      handleSupabaseError(error, 'Get SIP configuration');
    }
  },

  updateConfig: async (companyId, config) => {
    try {
      // Encrypt password before storing
      const configToStore = { ...config };
      if (config.password) {
        configToStore.password_encrypted = encryptPassword(config.password);
        delete configToStore.password; // Don't store plain password
      }

      const { data, error } = await supabase
        .from('sip_configurations_crm_8x9p2k')
        .upsert({
          company_id: companyId,
          ...configToStore,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      handleSupabaseError(error, 'Update SIP configuration');
    }
  },

  updateTestStatus: async (companyId, testResult) => {
    try {
      const { error } = await supabase
        .from('sip_configurations_crm_8x9p2k')
        .update({
          ...testResult,
          updated_at: new Date().toISOString()
        })
        .eq('company_id', companyId);

      if (error) throw error;
    } catch (error) {
      handleSupabaseError(error, 'Update SIP test status');
    }
  },

  testConnection: async (companyId, config) => {
    try {
      // Simulate SIP connection test
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const success = Math.random() > 0.2; // 80% success rate for demo
      const result = {
        success,
        message: success 
          ? 'SIP connection successful' 
          : 'SIP connection failed: Invalid credentials or network error',
        tested_at: new Date().toISOString()
      };

      // Update test results
      await sipAPI.updateTestStatus(companyId, {
        last_test_status: result.success ? 'success' : 'failed',
        last_test_at: result.tested_at
      });

      return result;
    } catch (error) {
      handleSupabaseError(error, 'Test SIP connection');
    }
  }
};

// Call Logs API
export const callLogsAPI = {
  getAll: async (companyId, filters = {}) => {
    try {
      let query = supabase
        .from('call_logs_crm_8x9p2k')
        .select(`
          *,
          caller:callers_crm_8x9p2k(
            *,
            addresses:addresses_crm_8x9p2k(*)
          ),
          selected_address:addresses_crm_8x9p2k(*)
        `)
        .eq('company_id', companyId);

      // Apply filters
      if (filters.status) {
        query = query.eq('call_status', filters.status);
      }
      if (filters.direction) {
        query = query.eq('call_direction', filters.direction);
      }
      if (filters.from_date) {
        query = query.gte('timestamp', filters.from_date);
      }
      if (filters.to_date) {
        query = query.lte('timestamp', filters.to_date);
      }

      const { data, error } = await query.order('timestamp', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      handleSupabaseError(error, 'Get call logs');
    }
  },

  create: async (callData) => {
    try {
      const { data, error } = await supabase
        .from('call_logs_crm_8x9p2k')
        .insert(callData)
        .select(`
          *,
          caller:callers_crm_8x9p2k(
            *,
            addresses:addresses_crm_8x9p2k(*)
          )
        `)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      handleSupabaseError(error, 'Create call log');
    }
  },

  updateStatus: async (id, status, metadata = {}) => {
    try {
      const { data, error } = await supabase
        .from('call_logs_crm_8x9p2k')
        .update({ call_status: status, ...metadata })
        .eq('id', id)
        .select(`
          *,
          caller:callers_crm_8x9p2k(
            *,
            addresses:addresses_crm_8x9p2k(*)
          ),
          selected_address:addresses_crm_8x9p2k(*)
        `)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      handleSupabaseError(error, 'Update call log status');
    }
  },

  addNote: async (id, note) => {
    try {
      const { data, error } = await supabase
        .from('call_logs_crm_8x9p2k')
        .update({ call_note: note })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      handleSupabaseError(error, 'Add call note');
    }
  },

  setSelectedAddress: async (id, addressId) => {
    try {
      const { data, error } = await supabase
        .from('call_logs_crm_8x9p2k')
        .update({ selected_address_id: addressId })
        .eq('id', id)
        .select(`
          *,
          selected_address:addresses_crm_8x9p2k(*)
        `)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      handleSupabaseError(error, 'Set selected address');
    }
  },

  updateDeliveryStatus: async (id, deliveryStatus) => {
    try {
      const { data, error } = await supabase
        .from('call_logs_crm_8x9p2k')
        .update({ delivery_status: deliveryStatus })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      handleSupabaseError(error, 'Update delivery status');
    }
  }
};

// Companies API (for super admin)
export const companiesAPI = {
  getAll: async () => {
    try {
      const { data, error } = await supabase
        .from('companies_crm_8x9p2k')
        .select(`
          *,
          voip_settings:voip_settings_crm_8x9p2k(*),
          sip_config:sip_configurations_crm_8x9p2k(*),
          user_count:users_crm_8x9p2k(count)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      handleSupabaseError(error, 'Get companies');
    }
  },

  create: async (companyData) => {
    try {
      // Create company
      const { data: company, error: companyError } = await supabase
        .from('companies_crm_8x9p2k')
        .insert({
          name: companyData.name,
          subscription_start: companyData.subscriptionStart,
          subscription_end: companyData.subscriptionEnd
        })
        .select()
        .single();

      if (companyError) throw companyError;

      // Create admin user
      const { data: adminUser, error: userError } = await supabase
        .from('users_crm_8x9p2k')
        .insert({
          email: companyData.adminEmail,
          name: companyData.adminName,
          role: 'admin',
          company_id: company.id
        })
        .select()
        .single();

      if (userError) throw userError;

      return { company, adminUser };
    } catch (error) {
      handleSupabaseError(error, 'Create company');
    }
  },

  update: async (id, companyData) => {
    try {
      const { data, error } = await supabase
        .from('companies_crm_8x9p2k')
        .update(companyData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      handleSupabaseError(error, 'Update company');
    }
  },

  delete: async (id) => {
    try {
      const { error } = await supabase
        .from('companies_crm_8x9p2k')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      handleSupabaseError(error, 'Delete company');
    }
  }
};

// VoIP Settings API (legacy - keeping for compatibility)
export const voipAPI = {
  getSettings: async (companyId) => {
    try {
      const { data, error } = await supabase
        .from('voip_settings_crm_8x9p2k')
        .select('*')
        .eq('company_id', companyId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    } catch (error) {
      handleSupabaseError(error, 'Get VoIP settings');
    }
  },

  updateSettings: async (companyId, settings) => {
    try {
      const { data, error } = await supabase
        .from('voip_settings_crm_8x9p2k')
        .upsert({
          company_id: companyId,
          ...settings,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      handleSupabaseError(error, 'Update VoIP settings');
    }
  },

  testConnection: async (companyId, settings) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const success = Math.random() > 0.3;
      const result = {
        success,
        message: success ? 'Connection successful' : 'Connection failed: Invalid credentials',
        tested_at: new Date().toISOString()
      };

      await supabase
        .from('voip_settings_crm_8x9p2k')
        .upsert({
          company_id: companyId,
          last_test_status: result.success ? 'success' : 'failed',
          last_test_at: result.tested_at,
          updated_at: new Date().toISOString()
        });

      return result;
    } catch (error) {
      handleSupabaseError(error, 'Test VoIP connection');
    }
  }
};

// Users API
export const usersAPI = {
  getAll: async (companyId) => {
    try {
      let query = supabase
        .from('users_crm_8x9p2k')
        .select(`
          *,
          company:companies_crm_8x9p2k(*)
        `)
        .eq('is_active', true);

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      handleSupabaseError(error, 'Get users');
    }
  },

  create: async (userData) => {
    try {
      const { data, error } = await supabase
        .from('users_crm_8x9p2k')
        .insert(userData)
        .select(`
          *,
          company:companies_crm_8x9p2k(*)
        `)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      handleSupabaseError(error, 'Create user');
    }
  },

  update: async (id, userData) => {
    try {
      const { data, error } = await supabase
        .from('users_crm_8x9p2k')
        .update({ ...userData, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      handleSupabaseError(error, 'Update user');
    }
  },

  delete: async (id) => {
    try {
      const { error } = await supabase
        .from('users_crm_8x9p2k')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      handleSupabaseError(error, 'Delete user');
    }
  }
};

// Callers API
export const callersAPI = {
  getAll: async (companyId) => {
    try {
      const { data, error } = await supabase
        .from('callers_crm_8x9p2k')
        .select(`
          *,
          addresses:addresses_crm_8x9p2k(*)
        `)
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      handleSupabaseError(error, 'Get callers');
    }
  },

  getById: async (id) => {
    try {
      const { data, error } = await supabase
        .from('callers_crm_8x9p2k')
        .select(`
          *,
          addresses:addresses_crm_8x9p2k(*)
        `)
        .eq('id', id)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      handleSupabaseError(error, 'Get caller by ID');
    }
  },

  getByPhone: async (companyId, phoneNumber) => {
    try {
      const { data, error } = await supabase
        .from('callers_crm_8x9p2k')
        .select(`
          *,
          addresses:addresses_crm_8x9p2k(*)
        `)
        .eq('company_id', companyId)
        .eq('phone_number', phoneNumber)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    } catch (error) {
      handleSupabaseError(error, 'Get caller by phone');
    }
  },

  create: async (callerData) => {
    try {
      const { data, error } = await supabase
        .from('callers_crm_8x9p2k')
        .insert(callerData)
        .select(`
          *,
          addresses:addresses_crm_8x9p2k(*)
        `)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      handleSupabaseError(error, 'Create caller');
    }
  },

  update: async (id, callerData) => {
    try {
      const { data, error } = await supabase
        .from('callers_crm_8x9p2k')
        .update({ ...callerData, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select(`
          *,
          addresses:addresses_crm_8x9p2k(*)
        `)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      handleSupabaseError(error, 'Update caller');
    }
  },

  delete: async (id) => {
    try {
      const { error } = await supabase
        .from('callers_crm_8x9p2k')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      handleSupabaseError(error, 'Delete caller');
    }
  }
};

// Addresses API
export const addressesAPI = {
  create: async (addressData) => {
    try {
      const { data, error } = await supabase
        .from('addresses_crm_8x9p2k')
        .insert(addressData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      handleSupabaseError(error, 'Create address');
    }
  },

  update: async (id, addressData) => {
    try {
      const { data, error } = await supabase
        .from('addresses_crm_8x9p2k')
        .update(addressData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      handleSupabaseError(error, 'Update address');
    }
  },

  delete: async (id) => {
    try {
      const { error } = await supabase
        .from('addresses_crm_8x9p2k')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      handleSupabaseError(error, 'Delete address');
    }
  }
};

// Legacy calls API (keeping for compatibility)
export const callsAPI = {
  getAll: async (companyId, filters = {}) => {
    return callLogsAPI.getAll(companyId, filters);
  },

  create: async (callData) => {
    return callLogsAPI.create(callData);
  },

  updateStatus: async (id, status, metadata = {}) => {
    return callLogsAPI.updateStatus(id, status, metadata);
  }
};

export default {
  auth: authAPI,
  sip: sipAPI,
  callLogs: callLogsAPI,
  companies: companiesAPI,
  voip: voipAPI,
  users: usersAPI,
  callers: callersAPI,
  addresses: addressesAPI,
  calls: callsAPI
};