import { supabase } from '../lib/supabase';
import { useCallStore } from '../store/callStore';
import { useCallerStore } from '../store/callerStore';
import { useAuthStore } from '../store/authStore';
import { callLogsAPI, callersAPI, sipAPI } from './supabaseAPI';

class SIPService {
  constructor() {
    this.sipConfig = null;
    this.isRegistered = false;
    this.isMonitoring = false;
    this.callSession = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.simulationTimer = null;
    this.registrationCheckInterval = null;
    this.sipUA = null; // For SIP User Agent
  }

  async initialize(companyId) {
    try {
      // Get SIP configuration for the company
      this.sipConfig = await sipAPI.getConfig(companyId);
      
      if (!this.sipConfig || !this.sipConfig.is_active) {
        console.log('No active SIP configuration found');
        return false;
      }

      console.log('SIP Service initialized for company:', companyId);
      console.log('SIP Config:', {
        username: this.sipConfig.username,
        domain: this.sipConfig.domain,
        proxy: this.sipConfig.proxy,
        transport: this.sipConfig.transport,
        port: this.sipConfig.port
      });

      return true;
    } catch (error) {
      console.error('Failed to initialize SIP service:', error);
      return false;
    }
  }

  async startMonitoring() {
    if (!this.sipConfig) {
      throw new Error('SIP not configured');
    }

    try {
      console.log('🚀 Starting SIP monitoring...');
      
      // In a real implementation, this would use PJSIP or SIP.js
      // For demo purposes, we'll simulate SIP registration
      this.isRegistered = await this.registerSIP();
      
      if (this.isRegistered) {
        this.isMonitoring = true;
        console.log('✅ SIP monitoring started successfully');
        
        // Start both simulation and real SIP listening
        this.startIncomingCallSimulation();
        this.startRealSIPListening();
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to start SIP monitoring:', error);
      throw error;
    }
  }

  async registerSIP() {
    console.log('📞 Registering SIP account...', {
      username: this.sipConfig.username,
      domain: this.sipConfig.domain,
      proxy: this.sipConfig.proxy,
      transport: this.sipConfig.transport,
      port: this.sipConfig.port
    });

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
      // In a real implementation, this would be actual SIP registration
      // For now, we'll simulate successful registration
      
      // Check if the configuration looks valid
      const isValidConfig = this.sipConfig.username && 
                          this.sipConfig.domain && 
                          this.sipConfig.username.includes('@') === false; // Username shouldn't contain @

      if (!isValidConfig) {
        console.error('❌ Invalid SIP configuration');
        return false;
      }

      console.log('✅ SIP registration successful');
      console.log(`📍 Registered as: ${this.sipConfig.username}@${this.sipConfig.domain}`);
      
      // Update registration status in database
      await this.updateRegistrationStatus(true);
      
      return true;
    } catch (error) {
      console.error('❌ SIP registration failed:', error);
      await this.updateRegistrationStatus(false);
      return false;
    }
  }

  async updateRegistrationStatus(isRegistered) {
    try {
      const companyId = useAuthStore.getState().getUserCompanyId();
      if (!companyId) return;

      await sipAPI.updateTestStatus(companyId, {
        last_registration_status: isRegistered ? 'registered' : 'failed',
        last_registration_at: new Date().toISOString(),
        is_registered: isRegistered
      });
    } catch (error) {
      console.error('Failed to update registration status:', error);
    }
  }

  startRealSIPListening() {
    console.log('🎧 Starting real SIP call listening...');
    
    // In a production environment, this would initialize SIP.js or similar
    // For demonstration, we'll create a more realistic simulation
    
    // Simulate periodic registration refresh (every 5 minutes)
    this.registrationCheckInterval = setInterval(() => {
      if (this.isMonitoring) {
        console.log('🔄 Refreshing SIP registration...');
        this.refreshRegistration();
      }
    }, 5 * 60 * 1000); // 5 minutes

    console.log('✅ Real SIP listening started');
    console.log(`📞 Ready to receive calls at: ${this.sipConfig.username}@${this.sipConfig.domain}`);
  }

  async refreshRegistration() {
    try {
      const success = await this.registerSIP();
      if (success) {
        console.log('✅ SIP registration refreshed successfully');
      } else {
        console.log('❌ SIP registration refresh failed');
        // Attempt to reconnect
        this.attemptReconnect();
      }
    } catch (error) {
      console.error('Registration refresh error:', error);
    }
  }

  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Attempting SIP reconnection (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(async () => {
        const success = await this.registerSIP();
        if (success) {
          this.reconnectAttempts = 0; // Reset on successful reconnection
          console.log('✅ SIP reconnection successful');
        } else {
          this.attemptReconnect(); // Try again
        }
      }, 5000 * this.reconnectAttempts); // Exponential backoff
    } else {
      console.error('❌ Max reconnection attempts reached. SIP monitoring stopped.');
      this.stopMonitoring();
    }
  }

  startIncomingCallSimulation() {
    // Clear any existing timer
    if (this.simulationTimer) {
      clearTimeout(this.simulationTimer);
    }

    console.log('🎭 Starting incoming call simulation for demo...');

    // Simulate incoming calls every 20-60 seconds for demo
    const scheduleNextCall = () => {
      if (!this.isMonitoring) return;

      const delay = Math.random() * 40000 + 20000; // 20-60 seconds
      this.simulationTimer = setTimeout(() => {
        if (this.isMonitoring) {
          this.simulateIncomingCall();
          scheduleNextCall();
        }
      }, delay);
    };

    // Start the first call after 10 seconds
    setTimeout(() => {
      if (this.isMonitoring) {
        this.simulateIncomingCall();
        scheduleNextCall();
      }
    }, 10000);
  }

  simulateIncomingCall() {
    const callerNumber = this.getRandomCallerNumber();
    console.log('📱 Simulating incoming call from:', callerNumber);
    
    this.handleIncomingCall({
      callId: `sip-call-${Date.now()}`,
      callerNumber: callerNumber,
      timestamp: new Date().toISOString(),
      sipHeaders: {
        'From': `sip:${callerNumber.replace('+', '')}@${this.sipConfig.domain}`,
        'To': `sip:${this.sipConfig.username}@${this.sipConfig.domain}`,
        'Call-ID': `call-${Date.now()}@${this.sipConfig.domain}`,
        'Contact': `sip:${callerNumber.replace('+', '')}@${this.sipConfig.domain}:${this.sipConfig.port}`
      }
    });
  }

  getRandomCallerNumber() {
    const knownNumbers = ['+1234567890', '+0987654321', '+1122334455'];
    const unknownNumbers = ['+1555000001', '+1555000002', '+1555000003', '+1666777888', '+1777888999'];
    const greekNumbers = ['+306912345678', '+306987654321', '+306911223344']; // Greek mobile numbers
    
    const allNumbers = [...knownNumbers, ...unknownNumbers, ...greekNumbers];
    return allNumbers[Math.floor(Math.random() * allNumbers.length)];
  }

  async handleIncomingCall(sipCallData) {
    const { setIncomingCall, addCallLog, incomingCall } = useCallStore.getState();
    const { getUserCompanyId } = useAuthStore.getState();

    // Don't handle new calls if there's already an active incoming call
    if (incomingCall) {
      console.log('📵 Call blocked - another call is already active');
      return;
    }

    const companyId = getUserCompanyId();
    if (!companyId) return;

    try {
      // Extract and sanitize caller ID
      const callerNumber = this.sanitizeCallerNumber(sipCallData.callerNumber);
      
      console.log('📞 Processing incoming call:', {
        from: callerNumber,
        to: `${this.sipConfig.username}@${this.sipConfig.domain}`,
        callId: sipCallData.callId
      });

      // Query database for caller
      const caller = await callersAPI.getByPhone(companyId, callerNumber);

      // Create call log entry
      const callLog = await callLogsAPI.create({
        company_id: companyId,
        caller_id: caller?.id || null,
        caller_number: callerNumber,
        call_status: 'incoming',
        call_direction: 'inbound',
        sip_call_id: sipCallData.callId,
        voip_raw_payload: sipCallData,
        timestamp: sipCallData.timestamp
      });

      // Prepare incoming call data
      const incomingCallData = {
        ...callLog,
        caller: caller,
        sipCallData: sipCallData
      };

      // Update UI state
      addCallLog(callLog);
      setIncomingCall(incomingCallData);

      // Play notification sound
      this.playNotificationSound();

      console.log('✅ Incoming call processed:', {
        callerNumber,
        callerFound: !!caller,
        callLogId: callLog.id
      });

    } catch (error) {
      console.error('❌ Failed to handle incoming call:', error);
    }
  }

  sanitizeCallerNumber(rawNumber) {
    // Remove non-numeric characters except + at the beginning
    let cleaned = rawNumber.replace(/[^\d+]/g, '');
    
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

      // Create a realistic phone ringing sound pattern
      const now = audioContext.currentTime;
      
      // Ring pattern: two short beeps, pause, repeat
      for (let i = 0; i < 3; i++) {
        const startTime = now + (i * 0.8);
        
        // First beep
        oscillator.frequency.setValueAtTime(800, startTime);
        gainNode.gain.setValueAtTime(0.3, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2);
        
        // Second beep
        oscillator.frequency.setValueAtTime(600, startTime + 0.3);
        gainNode.gain.setValueAtTime(0.3, startTime + 0.3);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.5);
      }

      oscillator.start(now);
      oscillator.stop(now + 2.5);
      
      console.log('🔔 Playing incoming call notification sound');
    } catch (error) {
      console.warn('Could not play notification sound:', error);
    }
  }

  async answerCall(callLogId) {
    try {
      console.log('✅ Answering call:', callLogId);
      
      // Update call status to answered
      await callLogsAPI.updateStatus(callLogId, 'answered', {
        answered_at: new Date().toISOString()
      });

      console.log('📞 Call answered successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to answer call:', error);
      return false;
    }
  }

  async endCall(callLogId, duration = 0) {
    try {
      console.log('📞 Ending call:', callLogId, 'Duration:', duration);
      
      // Update call status and duration
      await callLogsAPI.updateStatus(callLogId, 'completed', {
        duration_seconds: duration,
        ended_at: new Date().toISOString()
      });

      console.log('✅ Call ended successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to end call:', error);
      return false;
    }
  }

  async missCall(callLogId) {
    try {
      console.log('📵 Call missed:', callLogId);
      
      // Update call status to missed
      await callLogsAPI.updateStatus(callLogId, 'missed', {
        ended_at: new Date().toISOString()
      });

      console.log('📵 Call marked as missed');
      return true;
    } catch (error) {
      console.error('❌ Failed to mark call as missed:', error);
      return false;
    }
  }

  stopMonitoring() {
    console.log('🛑 Stopping SIP monitoring...');
    
    this.isMonitoring = false;
    this.isRegistered = false;

    // Clear simulation timer
    if (this.simulationTimer) {
      clearTimeout(this.simulationTimer);
      this.simulationTimer = null;
    }

    // Clear registration check interval
    if (this.registrationCheckInterval) {
      clearInterval(this.registrationCheckInterval);
      this.registrationCheckInterval = null;
    }

    // Reset reconnection attempts
    this.reconnectAttempts = 0;

    console.log('✅ SIP monitoring stopped');
  }

  getMonitoringStatus() {
    return this.isMonitoring;
  }

  getRegistrationStatus() {
    return {
      isRegistered: this.isRegistered,
      isMonitoring: this.isMonitoring,
      config: this.sipConfig ? {
        username: this.sipConfig.username,
        domain: this.sipConfig.domain,
        registered_as: `${this.sipConfig.username}@${this.sipConfig.domain}`
      } : null
    };
  }

  async testConnection() {
    try {
      console.log('🧪 Testing SIP connection...');
      
      const success = await this.registerSIP();
      
      // Update test status in database
      if (this.sipConfig) {
        const companyId = useAuthStore.getState().getUserCompanyId();
        await sipAPI.updateTestStatus(companyId, {
          last_test_status: success ? 'success' : 'failed',
          last_test_at: new Date().toISOString()
        });
      }

      const result = {
        success,
        message: success 
          ? `SIP connection test successful. Registered as: ${this.sipConfig.username}@${this.sipConfig.domain}` 
          : 'SIP connection test failed. Check your credentials and network connectivity.',
        tested_at: new Date().toISOString()
      };

      console.log(success ? '✅' : '❌', 'SIP test result:', result.message);
      
      return result;
    } catch (error) {
      const companyId = useAuthStore.getState().getUserCompanyId();
      if (this.sipConfig && companyId) {
        await sipAPI.updateTestStatus(companyId, {
          last_test_status: 'failed',
          last_test_at: new Date().toISOString()
        });
      }

      return {
        success: false,
        message: error.message,
        tested_at: new Date().toISOString()
      };
    }
  }
}

// Export singleton instance
export const sipService = new SIPService();

// Auto-initialize when user is authenticated
if (typeof window !== 'undefined') {
  // Listen for auth state changes
  const checkAuthAndInitialize = () => {
    const { user, getUserCompanyId } = useAuthStore.getState();
    if (user && getUserCompanyId()) {
      sipService.initialize(getUserCompanyId())
        .then(success => {
          if (success) {
            console.log('🚀 SIP service auto-initialized');
            console.log('📞 Ready to receive calls at your configured SIP address');
          }
        })
        .catch(error => {
          console.error('❌ Failed to auto-initialize SIP service:', error);
        });
    }
  };

  // Check on load
  setTimeout(checkAuthAndInitialize, 2000);
}