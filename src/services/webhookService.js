import { supabase } from '../lib/supabase';
import { useCallStore } from '../store/callStore';
import { useCallerStore } from '../store/callerStore';
import { useAuthStore } from '../store/authStore';
import { callLogsAPI, callersAPI } from './supabaseAPI';
import toast from 'react-hot-toast';

class WebhookService {
  constructor() {
    this.isListening = false;
    this.isSimulating = false;
    this.eventSource = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 5000;
    this.simulationTimer = null;
    this.randomSimulationTimer = null;
    this.stats = {
      totalReceived: 0,
      todayReceived: 0,
      lastReceived: null
    };
  }

  // Generate webhook URL for the company
  getWebhookUrl(companyId) {
    const baseUrl = window.location.origin;
    return `${baseUrl}/api/webhook/incoming-call/${companyId}`;
  }

  // Start listening for webhook events
  startListening(companyId) {
    if (this.isListening) {
      console.log('Webhook service already listening');
      return;
    }

    try {
      this.isListening = true;
      console.log('🎧 Starting webhook listener for company:', companyId);

      // Send a test call after 10 seconds
      setTimeout(() => {
        if (this.isListening) {
          console.log('📱 Sending test webhook call after 10 seconds...');
          this.sendTestCall(companyId);
        }
      }, 10000);

      console.log('✅ Webhook listener started');
      console.log('📞 Webhook URL:', this.getWebhookUrl(companyId));
      toast.success('Webhook listener started - test call in 10 seconds!', { duration: 3000 });
    } catch (error) {
      console.error('Failed to start webhook listener:', error);
      this.isListening = false;
      throw error;
    }
  }

  stopListening() {
    console.log('🛑 Stopping webhook listener...');
    this.isListening = false;
    this.isSimulating = false;

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    // Clear any simulation timers
    if (this.simulationTimer) {
      clearTimeout(this.simulationTimer);
      this.simulationTimer = null;
    }

    if (this.randomSimulationTimer) {
      clearTimeout(this.randomSimulationTimer);
      this.randomSimulationTimer = null;
    }

    console.log('✅ Webhook listener stopped');
    toast.success('Webhook listener stopped', { duration: 2000 });
  }

  // Send a test call immediately
  sendTestCall(companyId) {
    console.log('🧪 Sending test webhook call...');
    const testCallerId = '+1234567890';
    
    this.handleWebhookCall({
      caller_id: testCallerId,
      timestamp: new Date().toISOString(),
      call_type: 'incoming',
      source: 'test_webhook'
    }, companyId);

    toast.success('Test webhook call sent!', { duration: 2000 });
  }

  // Start random simulation (every 1-3 minutes)
  startRandomSimulation(companyId) {
    if (this.isSimulating) {
      console.log('Random simulation already running');
      return;
    }

    this.isSimulating = true;
    console.log('🎭 Starting random call simulation...');

    const scheduleRandomCall = () => {
      if (!this.isSimulating || !this.isListening) return;

      // Random delay between 1-3 minutes (60000-180000 ms)
      const delayMinutes = Math.random() * 2 + 1; // 1-3 minutes
      const delay = delayMinutes * 60000;

      console.log(`⏰ Next random call scheduled in ${delayMinutes.toFixed(1)} minutes`);

      this.randomSimulationTimer = setTimeout(() => {
        if (this.isSimulating && this.isListening) {
          const callerId = this.getRandomCallerId();
          console.log('📱 Random simulation call from:', callerId);
          
          this.handleWebhookCall({
            caller_id: callerId,
            timestamp: new Date().toISOString(),
            call_type: 'incoming',
            source: 'random_simulation'
          }, companyId);

          scheduleRandomCall();
        }
      }, delay);
    };

    // Start first random call after 10 seconds
    setTimeout(() => {
      if (this.isSimulating && this.isListening) {
        console.log('🚀 Starting random call schedule...');
        scheduleRandomCall();
      }
    }, 10000);

    toast.success('Random simulation started - calls every 1-3 minutes', { duration: 3000 });
  }

  stopSimulation() {
    this.isSimulating = false;
    if (this.randomSimulationTimer) {
      clearTimeout(this.randomSimulationTimer);
      this.randomSimulationTimer = null;
    }
    console.log('🛑 Random simulation stopped');
    toast.success('Random simulation stopped', { duration: 2000 });
  }

  getRandomCallerId() {
    // Known callers (these will have existing records)
    const knownCallers = [
      '+1234567890',
      '+0987654321',
      '+1122334455'
    ];

    // Unknown callers (these will trigger new customer creation)
    const unknownCallers = [
      '+1555000001',
      '+1555000002',
      '+1555000003',
      '+1666777888',
      '+1777888999',
      '+1888999000',
      '+306912345678',
      '+306987654321',
      '+306911223344',
      '+44207123456',
      '+33123456789',
      '+49301234567'
    ];

    const allCallers = [...knownCallers, ...unknownCallers];
    return allCallers[Math.floor(Math.random() * allCallers.length)];
  }

  // Main webhook handler - this is what processes incoming webhook calls
  async handleWebhookCall(webhookData, companyId) {
    console.log('🔄 Processing webhook call with data:', webhookData);
    console.log('🏢 Company ID:', companyId);

    const { setIncomingCall, addCallLog, incomingCall } = useCallStore.getState();

    // Don't handle new calls if there's already an active incoming call
    if (incomingCall) {
      console.log('📵 Webhook call blocked - another call is already active');
      toast.warning('Call blocked - another call is active', { duration: 2000 });
      return { success: false, reason: 'Another call is already active' };
    }

    try {
      // Extract and clean caller ID
      const callerId = this.cleanCallerId(webhookData.caller_id);
      console.log('📞 Cleaned caller ID:', callerId);

      // Check if caller exists in database
      console.log('🔍 Looking for existing caller...');
      const existingCaller = await callersAPI.getByPhone(companyId, callerId);
      console.log('👤 Existing caller found:', !!existingCaller);

      // Create call log entry with only existing fields
      console.log('📝 Creating call log entry...');
      const callLogData = {
        company_id: companyId,
        caller_id: existingCaller?.id || null,
        caller_number: callerId,
        call_status: 'incoming',
        call_direction: 'inbound',
        voip_raw_payload: webhookData,
        timestamp: webhookData.timestamp || new Date().toISOString()
      };

      console.log('📝 Call log data:', callLogData);
      const callLog = await callLogsAPI.create(callLogData);
      console.log('✅ Call log created:', callLog);

      // Prepare incoming call data
      const incomingCallData = {
        ...callLog,
        caller: existingCaller,
        webhookData: webhookData,
        isWebhookCall: true
      };

      console.log('📱 Setting incoming call data:', incomingCallData);

      // Update UI state
      addCallLog(callLog);
      setIncomingCall(incomingCallData);

      // Update statistics
      this.updateStats();

      // Play notification sound
      this.playNotificationSound();

      console.log('✅ Webhook call processed successfully:', {
        callerId,
        callerFound: !!existingCaller,
        callLogId: callLog.id
      });

      // Show success notification
      const callerName = existingCaller?.name || 'Unknown Caller';
      toast.success(`📞 Incoming call from ${callerName} (${callerId})`, { duration: 3000 });

      return {
        success: true,
        callLogId: callLog.id,
        callerFound: !!existingCaller
      };
    } catch (error) {
      console.error('❌ Failed to process webhook call:', error);
      toast.error(`Failed to process call: ${error.message}`, { duration: 4000 });
      return { success: false, error: error.message };
    }
  }

  cleanCallerId(rawCallerId) {
    // Remove any non-numeric characters except +
    let cleaned = String(rawCallerId).replace(/[^\d+]/g, '');
    
    // Ensure it starts with + for international format
    if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }
    
    return cleaned;
  }

  playNotificationSound() {
    try {
      // Create audio context for notification
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Create phone ringing sound
      const now = audioContext.currentTime;
      for (let i = 0; i < 3; i++) {
        const startTime = now + (i * 1);
        oscillator.frequency.setValueAtTime(800, startTime);
        gainNode.gain.setValueAtTime(0.3, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
      }

      oscillator.start(now);
      oscillator.stop(now + 3);

      console.log('🔔 Playing webhook call notification');
    } catch (error) {
      console.warn('Could not play notification sound:', error);
    }
  }

  updateStats() {
    this.stats.totalReceived += 1;
    this.stats.todayReceived += 1;
    this.stats.lastReceived = new Date().toISOString();
    console.log('📊 Updated stats:', this.stats);
  }

  getListeningStatus() {
    return this.isListening;
  }

  getSimulationStatus() {
    return this.isSimulating;
  }

  getStats() {
    return this.stats;
  }

  // Method to handle real webhook POST requests (for your backend)
  static async processWebhookRequest(request, companyId) {
    try {
      const webhookData = request.body;

      // Validate webhook data
      if (!webhookData.caller_id) {
        throw new Error('Missing caller_id in webhook data');
      }

      // Process the webhook
      const service = new WebhookService();
      const result = await service.handleWebhookCall(webhookData, companyId);

      return {
        success: true,
        message: 'Webhook processed successfully',
        data: result
      };
    } catch (error) {
      console.error('Webhook processing error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Export singleton instance
export const webhookService = new WebhookService();

// Don't auto-start - let user control when to start
console.log('🔧 Webhook service initialized - ready for manual start');

export default WebhookService;