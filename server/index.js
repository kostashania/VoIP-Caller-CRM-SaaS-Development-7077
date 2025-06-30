import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createClient } from '@supabase/supabase-js';

// ES6 module path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase configuration
const SUPABASE_URL = 'https://smkhqyxtjrtavlzgjbqm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNta2hxeXh0anJ0YXZsemdqYnFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5NzM1MjgsImV4cCI6MjA2NjU0OTUyOH0.qsEvNlujeYTu1aTIy2ne_sbYzl9XW5Wv1VrxLoYkjD4';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from dist directory
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// Store active connections by company
const companyConnections = new Map();

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join-company', (companyId) => {
    socket.join(`company-${companyId}`);
    if (!companyConnections.has(companyId)) {
      companyConnections.set(companyId, new Set());
    }
    companyConnections.get(companyId).add(socket.id);
    console.log(`Client ${socket.id} joined company ${companyId}`);
  });

  socket.on('disconnect', () => {
    // Remove from all companies
    companyConnections.forEach((sockets, companyId) => {
      sockets.delete(socket.id);
      if (sockets.size === 0) {
        companyConnections.delete(companyId);
      }
    });
    console.log('Client disconnected:', socket.id);
  });
});

// Webhook endpoint for incoming calls
app.post('/api/webhook/incoming-call/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    const webhookData = req.body;

    console.log('📞 Webhook received for company:', companyId);
    console.log('📞 Webhook data:', webhookData);

    // Validate webhook data
    if (!webhookData.caller_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing caller_id in webhook data'
      });
    }

    // Clean and format caller number
    const callerNumber = cleanCallerNumber(webhookData.caller_id);

    // Check if caller exists in database
    const { data: existingCaller } = await supabase
      .from('callers_crm_8x9p2k')
      .select(`
        *,
        addresses:addresses_crm_8x9p2k(*)
      `)
      .eq('company_id', companyId)
      .eq('phone_number', callerNumber)
      .eq('is_active', true)
      .maybeSingle();

    // Create call log entry
    const { data: callLog, error: callError } = await supabase
      .from('call_logs_crm_8x9p2k')
      .insert({
        company_id: companyId,
        caller_id: existingCaller?.id || null,
        caller_number: callerNumber,
        call_status: 'incoming',
        call_direction: 'inbound',
        voip_raw_payload: JSON.stringify(webhookData),
        timestamp: webhookData.timestamp || new Date().toISOString()
      })
      .select()
      .single();

    if (callError) {
      throw callError;
    }

    // Prepare call data for frontend
    const incomingCallData = {
      ...callLog,
      caller: existingCaller,
      webhookData: webhookData,
      isWebhookCall: true
    };

    // Send real-time notification to connected clients
    io.to(`company-${companyId}`).emit('incoming-call', incomingCallData);

    console.log('✅ Webhook processed successfully');
    console.log(`📡 Notified ${companyConnections.get(companyId)?.size || 0} connected clients`);

    res.json({
      success: true,
      message: 'Webhook processed successfully',
      callLogId: callLog.id,
      callerFound: !!existingCaller
    });

  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test webhook endpoint
app.post('/api/webhook/test/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;

    // Send test call
    const testCallData = {
      caller_id: '+306912345678',
      timestamp: new Date().toISOString(),
      call_type: 'incoming',
      source: 'test_api',
      webhook_id: 'test-' + Date.now()
    };

    // Process as webhook
    const response = await fetch(`${req.protocol}://${req.get('host')}/api/webhook/incoming-call/${companyId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testCallData)
    });

    const result = await response.json();

    res.json({
      success: true,
      message: 'Test webhook sent successfully',
      result
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    connectedClients: Array.from(companyConnections.entries()).map(([companyId, sockets]) => ({
      companyId,
      connectedClients: sockets.size
    })),
    webhookEndpoint: '/api/webhook/incoming-call/{companyId}',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Serve frontend for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

function cleanCallerNumber(rawNumber) {
  // Remove non-numeric characters except + at the beginning
  let cleaned = String(rawNumber).replace(/[^\d+]/g, '');
  
  // Ensure it starts with + for international format
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  
  return cleaned;
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Webhook server running on port ${PORT}`);
  console.log(`📞 Production webhook endpoint: http://localhost:${PORT}/api/webhook/incoming-call/{companyId}`);
  console.log(`🧪 Test endpoint: http://localhost:${PORT}/api/webhook/test/{companyId}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
});