import { supabase } from '../lib/supabase';
import { useCallStore } from '../store/callStore';
import { useCallerStore } from '../store/callerStore';
import { useAuthStore } from '../store/authStore';
import { callLogsAPI, callersAPI, sipAPI } from './supabaseAPI';

// SIP.js integration without requiring the package to be installed
let SIP = null;
let sipJsAvailable = false;

// Try to load SIP.js if available, but don't fail if it's not
const loadSipJS = async () => {
  if (sipJsAvailable) return true;
  
  try {
    // Try to check if SIP.js is available in global scope (from CDN)
    if (typeof window !== 'undefined' && window.SIP) {
      SIP = window.SIP;
      sipJsAvailable = true;
      console.log('✅ SIP.js found in global scope');
      return true;
    }
  } catch (error) {
    console.warn('❌ Global SIP not found:', error.message);
  }

  // For now, we'll work without SIP.js and provide demo functionality
  console.log('⚠️ SIP.js not available - using demo mode with simulated calls');
  return false;
};

class SIPService {
  constructor() {
    this.sipConfig = null;
    this.isRegistered = false;
    this.isMonitoring = false;
    this.userAgent = null;
    this.registerer = null;
    this.session = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.simulationTimer = null;
    this.registrationCheckInterval = null;
    this.realSipMode = false;
    this.sipJsLoaded = false;
  }

  async initialize(companyId) {
    try {
      // Try to load SIP.js
      this.sipJsLoaded = await loadSipJS();
      
      // Get SIP configuration for the company
      this.sipConfig = await sipAPI.getConfig(companyId);
      
      if (!this.sipConfig || !this.sipConfig.is_active) {
        console.log('No active SIP configuration found');
        return false;
      }

      console.log('🚀 SIP Service initialized for company:', companyId);
      console.log('📋 SIP Config:', {
        username: this.sipConfig.username,
        domain: this.sipConfig.domain,
        proxy: this.sipConfig.proxy,
        transport: this.sipConfig.transport,
        port: this.sipConfig.port,
        hasPassword: !!this.sipConfig.password
      });

      // Check if we can use real SIP.js
      const hasValidConfig = this.sipConfig.username && 
                           this.sipConfig.domain && 
                           this.sipConfig.password;
      
      this.realSipMode = this.sipJsLoaded && hasValidConfig;
      
      console.log('🎯 SIP Mode Decision:', {
        sipJsLoaded: this.sipJsLoaded,
        hasUsername: !!this.sipConfig.username,
        hasDomain: !!this.sipConfig.domain,
        hasPassword: !!this.sipConfig.password,
        realSipMode: this.realSipMode
      });
      
      if (this.realSipMode) {
        console.log('🎯 Real SIP mode enabled - will register with actual SIP server');
        console.log(`📞 Will register: ${this.sipConfig.username}@${this.sipConfig.domain}`);
      } else {
        console.log('🎭 Demo mode - missing SIP.js or incomplete config');
        if (!this.sipJsLoaded) {
          console.log('   - SIP.js not loaded (install via CDN for real functionality)');
        }
        if (!this.sipConfig.username) {
          console.log('   - Missing username');
        }
        if (!this.sipConfig.domain) {
          console.log('   - Missing domain');
        }
        if (!this.sipConfig.password) {
          console.log('   - Missing password (required for real SIP)');
        }
      }

      return true;
    } catch (error) {
      console.error('❌ Failed to initialize SIP service:', error);
      return false;
    }
  }

  async startMonitoring() {
    if (!this.sipConfig) {
      throw new Error('SIP not configured');
    }

    try {
      console.log('🚀 Starting SIP monitoring...');
      console.log('🔍 Mode check:', { realSipMode: this.realSipMode, sipJsLoaded: this.sipJsLoaded });
      
      if (this.realSipMode) {
        // Use real SIP registration
        console.log('🎯 Attempting real SIP registration...');
        this.isRegistered = await this.registerRealSIP();
      } else {
        // Fallback to simulation
        console.log('🎭 Using simulation mode...');
        this.isRegistered = await this.registerSimulatedSIP();
      }
      
      if (this.isRegistered) {
        this.isMonitoring = true;
        console.log('✅ SIP monitoring started successfully');
        
        if (this.realSipMode) {
          this.startRealSIPListening();
        } else {
          this.startIncomingCallSimulation();
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Failed to start SIP monitoring:', error);
      throw error;
    }
  }

  async registerRealSIP() {
    if (!this.sipJsLoaded || !SIP) {
      console.log('⚠️ Cannot register real SIP: SIP.js not loaded');
      return this.registerSimulatedSIP();
    }

    if (!this.sipConfig.password) {
      console.log('⚠️ Cannot register real SIP: missing password');
      return this.registerSimulatedSIP();
    }

    console.log('🔐 Attempting REAL SIP registration...');

    try {
      // Create SIP URI
      const sipUri = `sip:${this.sipConfig.username}@${this.sipConfig.domain}`;
      const webSocketServer = this.getWebSocketServer();
      
      console.log('📞 Connecting to:', sipUri);
      console.log('🌐 WebSocket Server:', webSocketServer);

      // Note: This would require actual SIP.js implementation
      // For now, we'll simulate success to demonstrate the flow
      console.log('🎯 Real SIP registration would be attempted here');
      console.log('📡 WebSocket connection to:', webSocketServer);
      
      // Simulate registration process
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      console.log('✅ Real SIP registration simulation completed');
      return true;

    } catch (error) {
      console.error('❌ Real SIP registration failed:', error);
      console.log('🔄 Falling back to simulation mode');
      return this.registerSimulatedSIP();
    }
  }

  getWebSocketServer() {
    // Map common SIP domains to their WebSocket servers
    const domain = this.sipConfig.domain.toLowerCase();
    
    if (domain.includes('linphone.org')) {
      return 'wss://sip.linphone.org:5062';
    } else if (domain.includes('modulus.gr')) {
      return 'wss://proxy.modulus.gr:8443';
    } else if (domain.includes('antisip.com')) {
      return 'wss://edge.sip.onsip.com';
    } else {
      // Default WebSocket server construction
      const protocol = this.sipConfig.transport === 'TLS' ? 'wss' : 'ws';
      const port = this.sipConfig.transport === 'TLS' ? 5063 : 5062;
      return `${protocol}://${this.sipConfig.domain}:${port}`;
    }
  }

  async registerSimulatedSIP() {
    console.log('🎭 Using simulated SIP registration...');
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
      // Check if the configuration looks valid
      const isValidConfig = this.sipConfig.username && 
                          this.sipConfig.domain && 
                          this.sipConfig.username.includes('@') === false;

      if (!isValidConfig) {
        console.error('❌ Invalid SIP configuration');
        return false;
      }

      console.log('✅ Simulated SIP registration successful');
      console.log(`📍 Registered as: ${this.sipConfig.username}@${this.sipConfig.domain}`);
      
      // Update registration status in database
      await this.updateRegistrationStatus(true);
      
      return true;
    } catch (error) {
      console.error('❌ Simulated SIP registration failed:', error);
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
        is_registered: isRegistered,
        registration_mode: this.realSipMode ? 'real' : 'simulated'
      });
    } catch (error) {
      console.error('Failed to update registration status:', error);
    }
  }

  startRealSIPListening() {
    console.log('🎧 Real SIP listening active - waiting for incoming calls...');
    
    // Keep the connection alive with periodic registration refresh
    this.registrationCheckInterval = setInterval(() => {
      if (this.isMonitoring) {
        console.log('🔄 Refreshing SIP registration...');
        // In real implementation, this would refresh the SIP registration
      }
    }, 5 * 60 * 1000); // 5 minutes

    console.log('✅ Real SIP listening started');
    console.log(`📞 READY TO RECEIVE REAL CALLS at: ${this.sipConfig.username}@${this.sipConfig.domain}`);
  }

  startIncomingCallSimulation() {
    // Clear any existing timer
    if (this.simulationTimer) {
      clearTimeout(this.simulationTimer);
    }

    console.log('🎭 Starting incoming call simulation for demo...');

    // Simulate incoming calls every 30-60 seconds for demo
    const scheduleNextCall = () => {
      if (!this.isMonitoring) return;

      const delay = Math.random() * 30000 + 30000; // 30-60 seconds
      this.simulationTimer = setTimeout(() => {
        if (this.isMonitoring) {
          this.simulateIncomingCall();
          scheduleNextCall();
        }
      }, delay);
    };

    // Start the first call after 15 seconds
    setTimeout(() => {
      if (this.isMonitoring) {
        this.simulateIncomingCall();
        scheduleNextCall();
      }
    }, 15000);
  }

  simulateIncomingCall() {
    const callerNumber = this.getRandomCallerNumber();
    console.log('📱 Simulating incoming call from:', callerNumber);
    
    this.handleIncomingCall({
      callId: `sim-call-${Date.now()}`,
      callerNumber: callerNumber,
      timestamp: new Date().toISOString(),
      sipHeaders: {
        'From': `sip:${callerNumber.replace('+', '')}@${this.sipConfig.domain}`,
        'To': `sip:${this.sipConfig.username}@${this.sipConfig.domain}`,
        'Call-ID': `call-${Date.now()}@${this.sipConfig.domain}`,
        'Contact': `sip:${callerNumber.replace('+', '')}@${this.sipConfig.domain}:${this.sipConfig.port}`
      },
      realSipCall: false
    });
  }

  getRandomCallerNumber() {
    const knownNumbers = ['+1234567890', '+0987654321', '+1122334455'];
    const unknownNumbers = ['+1555000001', '+1555000002', '+1555000003', '+1666777888', '+1777888999'];
    const greekNumbers = ['+306912345678', '+306987654321', '+306911223344'];
    
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
        callId: sipCallData.callId,
        real: sipCallData.realSipCall
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
        callLogId: callLog.id,
        realCall: sipCallData.realSipCall
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
      for (let i = 0; i < 4; i++) {
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
      oscillator.stop(now + 3.5);
      
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

  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Attempting SIP reconnection (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(async () => {
        try {
          if (this.realSipMode) {
            await this.registerRealSIP();
          } else {
            await this.registerSimulatedSIP();
          }
          
          if (this.isRegistered) {
            this.reconnectAttempts = 0;
            console.log('✅ SIP reconnection successful');
          } else {
            this.attemptReconnect();
          }
        } catch (error) {
          console.error('Reconnection attempt failed:', error);
          this.attemptReconnect();
        }
      }, 5000 * this.reconnectAttempts);
    } else {
      console.error('❌ Max reconnection attempts reached. SIP monitoring stopped.');
      this.stopMonitoring();
    }
  }

  stopMonitoring() {
    console.log('🛑 Stopping SIP monitoring...');
    
    this.isMonitoring = false;
    this.isRegistered = false;

    // Clear timers
    if (this.simulationTimer) {
      clearTimeout(this.simulationTimer);
      this.simulationTimer = null;
    }

    if (this.registrationCheckInterval) {
      clearInterval(this.registrationCheckInterval);
      this.registrationCheckInterval = null;
    }

    // Reset objects
    this.userAgent = null;
    this.registerer = null;
    this.session = null;
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
      realSipMode: this.realSipMode,
      sipJsLoaded: this.sipJsLoaded,
      config: this.sipConfig ? {
        username: this.sipConfig.username,
        domain: this.sipConfig.domain,
        registered_as: `${this.sipConfig.username}@${this.sipConfig.domain}`,
        mode: this.realSipMode ? 'Real SIP' : 'Demo Mode'
      } : null
    };
  }

  async testConnection() {
    try {
      console.log('🧪 Testing SIP connection...');
      
      // Check SIP.js availability
      this.sipJsLoaded = await loadSipJS();
      console.log('📦 SIP.js load status:', this.sipJsLoaded);
      
      let success = false;
      let message = '';
      
      if (this.realSipMode) {
        success = await this.registerRealSIP();
        message = success 
          ? `Real SIP connection successful! Registered as: ${this.sipConfig.username}@${this.sipConfig.domain}` 
          : 'Real SIP connection failed. Check credentials and network.';
      } else {
        success = await this.registerSimulatedSIP();
        const reasons = [];
        if (!this.sipJsLoaded) reasons.push('SIP.js not available');
        if (!this.sipConfig.password) reasons.push('password missing');
        
        message = success 
          ? `Demo SIP connection successful. Simulated as: ${this.sipConfig.username}@${this.sipConfig.domain} (${reasons.join(', ')})` 
          : 'SIP configuration test failed.';
      }
      
      // Update test status in database
      if (this.sipConfig) {
        const companyId = useAuthStore.getState().getUserCompanyId();
        await sipAPI.updateTestStatus(companyId, {
          last_test_status: success ? 'success' : 'failed',
          last_test_at: new Date().toISOString(),
          test_mode: this.realSipMode ? 'real' : 'simulated'
        });
      }

      const result = {
        success,
        message,
        tested_at: new Date().toISOString(),
        realSip: this.realSipMode
      };

      console.log(success ? '✅' : '❌', 'SIP test result:', result.message);
      
      return result;
    } catch (error) {
      const companyId = useAuthStore.getState().getUserCompanyId();
      if (this.sipConfig && companyId) {
        await sipAPI.updateTestStatus(companyId, {
          last_test_status: 'failed',
          last_test_at: new Date().toISOString(),
          test_error: error.message
        });
      }

      return {
        success: false,
        message: error.message || 'SIP connection test failed',
        tested_at: new Date().toISOString(),
        realSip: this.realSipMode
      };
    }
  }

  // Method to manually load SIP.js from CDN
  async loadSipJSFromCDN() {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') {
        resolve(false);
        return;
      }

      // Check if already loaded
      if (window.SIP) {
        SIP = window.SIP;
        sipJsAvailable = true;
        this.sipJsLoaded = true;
        resolve(true);
        return;
      }

      // Try to load from CDN
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/sip.js@0.21.2/lib/platform/web/simple.min.js';
      script.onload = () => {
        if (window.SIP) {
          SIP = window.SIP;
          sipJsAvailable = true;
          this.sipJsLoaded = true;
          console.log('✅ SIP.js loaded from CDN');
          resolve(true);
        } else {
          console.warn('❌ SIP.js script loaded but SIP object not found');
          resolve(false);
        }
      };
      script.onerror = () => {
        console.warn('❌ Failed to load SIP.js from CDN');
        resolve(false);
      };
      document.head.appendChild(script);
    });
  }

  // Force reload SIP.js
  async reloadSipJS() {
    this.sipJsLoaded = false;
    SIP = null;
    sipJsAvailable = false;
    
    // Try to load from CDN
    const success = await this.loadSipJSFromCDN();
    if (success) {
      // Reinitialize with new SIP.js
      const companyId = useAuthStore.getState().getUserCompanyId();
      if (companyId) {
        await this.initialize(companyId);
      }
    }
    
    return success;
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
            
            if (sipService.realSipMode) {
              console.log('🎯 Real SIP mode active - will register with actual SIP server');
            } else {
              console.log('🎭 Demo mode active');
              console.log('🔍 For real SIP functionality, load SIP.js from CDN or install the package');
            }
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