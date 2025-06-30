import { supabase } from '../lib/supabase';
import { useCallStore } from '../store/callStore';
import { useCallerStore } from '../store/callerStore';
import { useAuthStore } from '../store/authStore';
import { callLogsAPI, callersAPI } from './supabaseAPI';
import toast from 'react-hot-toast';

class WebhookService {
  constructor() {
    this.isListening = false;
    this.eventSource = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 5000;
  }

  // Generate webhook URL for the company
  getWebhookUrl(companyId) {
    // This would be your actual webhook endpoint
    // For now, using a placeholder - you'll need to set up your actual webhook receiver
    const baseUrl = window.location.origin;
    return `${baseUrl}/api/webhook/incoming-call/${companyId}`;
  }

  // Start listening for webhook events via Server-Sent Events or polling
  startListening(companyId) {
    if (this.isListening) {
      console.log('Webhook service already listening');
      return;
    }

    try {
      this.isListening = true;
      console.log('🎧 Starting webhook listener for company:', companyId);
      
      // For demo purposes, we'll simulate webhook calls
      // In production, this would connect to your webhook event stream
      this.simulateWebhookCalls(companyId);
      
      console.log('✅ Webhook listener started');
      console.log('📞 Webhook URL:', this.getWebhookUrl(companyId));
      
      toast.success('Webhook listener started - ready to receive calls!', { duration: 3000 });
      
    } catch (error) {
      console.error('Failed to start webhook listener:', error);
      this.isListening = false;
      throw error;
    }
  }

  stopListening() {
    console.log('🛑 Stopping webhook listener...');
    
    this.isListening = false;
    
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    
    // Clear any simulation timers
    if (this.simulationTimer) {
      clearTimeout(this.simulationTimer);
      this.simulationTimer = null;
    }
    
    console.log('✅ Webhook listener stopped');
    toast.success('Webhook listener stopped', { duration: 2000 });
  }

  // Simulate webhook calls for demo (remove this in production)
  simulateWebhookCalls(companyId) {
    const scheduleNextCall = () => {
      if (!this.isListening) return;

      // Random delay between 20-60 seconds
      const delay = Math.random() * 40000 + 20000;
      
      this.simulationTimer = setTimeout(() => {
        if (this.isListening) {
          // Simulate webhook call
          const callerId = this.getRandomCallerId();
          console.log('📱 Simulating webhook call from:', callerId);
          
          this.handleWebhookCall({
            caller_id: callerId,
            timestamp: new Date().toISOString(),
            call_type: 'incoming',
            webhook_id: `webhook-${Date.now()}`,
            source: 'demo_webhook'
          }, companyId);
          
          scheduleNextCall();
        }
      }, delay);
    };

    // Start first call after 10 seconds
    setTimeout(() => {
      if (this.isListening) {
        scheduleNextCall();
      }
    }, 10000);
  }

  getRandomCallerId() {
    const knownCallers = ['+1234567890', '+0987654321', '+1122334455'];
    const unknownCallers = [
      '+1555000001', '+1555000002', '+1555000003',
      '+1666777888', '+1777888999', '+1888999000',
      '+306912345678', '+306987654321', '+306911223344'
    ];
    
    const allCallers = [...knownCallers, ...unknownCallers];
    return allCallers[Math.floor(Math.random() * allCallers.length)];
  }

  // Main webhook handler - this is what processes incoming webhook calls
  async handleWebhookCall(webhookData, companyId) {
    const { setIncomingCall, addCallLog, incomingCall } = useCallStore.getState();

    // Don't handle new calls if there's already an active incoming call
    if (incomingCall) {
      console.log('📵 Webhook call blocked - another call is already active');
      return { success: false, reason: 'Another call is already active' };
    }

    try {
      console.log('📞 Processing webhook call:', webhookData);

      // Extract and clean caller ID
      const callerId = this.cleanCallerId(webhookData.caller_id);
      
      // Check if caller exists in database
      const existingCaller = await callersAPI.getByPhone(companyId, callerId);
      
      // Create call log entry
      const callLog = await callLogsAPI.create({
        company_id: companyId,
        caller_id: existingCaller?.id || null,
        caller_number: callerId,
        call_status: 'incoming',
        call_direction: 'inbound',
        webhook_id: webhookData.webhook_id,
        voip_raw_payload: webhookData,
        timestamp: webhookData.timestamp || new Date().toISOString()
      });

      // Prepare incoming call data
      const incomingCallData = {
        ...callLog,
        caller: existingCaller,
        webhookData: webhookData,
        isWebhookCall: true
      };

      // Update UI state
      addCallLog(callLog);
      setIncomingCall(incomingCallData);

      // Play notification sound
      this.playNotificationSound();

      console.log('✅ Webhook call processed:', {
        callerId,
        callerFound: !!existingCaller,
        callLogId: callLog.id
      });

      return { 
        success: true, 
        callLogId: callLog.id,
        callerFound: !!existingCaller 
      };

    } catch (error) {
      console.error('❌ Failed to process webhook call:', error);
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

  getListeningStatus() {
    return this.isListening;
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

// Auto-start when user is authenticated
if (typeof window !== 'undefined') {
  const checkAuthAndStart = () => {
    const { user, getUserCompanyId } = useAuthStore.getState();
    if (user && getUserCompanyId()) {
      const companyId = getUserCompanyId();
      console.log('🚀 Auto-starting webhook service for company:', companyId);
      
      // Auto-start webhook listening
      setTimeout(() => {
        try {
          webhookService.startListening(companyId);
          console.log('📞 Webhook service ready to receive calls');
        } catch (error) {
          console.error('Failed to auto-start webhook service:', error);
        }
      }, 2000);
    }
  };

  // Check on load
  setTimeout(checkAuthAndStart, 3000);
}

export default WebhookService;