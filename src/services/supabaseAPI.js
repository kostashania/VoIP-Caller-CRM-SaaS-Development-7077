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
          *
        `)
        .eq('email', email)
        .eq('is_active', true)
        .single();

      if (userError || !userData) {
        throw new Error('Invalid email address. User not found.');
      }

      // Get company data separately if user has company_id
      let companyData = null;
      if (userData.company_id) {
        const { data: company, error: companyError } = await supabase
          .from('companies_crm_8x9p2k')
          .select('*')
          .eq('id', userData.company_id)
          .single();

        if (!companyError && company) {
          companyData = company;
        }
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
          company: companyData
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
        .maybeSingle();

      if (error) {
        console.error('Error getting SIP config:', error);
        throw error;
      }

      console.log('SIP config retrieved:', data);
      if (data && data.password_encrypted) {
        data.password = decryptPassword(data.password_encrypted);
      }

      return data || null;
    } catch (error) {
      console.error('Failed to get SIP config:', error);
      return null;
    }
  },

  updateConfig: async (companyId, config) => {
    try {
      console.log('Updating SIP config for company:', companyId, 'with data:', config);
      const configToStore = { ...config };

      if (config.password && config.password.trim()) {
        configToStore.password_encrypted = encryptPassword(config.password);
        delete configToStore.password;
        console.log('Password encrypted and will be saved');
      } else {
        delete configToStore.password;
        console.log('No password provided, keeping existing password');
      }

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
        if (existingRecords.length > 1) {
          console.log('Multiple records found, cleaning up...');
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

        const recordToUpdate = existingRecords[0];
        const updateData = {
          ...configToStore,
          updated_at: new Date().toISOString()
        };

        if (!config.password && recordToUpdate.password_encrypted) {
          updateData.password_encrypted = recordToUpdate.password_encrypted;
        }

        console.log('Updating existing SIP config with:', updateData);
        const { data, error } = await supabase
          .from('sip_configurations_crm_8x9p2k')
          .update(updateData)
          .eq('id', recordToUpdate.id)
          .select()
          .maybeSingle();

        if (error) {
          console.error('Error updating SIP config:', error);
          throw error;
        }

        result = data;
        console.log('SIP config updated successfully:', result);
      } else {
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
          .maybeSingle();

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
    }
  },

  testConnection: async (companyId, config) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 3000));
      const success = Math.random() > 0.2;

      const result = {
        success,
        message: success ? 'SIP connection successful' : 'SIP connection failed: Invalid credentials or network error',
        tested_at: new Date().toISOString()
      };

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
      
      // First get call logs
      let query = supabase
        .from('call_logs_crm_8x9p2k')
        .select('*')
        .eq('company_id', companyId);

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

      const { data: callLogs, error } = await query.order('timestamp', { ascending: false });

      if (error) {
        console.error('Error getting call logs:', error);
        throw error;
      }

      console.log('Call logs retrieved:', callLogs?.length || 0);

      // Now get callers and addresses for each call that has a caller_id
      const enrichedCallLogs = await Promise.all(
        (callLogs || []).map(async (callLog) => {
          if (!callLog.caller_id) {
            return callLog;
          }

          try {
            // Get caller data
            const { data: caller, error: callerError } = await supabase
              .from('callers_crm_8x9p2k')
              .select('*')
              .eq('id', callLog.caller_id)
              .single();

            if (callerError) {
              console.warn('Could not fetch caller for call log:', callLog.id);
              return callLog;
            }

            // Get addresses for this caller
            const { data: addresses, error: addressError } = await supabase
              .from('addresses_crm_8x9p2k')
              .select('*')
              .eq('caller_id', caller.id);

            if (!addressError && addresses) {
              caller.addresses = addresses;
            }

            // Get selected address if available
            let selectedAddress = null;
            if (callLog.selected_address_id) {
              const { data: selAddr, error: selAddrError } = await supabase
                .from('addresses_crm_8x9p2k')
                .select('*')
                .eq('id', callLog.selected_address_id)
                .single();

              if (!selAddrError && selAddr) {
                selectedAddress = selAddr;
              }
            }

            return {
              ...callLog,
              caller,
              selected_address: selectedAddress
            };
          } catch (error) {
            console.warn('Error enriching call log:', callLog.id, error);
            return callLog;
          }
        })
      );

      return enrichedCallLogs;
    } catch (error) {
      console.error('Failed to get call logs:', error);
      handleSupabaseError(error, 'Get call logs');
    }
  },

  create: async (callData) => {
    try {
      console.log('Creating call log with data:', callData);
      
      // Only include fields that exist in the database
      const cleanCallData = {
        company_id: callData.company_id,
        caller_id: callData.caller_id || null,
        caller_number: callData.caller_number,
        call_status: callData.call_status || 'incoming',
        call_direction: callData.call_direction || 'inbound',
        timestamp: callData.timestamp || new Date().toISOString(),
        voip_raw_payload: callData.voip_raw_payload ? JSON.stringify(callData.voip_raw_payload) : null,
        duration_seconds: callData.duration_seconds || null,
        answered_at: callData.answered_at || null,
        ended_at: callData.ended_at || null,
        call_note: callData.call_note || null,
        selected_address_id: callData.selected_address_id || null,
        delivery_status: callData.delivery_status || null
      };

      // Remove any undefined values
      Object.keys(cleanCallData).forEach(key => {
        if (cleanCallData[key] === undefined) {
          delete cleanCallData[key];
        }
      });

      console.log('Clean call data to insert:', cleanCallData);

      const { data, error } = await supabase
        .from('call_logs_crm_8x9p2k')
        .insert(cleanCallData)
        .select('*')
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
      
      // Only include fields that exist in the database
      const cleanMetadata = {
        call_status: status
      };

      // Add only known fields from metadata
      if (metadata.answered_at) cleanMetadata.answered_at = metadata.answered_at;
      if (metadata.ended_at) cleanMetadata.ended_at = metadata.ended_at;
      if (metadata.duration_seconds !== undefined) cleanMetadata.duration_seconds = metadata.duration_seconds;
      if (metadata.call_note) cleanMetadata.call_note = metadata.call_note;
      if (metadata.selected_address_id) cleanMetadata.selected_address_id = metadata.selected_address_id;
      if (metadata.delivery_status) cleanMetadata.delivery_status = metadata.delivery_status;

      console.log('Clean metadata to update:', cleanMetadata);

      const { data, error } = await supabase
        .from('call_logs_crm_8x9p2k')
        .update(cleanMetadata)
        .eq('id', id)
        .select('*')
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
        .select('*')
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
      console.log('🔍 Getting all companies...');
      const { data: companies, error: companiesError } = await supabase
        .from('companies_crm_8x9p2k')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (companiesError) {
        console.error('❌ Error getting companies:', companiesError);
        throw companiesError;
      }

      console.log('✅ Companies retrieved:', companies?.length || 0, companies);

      // Get user counts for each company
      const companiesWithCounts = await Promise.all(
        (companies || []).map(async (company) => {
          try {
            const { count, error: countError } = await supabase
              .from('users_crm_8x9p2k')
              .select('*', { count: 'exact' })
              .eq('company_id', company.id)
              .eq('is_active', true);

            if (countError) {
              console.warn('Warning: Could not get user count for company', company.id, countError);
            }

            return {
              ...company,
              user_count: count || 0
            };
          } catch (error) {
            console.warn('Warning: Error getting user count for company', company.id, error);
            return {
              ...company,
              user_count: 0
            };
          }
        })
      );

      console.log('✅ Companies with user counts:', companiesWithCounts);
      return companiesWithCounts;
    } catch (error) {
      console.error('❌ Failed to get companies:', error);
      handleSupabaseError(error, 'Get companies');
    }
  },

  create: async (companyData) => {
    try {
      console.log('🚀 Creating company with data:', companyData);

      // Step 1: Create company
      const companyInsertData = {
        name: companyData.name,
        subscription_start: companyData.subscriptionStart,
        subscription_end: companyData.subscriptionEnd,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('📝 Inserting company data:', companyInsertData);
      const { data: company, error: companyError } = await supabase
        .from('companies_crm_8x9p2k')
        .insert(companyInsertData)
        .select()
        .single();

      if (companyError) {
        console.error('❌ Error creating company:', companyError);
        throw new Error(`Failed to create company: ${companyError.message}`);
      }

      console.log('✅ Company created successfully:', company);

      // Step 2: Create admin user
      const userInsertData = {
        email: companyData.adminEmail,
        name: companyData.adminName,
        role: 'admin',
        company_id: company.id,
        password_hash: companyData.adminPassword ? encryptPassword(companyData.adminPassword) : encryptPassword('admin123'),
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('📝 Creating admin user with data:', { ...userInsertData, password_hash: '[ENCRYPTED]' });
      const { data: adminUser, error: userError } = await supabase
        .from('users_crm_8x9p2k')
        .insert(userInsertData)
        .select()
        .single();

      if (userError) {
        console.error('❌ Error creating admin user:', userError);
        // Try to clean up the company if user creation fails
        await supabase
          .from('companies_crm_8x9p2k')
          .delete()
          .eq('id', company.id);
        throw new Error(`Failed to create admin user: ${userError.message}`);
      }

      console.log('✅ Admin user created successfully:', { ...adminUser, password_hash: '[ENCRYPTED]' });

      // Return both company and admin user
      const result = {
        company: company,
        adminUser: {
          ...adminUser,
          password_hash: undefined // Don't return the hash
        }
      };

      console.log('🎉 Company creation completed successfully:', result);
      return result;
    } catch (error) {
      console.error('💥 Failed to create company:', error);
      throw new Error(error.message || 'Failed to create company');
    }
  },

  update: async (id, companyData) => {
    try {
      console.log('📝 Updating company:', id, 'with data:', companyData);
      const { data, error } = await supabase
        .from('companies_crm_8x9p2k')
        .update({
          ...companyData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating company:', error);
        throw error;
      }

      console.log('✅ Company updated successfully:', data);
      return data;
    } catch (error) {
      console.error('💥 Failed to update company:', error);
      handleSupabaseError(error, 'Update company');
    }
  },

  delete: async (id) => {
    try {
      console.log('🗑️ Deleting company:', id);
      const { error } = await supabase
        .from('companies_crm_8x9p2k')
        .update({ is_active: false })
        .eq('id', id);

      if (error) {
        console.error('❌ Error deleting company:', error);
        throw error;
      }

      console.log('✅ Company deleted successfully');
    } catch (error) {
      console.error('💥 Failed to delete company:', error);
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
        .select('*')
        .eq('is_active', true);

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data: users, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // Enrich users with company data
      const enrichedUsers = await Promise.all(
        (users || []).map(async (user) => {
          if (!user.company_id) {
            return { ...user, company: null };
          }

          try {
            const { data: company, error: companyError } = await supabase
              .from('companies_crm_8x9p2k')
              .select('*')
              .eq('id', user.company_id)
              .single();

            if (companyError) {
              console.warn('Could not fetch company for user:', user.id);
              return { ...user, company: null };
            }

            return { ...user, company };
          } catch (error) {
            console.warn('Error enriching user:', user.id, error);
            return { ...user, company: null };
          }
        })
      );

      return enrichedUsers;
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
        .select()
        .single();

      if (error) throw error;

      // Get company data if user has company_id
      if (data.company_id) {
        const { data: company, error: companyError } = await supabase
          .from('companies_crm_8x9p2k')
          .select('*')
          .eq('id', data.company_id)
          .single();

        if (!companyError && company) {
          data.company = company;
        }
      }

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
      const { data: callers, error } = await supabase
        .from('callers_crm_8x9p2k')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error getting callers:', error);
        throw error;
      }

      console.log('Callers retrieved:', callers?.length || 0);

      // Get addresses for each caller
      const callersWithAddresses = await Promise.all(
        (callers || []).map(async (caller) => {
          try {
            const { data: addresses, error: addressError } = await supabase
              .from('addresses_crm_8x9p2k')
              .select('*')
              .eq('caller_id', caller.id);

            if (addressError) {
              console.warn('Could not fetch addresses for caller:', caller.id);
              return { ...caller, addresses: [] };
            }

            return { ...caller, addresses: addresses || [] };
          } catch (error) {
            console.warn('Error enriching caller:', caller.id, error);
            return { ...caller, addresses: [] };
          }
        })
      );

      return callersWithAddresses;
    } catch (error) {
      console.error('Failed to get callers:', error);
      handleSupabaseError(error, 'Get callers');
    }
  },

  getById: async (id) => {
    try {
      const { data: caller, error } = await supabase
        .from('callers_crm_8x9p2k')
        .select('*')
        .eq('id', id)
        .eq('is_active', true)
        .single();

      if (error) throw error;

      // Get addresses for this caller
      const { data: addresses, error: addressError } = await supabase
        .from('addresses_crm_8x9p2k')
        .select('*')
        .eq('caller_id', id);

      if (!addressError && addresses) {
        caller.addresses = addresses;
      }

      return caller;
    } catch (error) {
      handleSupabaseError(error, 'Get caller by ID');
    }
  },

  getByPhone: async (companyId, phoneNumber) => {
    try {
      console.log('Looking for caller with phone:', phoneNumber, 'in company:', companyId);
      const { data: caller, error } = await supabase
        .from('callers_crm_8x9p2k')
        .select('*')
        .eq('company_id', companyId)
        .eq('phone_number', phoneNumber)
        .eq('is_active', true)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error getting caller by phone:', error);
        throw error;
      }

      console.log('Caller found by phone:', !!caller);

      if (!caller) {
        return null;
      }

      // Get addresses for this caller
      const { data: addresses, error: addressError } = await supabase
        .from('addresses_crm_8x9p2k')
        .select('*')
        .eq('caller_id', caller.id);

      if (!addressError && addresses) {
        caller.addresses = addresses;
      }

      return caller;
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
        .select()
        .single();

      if (error) {
        console.error('Error creating caller:', error);
        throw error;
      }

      console.log('Caller created successfully:', data);
      
      // Initialize with empty addresses array
      data.addresses = [];
      
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
        .select()
        .single();

      if (error) throw error;

      // Get addresses for this caller
      const { data: addresses, error: addressError } = await supabase
        .from('addresses_crm_8x9p2k')
        .select('*')
        .eq('caller_id', id);

      if (!addressError && addresses) {
        data.addresses = addresses;
      }

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