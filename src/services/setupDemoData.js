import { supabase } from '../lib/supabase';

export const setupDemoData = async () => {
  try {
    console.log('Setting up demo data...');

    // First, check if demo data already exists
    const { data: existingCompanies } = await supabase
      .from('companies_voipcrm_2024')
      .select('id')
      .limit(1);

    if (existingCompanies && existingCompanies.length > 0) {
      console.log('Demo data already exists');
      return;
    }

    // Create demo companies
    const companies = [
      {
        name: 'TechCorp Solutions',
        subscription_start: '2024-01-01',
        subscription_end: '2024-12-31'
      },
      {
        name: 'Global Enterprises',
        subscription_start: '2024-02-01',
        subscription_end: '2024-12-31'
      }
    ];

    const { data: createdCompanies, error: companiesError } = await supabase
      .from('companies_voipcrm_2024')
      .insert(companies)
      .select();

    if (companiesError) {
      console.error('Error creating companies:', companiesError);
      return;
    }

    console.log('Created companies:', createdCompanies);

    // Create demo users
    const users = [
      {
        name: 'Super Admin',
        email: 'super@voipcrm.com',
        role: 'superadmin',
        company_id: null,
        is_active: true
      },
      {
        name: 'John Admin',
        email: 'admin@company1.com',
        role: 'admin',
        company_id: createdCompanies[0].id,
        is_active: true
      },
      {
        name: 'Jane User',
        email: 'user@company1.com',
        role: 'user',
        company_id: createdCompanies[0].id,
        is_active: true
      },
      {
        name: 'Company 2 Admin',
        email: 'admin@company2.com',
        role: 'admin',
        company_id: createdCompanies[1].id,
        is_active: true
      }
    ];

    const { data: createdUsers, error: usersError } = await supabase
      .from('users_voipcrm_2024')
      .insert(users)
      .select();

    if (usersError) {
      console.error('Error creating users:', usersError);
      return;
    }

    console.log('Created users:', createdUsers);

    // Create VoIP settings for companies
    const voipSettings = [
      {
        company_id: createdCompanies[0].id,
        voip_url: 'https://api.techcorp.com/webhook',
        voip_username: 'techcorp_user',
        voip_password: 'demo_password',
        protocol: 'SIP',
        sip_id: 'techcorp123'
      },
      {
        company_id: createdCompanies[1].id,
        voip_url: 'https://webhook.globalent.com/calls',
        voip_username: 'global_admin',
        voip_password: 'demo_password',
        protocol: 'HTTP'
      }
    ];

    const { error: voipError } = await supabase
      .from('voip_settings_voipcrm_2024')
      .insert(voipSettings);

    if (voipError) {
      console.error('Error creating VoIP settings:', voipError);
      return;
    }

    // Create demo callers for company 1
    const callers = [
      {
        company_id: createdCompanies[0].id,
        phone_number: '+1234567890',
        name: 'John Smith',
        global_note: 'Frequent customer, prefers morning calls',
        is_active: true
      },
      {
        company_id: createdCompanies[0].id,
        phone_number: '+0987654321',
        name: 'Sarah Johnson',
        global_note: 'VIP client, handle with priority',
        is_active: true
      }
    ];

    const { data: createdCallers, error: callersError } = await supabase
      .from('callers_voipcrm_2024')
      .insert(callers)
      .select();

    if (callersError) {
      console.error('Error creating callers:', callersError);
      return;
    }

    // Create demo addresses
    const addresses = [
      {
        caller_id: createdCallers[0].id,
        label: 'Home',
        address: '123 Main St, New York, NY 10001',
        phone: '+1234567890',
        comment: 'Apartment 4B, ring twice',
        is_primary: true
      },
      {
        caller_id: createdCallers[0].id,
        label: 'Work',
        address: '456 Business Ave, New York, NY 10002',
        phone: '+1234567891',
        comment: 'Reception desk, ask for John',
        is_primary: false
      },
      {
        caller_id: createdCallers[1].id,
        label: 'Office',
        address: '789 Corporate Blvd, Manhattan, NY 10003',
        phone: '+0987654321',
        comment: 'CEO office, 45th floor',
        is_primary: true
      }
    ];

    const { error: addressesError } = await supabase
      .from('caller_addresses_voipcrm_2024')
      .insert(addresses);

    if (addressesError) {
      console.error('Error creating addresses:', addressesError);
      return;
    }

    // Create demo calls
    const calls = [
      {
        company_id: createdCompanies[0].id,
        caller_id: createdCallers[0].id,
        caller_number: '+1234567890',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        call_status: 'answered',
        duration_sec: 180,
        voip_raw_payload: JSON.stringify({ caller_id: '+1234567890', duration: 180 })
      },
      {
        company_id: createdCompanies[0].id,
        caller_id: createdCallers[1].id,
        caller_number: '+0987654321',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        call_status: 'missed',
        duration_sec: 0,
        voip_raw_payload: JSON.stringify({ caller_id: '+0987654321', duration: 0 })
      }
    ];

    const { error: callsError } = await supabase
      .from('calls_voipcrm_2024')
      .insert(calls);

    if (callsError) {
      console.error('Error creating calls:', callsError);
      return;
    }

    console.log('Demo data setup completed successfully!');
    return true;
  } catch (error) {
    console.error('Error setting up demo data:', error);
    return false;
  }
};