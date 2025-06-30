import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const SUPABASE_URL = 'https://smkhqyxtjrtavlzgjbqm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNta2hxeXh0anJ0YXZsemdqYnFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5NzM1MjgsImV4cCI6MjA2NjU0OTUyOH0.qsEvNlujeYTu1aTIy2ne_sbYzl9XW5Wv1VrxLoYkjD4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper function to clean caller number
function cleanCallerNumber(rawNumber) {
  // Remove non-numeric characters except + at the beginning
  let cleaned = String(rawNumber).replace(/[^\d+]/g, '');
  
  // Ensure it starts with + for international format
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  
  return cleaned;
}

// Helper function to log webhook activity
async function logWebhookActivity(companyId, webhookData, success, error = null) {
  const logEntry = {
    company_id: companyId,
    webhook_data: JSON.stringify(webhookData),
    caller_number: webhookData.caller_id ? cleanCallerNumber(webhookData.caller_id) : null,
    success: success,
    error_message: error ? error.message : null,
    timestamp: new Date().toISOString(),
    source: webhookData.source || 'voip_provider'
  };

  try {
    // You could create a webhook_logs table to store these
    console.log('📝 Webhook activity:', logEntry);
  } catch (logError) {
    console.error('Failed to log webhook activity:', logError);
  }
}

export default async function handler(request, context) {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight OPTIONS request
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers
    });
  }

  // Only allow POST requests
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({
      success: false,
      error: 'Method not allowed. Use POST.'
    }), {
      status: 405,
      headers
    });
  }

  try {
    console.log('🎯 Real webhook received!');
    console.log('📍 URL:', request.url);
    console.log('📋 Headers:', Object.fromEntries(request.headers.entries()));

    // Extract company ID from URL path
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const companyId = pathParts[pathParts.length - 1]; // Last part of the path

    console.log('🏢 Company ID extracted:', companyId);

    if (!companyId || companyId === 'undefined') {
      throw new Error('Company ID not found in URL path');
    }

    // Parse webhook data
    const webhookData = await request.json();
    console.log('📞 Webhook data received:', webhookData);

    // Validate required fields
    if (!webhookData.caller_id) {
      throw new Error('Missing caller_id in webhook data');
    }

    // Clean and format caller number
    const callerNumber = cleanCallerNumber(webhookData.caller_id);
    console.log('📱 Cleaned caller number:', callerNumber);

    // Check if caller exists in database
    console.log('🔍 Looking for existing caller...');
    const { data: existingCaller, error: callerError } = await supabase
      .from('callers_crm_8x9p2k')
      .select(`
        *,
        addresses:addresses_crm_8x9p2k(*)
      `)
      .eq('company_id', companyId)
      .eq('phone_number', callerNumber)
      .eq('is_active', true)
      .maybeSingle();

    if (callerError) {
      console.error('❌ Error querying caller:', callerError);
    }

    console.log('👤 Existing caller found:', !!existingCaller);

    // Create call log entry
    console.log('📝 Creating call log entry...');
    const callLogData = {
      company_id: companyId,
      caller_id: existingCaller?.id || null,
      caller_number: callerNumber,
      call_status: 'incoming',
      call_direction: 'inbound',
      voip_raw_payload: JSON.stringify(webhookData),
      timestamp: webhookData.timestamp || new Date().toISOString()
    };

    const { data: callLog, error: callError } = await supabase
      .from('call_logs_crm_8x9p2k')
      .insert(callLogData)
      .select()
      .single();

    if (callError) {
      console.error('❌ Error creating call log:', callError);
      throw callError;
    }

    console.log('✅ Call log created:', callLog.id);

    // Prepare response data
    const responseData = {
      success: true,
      message: 'Webhook processed successfully',
      data: {
        callLogId: callLog.id,
        callerFound: !!existingCaller,
        callerNumber: callerNumber,
        timestamp: new Date().toISOString(),
        companyId: companyId
      }
    };

    // Log successful webhook activity
    await logWebhookActivity(companyId, webhookData, true);

    console.log('🎉 Webhook processed successfully:', responseData);

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers
    });

  } catch (error) {
    console.error('💥 Webhook processing failed:', error);
    
    // Log failed webhook activity
    try {
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/');
      const companyId = pathParts[pathParts.length - 1];
      const webhookData = await request.json().catch(() => ({}));
      await logWebhookActivity(companyId, webhookData, false, error);
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    const errorResponse = {
      success: false,
      error: error.message || 'Webhook processing failed',
      timestamp: new Date().toISOString()
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers
    });
  }
}