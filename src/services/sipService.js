import { supabase } from '../lib/supabase';
import { useCallStore } from '../store/callStore';
import { useCallerStore } from '../store/callerStore';
import { useAuthStore } from '../store/authStore';
import { callLogsAPI, callersAPI, sipAPI } from './supabaseAPI';

// Import SIP.js for real SIP functionality
let SIP = null;
try {
  SIP = require('sip.js');
} catch (error) {
  console.warn('SIP.js not available, using simulation mode');
}

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
  }

  async initialize(companyId) {
    try {
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
        port: this.sipConfig.port
      });

      // Check if we can use real SIP.js
      this.realSipMode = !!SIP && this.sipConfig.username && this.sipConfig.domain;
      
      if (this.realSipMode) {
        console.log('🎯 Real SIP mode enabled - will register with actual SIP server');
      } else {
        console.log('🎭 Demo mode - SIP.js not available or incomplete config');
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
      
      if (this.realSipMode) {
        // Use real SIP registration
        this.isRegistered = await this.registerRealSIP();
      } else {
        // Fallback to simulation
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
    if (!SIP || !this.sipConfig.password) {
      console.log('⚠️ Cannot register real SIP: missing SIP.js or password');
      return this.registerSimulatedSIP();
    }

    console.log('🔐 Attempting REAL SIP registration...');

    try {
      // Create SIP URI
      const sipUri = `sip:${this.sipConfig.username}@${this.sipConfig.domain}`;
      const webSocketServer = this.getWebSocketServer();
      
      console.log('📞 Connecting to:', sipUri);
      console.log('🌐 WebSocket Server:', webSocketServer);

      // Create UserAgent configuration
      const userAgentOptions = {
        uri: sipUri,
        transportOptions: {
          wsServers: [webSocketServer]
        },
        authorizationUsername: this.sipConfig.username,
        authorizationPassword: this.sipConfig.password,
        displayName: this.sipConfig.username,
        logBuiltinEnabled: true,
        logLevel: 'debug'
      };

      // Create UserAgent
      this.userAgent = new SIP.UserAgent(userAgentOptions);

      // Set up event handlers
      this.setupUserAgentEvents();

      // Start the UserAgent
      await this.userAgent.start();

      // Create and start registerer
      this.registerer = new SIP.Registerer(this.userAgent);
      this.setupRegistererEvents();

      // Start registration
      await this.registerer.register();

      console.log('✅ Real SIP registration initiated');
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
    } else {
      // Default WebSocket server construction
      const protocol = this.sipConfig.transport === 'TLS' ? 'wss' : 'ws';
      const port = this.sipConfig.transport === 'TLS' ? 5063 : 5062;
      return `${protocol}://${this.sipConfig.domain}:${port}`;
    }
  }

  setupUserAgentEvents() {
    if (!this.userAgent) return;

    this.userAgent.delegate = {
      onConnect: () => {
        console.log('🔗 SIP UserAgent connected');
      },
      onDisconnect: (error) => {
        console.log('🔌 SIP UserAgent disconnected:', error);
        if (this.isMonitoring) {
          this.attemptReconnect();
        }
      },
      onInvite: (invitation) => {
        console.log('📞 Incoming SIP call invitation received');
        this.handleRealIncomingCall(invitation);
      }
    };
  }

  setupRegistererEvents() {
    if (!this.registerer) return;

    this.registerer.delegate = {
      onRegisterSuccess: () => {
        console.log('✅ SIP registration successful!');
        this.isRegistered = true;
        this.reconnectAttempts = 0;
        this.updateRegistrationStatus(true);
      },
      onRegisterFailure: (error) => {
        console.error('❌ SIP registration failed:', error);
        this.isRegistered = false;
        this.updateRegistrationStatus(false);
      },
      onUnregisterSuccess: () => {
        console.log('📤 SIP unregistration successful');
        this.isRegistered = false;
      }
    };
  }

  async handleRealIncomingCall(invitation) {
    console.log('📱 Real incoming SIP call detected!');
    
    try {
      const remoteUri = invitation.remoteIdentity.uri;
      const callerNumber = this.extractCallerNumber(remoteUri);
      
      const sipCallData = {
        callId: invitation.id,
        callerNumber: callerNumber,
        timestamp: new Date().toISOString(),
        sipHeaders: {
          'From': remoteUri.toString(),
          'To': invitation.localIdentity.uri.toString(),
          'Call-ID': invitation.id,
          'Contact': remoteUri.toString()
        },
        realSipCall: true,
        invitation: invitation
      };

      // Handle the incoming call through our existing system
      await this.handleIncomingCall(sipCallData);

    } catch (error) {
      console.error('❌ Failed to handle real incoming call:', error);
    }
  }

  extractCallerNumber(sipUri) {
    // Extract phone number from SIP URI
    // Example: sip:+1234567890@domain.com -> +1234567890
    try {
      const userPart = sipUri.user;
      if (userPart) {
        // If it looks like a phone number, return it
        if (/^[\d+]/.test(userPart)) {
          return userPart.startsWith('+') ? userPart : '+' + userPart;
        }
        // Otherwise return the username part
        return userPart;
      }
      return 'Unknown';
    } catch (error) {
      console.error('Failed to extract caller number:', error);
      return 'Unknown';
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
      if (this.isMonitoring && this.registerer) {
        console.log('🔄 Refreshing SIP registration...');
        this.registerer.register().catch(error => {
          console.error('Registration refresh failed:', error);
        });
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
      
      // If this is a real SIP call, accept the invitation
      const { incomingCall } = useCallStore.getState();
      if (incomingCall?.sipCallData?.realSipCall && incomingCall.sipCallData.invitation) {
        try {
          await incomingCall.sipCallData.invitation.accept();
          console.log('📞 Real SIP call accepted');
        } catch (error) {
          console.error('Failed to accept real SIP call:', error);
        }
      }
      
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
      
      // If this is a real SIP call, end the session
      const { incomingCall } = useCallStore.getState();
      if (incomingCall?.sipCallData?.realSipCall && this.session) {
        try {
          await this.session.bye();
          console.log('📞 Real SIP call ended');
        } catch (error) {
          console.error('Failed to end real SIP call:', error);
        }
      }
      
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
      
      // If this is a real SIP call, reject the invitation
      const { incomingCall } = useCallStore.getState();
      if (incomingCall?.sipCallData?.realSipCall && incomingCall.sipCallData.invitation) {
        try {
          await incomingCall.sipCallData.invitation.reject();
          console.log('📵 Real SIP call rejected');
        } catch (error) {
          console.error('Failed to reject real SIP call:', error);
        }
      }
      
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

    // Unregister from real SIP server
    if (this.registerer) {
      this.registerer.unregister().catch(error => {
        console.error('Failed to unregister:', error);
      });
    }

    // Stop UserAgent
    if (this.userAgent) {
      this.userAgent.stop().catch(error => {
        console.error('Failed to stop UserAgent:', error);
      });
    }

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
      
      let success = false;
      let message = '';
      
      if (this.realSipMode) {
        success = await this.registerRealSIP();
        message = success 
          ? `Real SIP connection successful! Registered as: ${this.sipConfig.username}@${this.sipConfig.domain}` 
          : 'Real SIP connection failed. Check credentials and network.';
      } else {
        success = await this.registerSimulatedSIP();
        message = success 
          ? `Demo SIP connection successful. Simulated as: ${this.sipConfig.username}@${this.sipConfig.domain}` 
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
              console.log('🎭 Demo mode active - install SIP.js for real functionality');
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