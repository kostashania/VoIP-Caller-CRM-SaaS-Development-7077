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
      // In a real implementation, this would use PJSIP or SIP.js
      // For demo purposes, we'll simulate SIP registration
      this.isRegistered = await this.registerSIP();
      
      if (this.isRegistered) {
        this.isMonitoring = true;
        this.startIncomingCallSimulation();
        console.log('SIP monitoring started');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to start SIP monitoring:', error);
      throw error;
    }
  }

  async registerSIP() {
    console.log('Registering SIP account...', {
      username: this.sipConfig.username,
      domain: this.sipConfig.domain,
      proxy: this.sipConfig.proxy,
      transport: this.sipConfig.transport,
      port: this.sipConfig.port
    });

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Always succeed for demo - in production this would be real SIP registration
    console.log('SIP registration successful');
    return true;
  }

  startIncomingCallSimulation() {
    // Clear any existing timer
    if (this.simulationTimer) {
      clearTimeout(this.simulationTimer);
    }

    // Simulate incoming calls every 15-30 seconds for demo
    const scheduleNextCall = () => {
      if (!this.isMonitoring) return;
      
      const delay = Math.random() * 15000 + 15000; // 15-30 seconds
      
      this.simulationTimer = setTimeout(() => {
        if (this.isMonitoring) {
          this.handleIncomingCall({
            callId: `sip-call-${Date.now()}`,
            callerNumber: this.getRandomCallerNumber(),
            timestamp: new Date().toISOString(),
            sipHeaders: {
              'From': `sip:${this.getRandomCallerNumber()}@${this.sipConfig.domain}`,
              'To': `sip:${this.sipConfig.username}@${this.sipConfig.domain}`,
              'Call-ID': `call-${Date.now()}@${this.sipConfig.domain}`
            }
          });
          
          // Schedule next call
          scheduleNextCall();
        }
      }, delay);
    };
    
    // Start the first call after 5 seconds
    setTimeout(() => {
      if (this.isMonitoring) {
        this.handleIncomingCall({
          callId: `sip-call-${Date.now()}`,
          callerNumber: this.getRandomCallerNumber(),
          timestamp: new Date().toISOString(),
          sipHeaders: {
            'From': `sip:${this.getRandomCallerNumber()}@${this.sipConfig.domain}`,
            'To': `sip:${this.sipConfig.username}@${this.sipConfig.domain}`,
            'Call-ID': `call-${Date.now()}@${this.sipConfig.domain}`
          }
        });
        
        scheduleNextCall();
      }
    }, 5000);
  }

  getRandomCallerNumber() {
    const knownNumbers = ['+1234567890', '+0987654321', '+1122334455'];
    const unknownNumbers = ['+1555000001', '+1555000002', '+1555000003', '+1666777888'];
    const allNumbers = [...knownNumbers, ...unknownNumbers];
    
    return allNumbers[Math.floor(Math.random() * allNumbers.length)];
  }

  async handleIncomingCall(sipCallData) {
    const { setIncomingCall, addCallLog, incomingCall } = useCallStore.getState();
    const { getUserCompanyId } = useAuthStore.getState();

    // Don't handle new calls if there's already an active incoming call
    if (incomingCall) {
      console.log('Call blocked - another call is already active');
      return;
    }

    const companyId = getUserCompanyId();
    if (!companyId) return;

    try {
      // Extract and sanitize caller ID
      const callerNumber = this.sanitizeCallerNumber(sipCallData.callerNumber);
      
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

      console.log('Incoming call processed:', {
        callerNumber,
        callerFound: !!caller,
        callLogId: callLog.id
      });

    } catch (error) {
      console.error('Failed to handle incoming call:', error);
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
      
      // Create a ringing sound pattern
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.2);
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.4);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.8);
    } catch (error) {
      console.warn('Could not play notification sound:', error);
    }
  }

  async answerCall(callLogId) {
    try {
      // Update call status to answered
      await callLogsAPI.updateStatus(callLogId, 'answered', {
        answered_at: new Date().toISOString()
      });
      
      console.log('Call answered:', callLogId);
      return true;
    } catch (error) {
      console.error('Failed to answer call:', error);
      return false;
    }
  }

  async endCall(callLogId, duration = 0) {
    try {
      // Update call status and duration
      await callLogsAPI.updateStatus(callLogId, 'completed', {
        duration_seconds: duration,
        ended_at: new Date().toISOString()
      });
      
      console.log('Call ended:', callLogId, 'Duration:', duration);
      return true;
    } catch (error) {
      console.error('Failed to end call:', error);
      return false;
    }
  }

  async missCall(callLogId) {
    try {
      // Update call status to missed
      await callLogsAPI.updateStatus(callLogId, 'missed', {
        ended_at: new Date().toISOString()
      });
      
      console.log('Call missed:', callLogId);
      return true;
    } catch (error) {
      console.error('Failed to mark call as missed:', error);
      return false;
    }
  }

  stopMonitoring() {
    this.isMonitoring = false;
    this.isRegistered = false;
    
    // Clear simulation timer
    if (this.simulationTimer) {
      clearTimeout(this.simulationTimer);
      this.simulationTimer = null;
    }
    
    console.log('SIP monitoring stopped');
  }

  getMonitoringStatus() {
    return this.isMonitoring;
  }

  async testConnection() {
    try {
      const success = await this.registerSIP();
      
      // Update test status in database
      if (this.sipConfig) {
        await sipAPI.updateTestStatus(this.sipConfig.company_id, {
          last_test_status: success ? 'success' : 'failed',
          last_test_at: new Date().toISOString()
        });
      }
      
      return {
        success,
        message: success ? 'SIP connection test successful' : 'SIP connection test failed',
        tested_at: new Date().toISOString()
      };
    } catch (error) {
      if (this.sipConfig) {
        await sipAPI.updateTestStatus(this.sipConfig.company_id, {
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
            console.log('SIP service auto-initialized');
          }
        })
        .catch(error => {
          console.error('Failed to auto-initialize SIP service:', error);
        });
    }
  };
  
  // Check on load
  setTimeout(checkAuthAndInitialize, 2000);
}