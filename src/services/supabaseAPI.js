import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

// Helper function to handle Supabase errors
const handleSupabaseError = (error, operation = 'Operation') => {
  console.error(`${operation} failed:`, error);
  const message = error.message || `${operation} failed`;
  toast.error(message);
  throw new Error(message);
};

// Auth API
export const authAPI = {
  login: async (email, password) => {
    try {
      // For demo purposes, we'll simulate login by checking user table
      const { data: user, error } = await supabase
        .from('users_voipcrm_2024')
        .select(`
          *,
          company:companies_voipcrm_2024(*)
        `)
        .eq('email', email)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Login query error:', error);
        if (error.code === 'PGRST116') {
          throw new Error('Invalid email address. Please check the demo credentials.');
        }
        throw new Error('Login failed. Please try again.');
      }

      if (!user) {
        throw new Error('Invalid credentials');
      }

      console.log('Login successful for user:', user);

      // In production, use Supabase Auth
      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          company_id: user.company_id,
          company: user.company
        },
        token: `demo-token-${user.id}`
      };
    } catch (error) {
      if (error.message.includes('Invalid email address') || error.message.includes('Invalid credentials')) {
        throw error;
      }
      handleSupabaseError(error, 'Login');
    }
  },

  register: async (userData) => {
    try {
      // In production, use Supabase Auth and then create user record
      const { data, error } = await supabase
        .from('users_voipcrm_2024')
        .insert([{
          email: userData.email,
          name: userData.name,
          role: 'admin', // New registrations are company admins
          company_id: null // Will be set when company is created
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      handleSupabaseError(error, 'Registration');
    }
  }
};

// Companies API (for super admin)
export const companiesAPI = {
  getAll: async () => {
    try {
      const { data, error } = await supabase
        .from('companies_voipcrm_2024')
        .select(`
          *,
          voip_settings:voip_settings_voipcrm_2024(*),
          user_count:users_voipcrm_2024(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      handleSupabaseError(error, 'Fetch companies');
    }
  },

  create: async (companyData) => {
    try {
      // Start transaction
      const { data: company, error: companyError } = await supabase
        .from('companies_voipcrm_2024')
        .insert([{
          name: companyData.name,
          subscription_start: companyData.subscriptionStart,
          subscription_end: companyData.subscriptionEnd
        }])
        .select()
        .single();

      if (companyError) throw companyError;

      // Create admin user
      const { data: adminUser, error: userError } = await supabase
        .from('users_voipcrm_2024')
        .insert([{
          company_id: company.id,
          email: companyData.adminEmail,
          name: companyData.adminName,
          role: 'admin'
        }])
        .select()
        .single();

      if (userError) throw userError;

      // Create default VoIP settings
      const { error: voipError } = await supabase
        .from('voip_settings_voipcrm_2024')
        .insert([{
          company_id: company.id,
          protocol: 'SIP'
        }]);

      if (voipError) throw voipError;

      return { company, adminUser };
    } catch (error) {
      handleSupabaseError(error, 'Create company');
    }
  },

  update: async (id, companyData) => {
    try {
      const { data, error } = await supabase
        .from('companies_voipcrm_2024')
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
        .from('companies_voipcrm_2024')
        .delete()
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
        .from('voip_settings_voipcrm_2024')
        .select('*')
        .eq('company_id', companyId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // Ignore "not found" error
      return data;
    } catch (error) {
      handleSupabaseError(error, 'Fetch VoIP settings');
    }
  },

  updateSettings: async (companyId, settings) => {
    try {
      const { data, error } = await supabase
        .from('voip_settings_voipcrm_2024')
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
      // Mock test - in production, make actual API call to VoIP service
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const success = Math.random() > 0.3;
      const result = {
        success,
        message: success ? 'Connection successful' : 'Connection failed: Invalid credentials',
        tested_at: new Date().toISOString()
      };

      // Update test results
      await supabase
        .from('voip_settings_voipcrm_2024')
        .update({
          last_test_at: result.tested_at,
          last_test_status: result.success ? 'success' : 'failed'
        })
        .eq('company_id', companyId);

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
        .from('users_voipcrm_2024')
        .select(`
          *,
          company:companies_voipcrm_2024(name)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    } catch (error) {
      handleSupabaseError(error, 'Fetch users');
    }
  },

  create: async (userData) => {
    try {
      const { data, error } = await supabase
        .from('users_voipcrm_2024')
        .insert([userData])
        .select(`
          *,
          company:companies_voipcrm_2024(name)
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
        .from('users_voipcrm_2024')
        .update({
          ...userData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select(`
          *,
          company:companies_voipcrm_2024(name)
        `)
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
        .from('users_voipcrm_2024')
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
        .from('callers_voipcrm_2024')
        .select(`
          *,
          addresses:caller_addresses_voipcrm_2024(*)
        `)
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      handleSupabaseError(error, 'Fetch callers');
    }
  },

  getById: async (id) => {
    try {
      const { data, error } = await supabase
        .from('callers_voipcrm_2024')
        .select(`
          *,
          addresses:caller_addresses_voipcrm_2024(*)
        `)
        .eq('id', id)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      handleSupabaseError(error, 'Fetch caller');
    }
  },

  getByPhone: async (companyId, phoneNumber) => {
    try {
      const { data, error } = await supabase
        .from('callers_voipcrm_2024')
        .select(`
          *,
          addresses:caller_addresses_voipcrm_2024(*)
        `)
        .eq('company_id', companyId)
        .eq('phone_number', phoneNumber)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      handleSupabaseError(error, 'Fetch caller by phone');
    }
  },

  create: async (callerData) => {
    try {
      const { data, error } = await supabase
        .from('callers_voipcrm_2024')
        .insert([callerData])
        .select(`
          *,
          addresses:caller_addresses_voipcrm_2024(*)
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
        .from('callers_voipcrm_2024')
        .update({
          ...callerData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select(`
          *,
          addresses:caller_addresses_voipcrm_2024(*)
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
        .from('callers_voipcrm_2024')
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
        .from('caller_addresses_voipcrm_2024')
        .insert([{
          ...addressData,
          label: addressData.label || 'Home' // Default to 'Home'
        }])
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
        .from('caller_addresses_voipcrm_2024')
        .update({
          ...addressData,
          updated_at: new Date().toISOString()
        })
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
        .from('caller_addresses_voipcrm_2024')
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
        .from('calls_voipcrm_2024')
        .select(`
          *,
          caller:callers_voipcrm_2024(
            *,
            addresses:caller_addresses_voipcrm_2024(*)
          )
        `)
        .eq('company_id', companyId)
        .order('timestamp', { ascending: false });

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

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      handleSupabaseError(error, 'Fetch calls');
    }
  },

  create: async (callData) => {
    try {
      const { data, error } = await supabase
        .from('calls_voipcrm_2024')
        .insert([callData])
        .select(`
          *,
          caller:callers_voipcrm_2024(
            *,
            addresses:caller_addresses_voipcrm_2024(*)
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
        .from('calls_voipcrm_2024')
        .update({
          call_status: status,
          ...metadata,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select(`
          *,
          caller:callers_voipcrm_2024(
            *,
            addresses:caller_addresses_voipcrm_2024(*)
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