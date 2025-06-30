import { io } from 'socket.io-client';
import { useCallStore } from '../store/callStore';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3; // Reduced from 5
    this.isEnabled = false; // Add flag to control WebSocket usage
  }

  connect() {
    try {
      const { getUserCompanyId } = useAuthStore.getState();
      const companyId = getUserCompanyId();
      
      if (!companyId) {
        console.warn('No company ID available for WebSocket connection');
        return;
      }

      // Check if webhook server is available before attempting connection
      const serverUrl = import.meta.env.VITE_WEBHOOK_SERVER_URL || 'http://localhost:3000';
      
      // Only attempt connection if explicitly enabled or server is available
      if (!this.isEnabled) {
        console.log('📡 WebSocket service disabled - using webhook service for demo calls');
        this.isConnected = false;
        return;
      }

      console.log('🔄 Attempting WebSocket connection to:', serverUrl);

      this.socket = io(serverUrl, {
        transports: ['websocket', 'polling'],
        timeout: 10000, // Reduced timeout
        forceNew: true,
        autoConnect: false // Don't auto-connect
      });

      // Set a connection timeout
      const connectionTimeout = setTimeout(() => {
        if (!this.isConnected) {
          console.log('⏰ WebSocket connection timeout - falling back to demo mode');
          this.handleConnectionFailure();
        }
      }, 5000);

      this.socket.on('connect', () => {
        clearTimeout(connectionTimeout);
        console.log('✅ Connected to webhook server');
        this.isConnected = true;
        this.reconnectAttempts = 0;

        // Join company room for targeted notifications
        this.socket.emit('join-company', companyId);
        toast.success('Connected to webhook server - ready for real calls!', { duration: 3000 });
      });

      this.socket.on('disconnect', () => {
        clearTimeout(connectionTimeout);
        console.log('❌ Disconnected from webhook server');
        this.isConnected = false;
        // Don't auto-reconnect to avoid spam
      });

      this.socket.on('incoming-call', (callData) => {
        console.log('📞 Real-time incoming call received:', callData);
        this.handleIncomingCall(callData);
      });

      this.socket.on('connect_error', (error) => {
        clearTimeout(connectionTimeout);
        console.log('📡 WebSocket connection failed (expected in demo mode):', error.message);
        this.handleConnectionFailure();
      });

      // Attempt connection
      this.socket.connect();

    } catch (error) {
      console.log('📡 WebSocket initialization failed (using demo mode):', error.message);
      this.handleConnectionFailure();
    }
  }

  handleConnectionFailure() {
    this.isConnected = false;
    this.isEnabled = false;
    
    // Don't show error toast if we haven't attempted many connections
    if (this.reconnectAttempts < 2) {
      console.log('📡 WebSocket unavailable - using demo mode for incoming calls');
    }
    
    // Clean up socket
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  handleIncomingCall(callData) {
    const { setIncomingCall, addCallLog, incomingCall } = useCallStore.getState();

    // Don't handle new calls if there's already an active incoming call
    if (incomingCall) {
      console.log('📵 Real webhook call blocked - another call is already active');
      toast.warning('Incoming call blocked - another call is active', { duration: 2000 });
      return;
    }

    try {
      // Update UI state
      addCallLog(callData);
      setIncomingCall(callData);

      // Play notification sound
      this.playNotificationSound();

      // Show success notification
      const callerName = callData.caller?.name || 'Unknown Caller';
      toast.success(`📞 Real incoming call from ${callerName} (${callData.caller_number})`, { duration: 4000 });

      console.log('✅ Real webhook call processed successfully');
    } catch (error) {
      console.error('❌ Failed to handle real incoming call:', error);
      toast.error(`Failed to process real call: ${error.message}`, { duration: 4000 });
    }
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
      for (let i = 0; i < 4; i++) {
        const startTime = now + (i * 1);
        oscillator.frequency.setValueAtTime(800, startTime);
        gainNode.gain.setValueAtTime(0.3, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);
      }

      oscillator.start(now);
      oscillator.stop(now + 4);

      console.log('🔔 Playing real call notification');
    } catch (error) {
      console.warn('Could not play notification sound:', error);
    }
  }

  // Enable WebSocket for real mode
  enable() {
    this.isEnabled = true;
    this.connect();
  }

  // Disable WebSocket
  disable() {
    this.isEnabled = false;
    this.disconnect();
  }

  scheduleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts && this.isEnabled) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000); // Max 10 seconds
      
      console.log(`🔄 Scheduling WebSocket reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
      
      setTimeout(() => {
        if (this.isEnabled) {
          this.connect();
        }
      }, delay);
    } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('❌ Max WebSocket reconnection attempts reached - staying in demo mode');
      this.isEnabled = false;
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
  }

  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      isEnabled: this.isEnabled,
      reconnectAttempts: this.reconnectAttempts
    };
  }

  // Method to test if webhook server is available
  async testServerAvailability() {
    const serverUrl = import.meta.env.VITE_WEBHOOK_SERVER_URL || 'http://localhost:3000';
    
    try {
      const response = await fetch(`${serverUrl}/api/health`, {
        method: 'GET',
        timeout: 5000
      });
      
      if (response.ok) {
        console.log('✅ Webhook server is available');
        return true;
      } else {
        console.log('⚠️ Webhook server responded but not healthy');
        return false;
      }
    } catch (error) {
      console.log('📡 Webhook server not available:', error.message);
      return false;
    }
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();

// Don't auto-connect - let the webhook service decide when to use WebSocket
console.log('📡 WebSocket service initialized - ready for manual activation');