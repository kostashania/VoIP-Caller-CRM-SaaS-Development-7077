const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://smkhqyxtjrtavlzgjbqm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNta2hxeXh0anJ0YXZsemdqYnFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5NzM1MjgsImV4cCI6MjA2NjU0OTUyOH0.qsEvNlujeYTu1aTIy2ne_sbYzl9XW5Wv1VrxLoYkjD4';

function cleanCallerNumber(rawNumber) {
  let cleaned = String(rawNumber).replace(/[^\d+]/g, '');
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  return cleaned;
}

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Method not allowed. Use POST.',
        allowedMethods: ['POST', 'OPTIONS']
      })
    };
  }

  try {
    console.log('🎯 Webhook function called');
    console.log('📍 Event details:', {
      httpMethod: event.httpMethod,
      path: event.path,
      queryStringParameters: event.queryStringParameters
    });

    // Extract company ID from query parameters
    const companyId = event.queryStringParameters?.company;
    console.log('🏢 Company ID extracted:', companyId);

    if (!companyId || companyId === 'undefined') {
      throw new Error('Company ID not found in query parameters. Expected: ?company={companyId}');
    }

    // Parse webhook data
    let webhookData;
    try {
      const bodyText = event.body;
      console.log('📝 Raw body length:', bodyText?.length || 0);
      
      if (!bodyText) {
        throw new Error('Empty request body');
      }

      webhookData = JSON.parse(bodyText);
      console.log('📞 Parsed webhook data:', webhookData);
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError);
      throw new Error(`Invalid JSON in request body: ${parseError.message}`);
    }

    // Validate required fields
    if (!webhookData.caller_id) {
      throw new Error('Missing caller_id in webhook data. This field is required.');
    }

    // Clean caller number
    const callerNumber = cleanCallerNumber(webhookData.caller_id);
    console.log('📱 Cleaned caller number:', callerNumber);

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });

    // Check if caller exists
    console.log('🔍 Looking for existing caller...');
    let existingCaller = null;
    try {
      const { data, error: callerError } = await supabase
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
      } else {
        existingCaller = data;
        console.log('👤 Existing caller found:', !!existingCaller);
      }
    } catch (callerQueryError) {
      console.error('❌ Caller query exception:', callerQueryError);
    }

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

    console.log('📋 Call log data to insert:', callLogData);

    const { data: callLog, error: callError } = await supabase
      .from('call_logs_crm_8x9p2k')
      .insert(callLogData)
      .select()
      .single();

    if (callError) {
      console.error('❌ Error creating call log:', callError);
      throw new Error(`Failed to create call log: ${callError.message}`);
    }

    if (!callLog) {
      throw new Error('Call log was not created - no data returned from database');
    }

    console.log('✅ Call log created successfully:', callLog.id);

    const responseData = {
      success: true,
      message: 'Webhook processed successfully',
      data: {
        callLogId: callLog.id,
        callerFound: !!existingCaller,
        callerNumber: callerNumber,
        callerName: existingCaller?.name || null,
        addressCount: existingCaller?.addresses?.length || 0,
        timestamp: new Date().toISOString(),
        companyId: companyId,
        webhookId: webhookData.webhook_id || null
      },
      metadata: {
        processingTime: Date.now(),
        endpoint: 'webhook-incoming-call',
        version: '1.3.0',
        function: context.functionName
      }
    };

    console.log('🎉 Webhook processed successfully');
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(responseData, null, 2)
    };

  } catch (error) {
    console.error('💥 Webhook processing failed:', error);

    const errorResponse = {
      success: false,
      error: error.message || 'Webhook processing failed',
      timestamp: new Date().toISOString(),
      details: {
        path: event.path,
        method: event.httpMethod,
        query: event.queryStringParameters,
        errorType: error.constructor.name
      },
      help: {
        expectedFormat: {
          caller_id: '+1234567890 (required)',
          timestamp: '2024-01-01T12:00:00Z (optional)',
          call_type: 'incoming (optional)',
          webhook_id: 'unique-id (optional)'
        },
        documentation: 'Use query parameter: ?company={companyId}',
        troubleshooting: 'Check Netlify function logs for more details'
      }
    };

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify(errorResponse, null, 2)
    };
  }
};