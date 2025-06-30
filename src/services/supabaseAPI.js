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
      console.log('Getting SIP config for company:', companyId);
      const { data, error } = await supabase
        .from('sip_configurations_crm_8x9p2k')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle(); // Use maybeSingle instead of single

      if (error) {
        console.error('Error getting SIP config:', error);
        throw error;
      }

      console.log('SIP config retrieved:', data);

      if (data && data.password_encrypted) {
        // Decrypt password for use (in production, handle this securely)
        data.password = decryptPassword(data.password_encrypted);
      }

      return data || null;
    } catch (error) {
      console.error('Failed to get SIP config:', error);
      return null; // Return null instead of throwing to prevent breaking the UI
    }
  },

  updateConfig: async (companyId, config) => {
    try {
      console.log('Updating SIP config for company:', companyId, 'with data:', config);

      // Prepare config for storage
      const configToStore = { ...config };

      // Always encrypt password if provided
      if (config.password && config.password.trim()) {
        configToStore.password_encrypted = encryptPassword(config.password);
        delete configToStore.password; // Don't store plain password
        console.log('Password encrypted and will be saved');
      } else {
        // If no password provided, don't update the password field
        delete configToStore.password;
        console.log('No password provided, keeping existing password');
      }

      // First check if any record exists for this company
      const { data: existingRecords, error: checkError } = await supabase
        .from('sip_configurations_crm_8x9p2k')
        .select('*')
        .eq('company_id', companyId);

      if (checkError) {
        console.error('Error checking existing configs:', checkError);
        throw checkError;
      }

      console.log('Existing records found:', existingRecords?.length || 0);

      let result;
      if (existingRecords && existingRecords.length > 0) {
        // If multiple records exist, delete all but keep the first one's password if needed
        if (existingRecords.length > 1) {
          console.log('Multiple records found, cleaning up...');
          // Keep the first record, delete the rest
          const recordToKeep = existingRecords[0];
          const recordsToDelete = existingRecords.slice(1);

          for (const record of recordsToDelete) {
            await supabase
              .from('sip_configurations_crm_8x9p2k')
              .delete()
              .eq('id', record.id);
          }
          console.log(`Deleted ${recordsToDelete.length} duplicate records`);
        }

        // Update the remaining record
        const recordToUpdate = existingRecords[0];
        const updateData = {
          ...configToStore,
          updated_at: new Date().toISOString()
        };

        // If no new password provided, keep the existing encrypted password
        if (!config.password && recordToUpdate.password_encrypted) {
          updateData.password_encrypted = recordToUpdate.password_encrypted;
        }

        console.log('Updating existing SIP config with:', updateData);
        const { data, error } = await supabase
          .from('sip_configurations_crm_8x9p2k')
          .update(updateData)
          .eq('id', recordToUpdate.id)
          .select()
          .maybeSingle(); // Use maybeSingle instead of single

        if (error) {
          console.error('Error updating SIP config:', error);
          throw error;
        }

        result = data;
        console.log('SIP config updated successfully:', result);
      } else {
        // Insert new record
        const insertData = {
          company_id: companyId,
          ...configToStore,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        console.log('Creating new SIP config with:', insertData);
        const { data, error } = await supabase
          .from('sip_configurations_crm_8x9p2k')
          .insert(insertData)
          .select()
          .maybeSingle(); // Use maybeSingle instead of single

        if (error) {
          console.error('Error creating SIP config:', error);
          throw error;
        }

        result = data;
        console.log('SIP config created successfully:', result);
      }

      return result;
    } catch (error) {
      console.error('Failed to update SIP config:', error);
      handleSupabaseError(error, 'Update SIP configuration');
    }
  },

  updateTestStatus: async (companyId, testResult) => {
    try {
      // Find the record first
      const { data: existing, error: findError } = await supabase
        .from('sip_configurations_crm_8x9p2k')
        .select('id')
        .eq('company_id', companyId)
        .maybeSingle();

      if (findError) {
        console.error('Error finding SIP config for test update:', findError);
        throw findError;
      }

      if (!existing) {
        console.log('No SIP config found for test status update');
        return;
      }

      const { error } = await supabase
        .from('sip_configurations_crm_8x9p2k')
        .update({
          ...testResult,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to update SIP test status:', error);
      // Don't throw here as this is not critical
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
      console.log('Getting call logs for company:', companyId);
      
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

      if (error) {
        console.error('Error getting call logs:', error);
        throw error;
      }

      console.log('Call logs retrieved:', data?.length || 0);
      return data || [];
    } catch (error) {
      console.error('Failed to get call logs:', error);
      handleSupabaseError(error, 'Get call logs');
    }
  },

  create: async (callData) => {
    try {
      console.log('Creating call log with data:', callData);
      
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

      if (error) {
        console.error('Error creating call log:', error);
        throw error;
      }

      console.log('Call log created successfully:', data);
      return data;
    } catch (error) {
      console.error('Failed to create call log:', error);
      handleSupabaseError(error, 'Create call log');
    }
  },

  updateStatus: async (id, status, metadata = {}) => {
    try {
      console.log('Updating call log status:', { id, status, metadata });
      
      const { data, error } = await supabase
        .from('call_logs_crm_8x9p2k')
        .update({
          call_status: status,
          ...metadata
        })
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

      if (error) {
        console.error('Error updating call log status:', error);
        throw error;
      }

      console.log('Call log status updated successfully:', data);
      return data;
    } catch (error) {
      console.error('Failed to update call log status:', error);
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
      console.log('Setting selected address for call:', { id, addressId });
      
      const { data, error } = await supabase
        .from('call_logs_crm_8x9p2k')
        .update({ selected_address_id: addressId })
        .eq('id', id)
        .select(`
          *,
          selected_address:addresses_crm_8x9p2k(*)
        `)
        .single();

      if (error) {
        console.error('Error setting selected address:', error);
        throw error;
      }

      console.log('Selected address set successfully:', data);
      return data;
    } catch (error) {
      console.error('Failed to set selected address:', error);
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
      console.log('Getting all companies...');
      
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

      if (error) {
        console.error('Error getting companies:', error);
        throw error;
      }

      console.log('Companies retrieved:', data?.length || 0);
      return data || [];
    } catch (error) {
      console.error('Failed to get companies:', error);
      handleSupabaseError(error, 'Get companies');
    }
  },

  create: async (companyData) => {
    try {
      console.log('Creating company with data:', companyData);
      
      // Create company
      const { data: company, error: companyError } = await supabase
        .from('companies_crm_8x9p2k')
        .insert({
          name: companyData.name,
          subscription_start: companyData.subscriptionStart,
          subscription_end: companyData.subscriptionEnd,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (companyError) {
        console.error('Error creating company:', companyError);
        throw companyError;
      }

      console.log('Company created successfully:', company);

      // Create admin user
      const { data: adminUser, error: userError } = await supabase
        .from('users_crm_8x9p2k')
        .insert({
          email: companyData.adminEmail,
          name: companyData.adminName,
          role: 'admin',
          company_id: company.id,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (userError) {
        console.error('Error creating admin user:', userError);
        throw userError;
      }

      console.log('Admin user created successfully:', adminUser);

      return { company, adminUser };
    } catch (error) {
      console.error('Failed to create company:', error);
      handleSupabaseError(error, 'Create company');
    }
  },

  update: async (id, companyData) => {
    try {
      const { data, error } = await supabase
        .from('companies_crm_8x9p2k')
        .update({
          ...companyData,
          updated_at: new Date().toISOString()
        })
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
        .maybeSingle();

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
        message: success 
          ? 'Connection successful' 
          : 'Connection failed: Invalid credentials',
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
        .insert({
          ...userData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
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
        .update({
          ...userData,
          updated_at: new Date().toISOString()
        })
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
      console.log('Getting callers for company:', companyId);
      
      const { data, error } = await supabase
        .from('callers_crm_8x9p2k')
        .select(`
          *,
          addresses:addresses_crm_8x9p2k(*)
        `)
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error getting callers:', error);
        throw error;
      }

      console.log('Callers retrieved:', data?.length || 0);
      return data || [];
    } catch (error) {
      console.error('Failed to get callers:', error);
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
      console.log('Looking for caller with phone:', phoneNumber, 'in company:', companyId);
      
      const { data, error } = await supabase
        .from('callers_crm_8x9p2k')
        .select(`
          *,
          addresses:addresses_crm_8x9p2k(*)
        `)
        .eq('company_id', companyId)
        .eq('phone_number', phoneNumber)
        .eq('is_active', true)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error getting caller by phone:', error);
        throw error;
      }

      console.log('Caller found by phone:', !!data);
      return data || null;
    } catch (error) {
      console.error('Failed to get caller by phone:', error);
      handleSupabaseError(error, 'Get caller by phone');
    }
  },

  create: async (callerData) => {
    try {
      console.log('Creating caller with data:', callerData);
      
      const { data, error } = await supabase
        .from('callers_crm_8x9p2k')
        .insert({
          ...callerData,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select(`
          *,
          addresses:addresses_crm_8x9p2k(*)
        `)
        .single();

      if (error) {
        console.error('Error creating caller:', error);
        throw error;
      }

      console.log('Caller created successfully:', data);
      return data;
    } catch (error) {
      console.error('Failed to create caller:', error);
      handleSupabaseError(error, 'Create caller');
    }
  },

  update: async (id, callerData) => {
    try {
      const { data, error } = await supabase
        .from('callers_crm_8x9p2k')
        .update({
          ...callerData,
          updated_at: new Date().toISOString()
        })
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
      console.log('Creating address with data:', addressData);
      
      const { data, error } = await supabase
        .from('addresses_crm_8x9p2k')
        .insert({
          ...addressData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating address:', error);
        throw error;
      }

      console.log('Address created successfully:', data);
      return data;
    } catch (error) {
      console.error('Failed to create address:', error);
      handleSupabaseError(error, 'Create address');
    }
  },

  update: async (id, addressData) => {
    try {
      console.log('Updating address:', id, 'with data:', addressData);
      
      const { data, error } = await supabase
        .from('addresses_crm_8x9p2k')
        .update({
          ...addressData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating address:', error);
        throw error;
      }

      console.log('Address updated successfully:', data);
      return data;
    } catch (error) {
      console.error('Failed to update address:', error);
      handleSupabaseError(error, 'Update address');
    }
  },

  delete: async (id) => {
    try {
      console.log('Deleting address:', id);
      
      const { error } = await supabase
        .from('addresses_crm_8x9p2k')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting address:', error);
        throw error;
      }

      console.log('Address deleted successfully');
    } catch (error) {
      console.error('Failed to delete address:', error);
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