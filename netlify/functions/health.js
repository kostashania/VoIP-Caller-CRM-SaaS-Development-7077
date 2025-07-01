const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://smkhqyxtjrtavlzgjbqm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNta2hxeXh0anJ0YXZsemdqYnFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5NzM1MjgsImV4cCI6MjA2NjU0OTUyOH0.qsEvNlujeYTu1aTIy2ne_sbYzl9XW5Wv1VrxLoYkjD4';

exports.handler = async (event, context) => {
  // CORS headers for all responses
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    console.log('🏥 Health check endpoint called');
    console.log('📍 Event details:', {
      httpMethod: event.httpMethod,
      path: event.path,
      headers: event.headers
    });

    // Test Supabase connection
    let supabaseStatus = 'unknown';
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { data, error } = await supabase
        .from('companies_crm_8x9p2k')
        .select('count')
        .limit(1);

      supabaseStatus = error ? 'error' : 'connected';
      console.log('📊 Supabase test result:', {
        supabaseStatus,
        error: error?.message
      });
    } catch (supabaseError) {
      console.error('❌ Supabase connection error:', supabaseError);
      supabaseStatus = 'error';
    }

    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'VoIP Webhook Handler',
      version: '1.3.0',
      environment: 'netlify',
      function: {
        name: context.functionName || 'health',
        version: context.functionVersion || 'unknown',
        region: process.env.AWS_REGION || 'unknown',
        requestId: context.awsRequestId || 'unknown'
      },
      supabase: {
        url: SUPABASE_URL,
        status: supabaseStatus
      },
      endpoints: {
        health: '/.netlify/functions/health',
        webhook: '/.netlify/functions/webhook-incoming-call?company={companyId}'
      },
      deployment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      }
    };

    console.log('✅ Health check successful');
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(healthData, null, 2)
    };

  } catch (error) {
    console.error('❌ Health check failed:', error);

    const errorResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        type: error.constructor.name,
        stack: error.stack
      },
      service: 'VoIP Webhook Handler'
    };

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify(errorResponse, null, 2)
    };
  }
};