import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

// Helper function to handle Supabase errors
const handleSupabaseError = (error, operation = 'Operation') => {
  console.error(`${operation} failed:`, error);
  const message = error.message || `${operation} failed`;
  throw new Error(message);
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

// Companies API (for super admin)
export const companiesAPI = {
  getAll: async () => {
    try {
      const { data, error } = await supabase
        .from('companies_crm_8x9p2k')
        .select(`
          *,
          voip_settings:voip_settings_crm_8x9p2k(*),
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

// VoIP Settings API
export const voipAPI = {
  getSettings: async (companyId) => {
    try {
      const { data, error } = await supabase
        .from('voip_settings_crm_8x9p2k')
        .select('*')
        .eq('company_id', companyId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
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
      // Simulate connection test
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const success = Math.random() > 0.3;
      const result = {
        success,
        message: success ? 'Connection successful' : 'Connection failed: Invalid credentials',
        tested_at: new Date().toISOString()
      };

      // Update test results
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

// Calls API
export const callsAPI = {
  getAll: async (companyId, filters = {}) => {
    try {
      let query = supabase
        .from('calls_crm_8x9p2k')
        .select(`
          *,
          caller:callers_crm_8x9p2k(
            *,
            addresses:addresses_crm_8x9p2k(*)
          )
        `)
        .eq('company_id', companyId);

      // Apply filters
      if (filters.status) {
        query = query.eq('call_status', filters.status);
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
      handleSupabaseError(error, 'Get calls');
    }
  },

  create: async (callData) => {
    try {
      const { data, error } = await supabase
        .from('calls_crm_8x9p2k')
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
      handleSupabaseError(error, 'Create call');
    }
  },

  updateStatus: async (id, status, metadata = {}) => {
    try {
      const { data, error } = await supabase
        .from('calls_crm_8x9p2k')
        .update({ call_status: status, ...metadata })
        .eq('id', id)
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
      handleSupabaseError(error, 'Update call status');
    }
  }
};

export default {
  auth: authAPI,
  companies: companiesAPI,
  voip: voipAPI,
  users: usersAPI,
  callers: callersAPI,
  addresses: addressesAPI,
  calls: callsAPI
};