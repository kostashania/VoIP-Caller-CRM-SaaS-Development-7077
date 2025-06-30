export default async function handler(request, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'VoIP Webhook Handler',
    version: '1.0.0',
    endpoints: {
      webhook: '/.netlify/functions/webhook-incoming-call',
      health: '/.netlify/functions/health'
    },
    environment: 'production'
  };

  return new Response(JSON.stringify(healthData), {
    status: 200,
    headers
  });
}