import { io } from 'socket.io-client';
import { useCallStore } from '../store/callStore';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  connect() {
    try {
      const { getUserCompanyId } = useAuthStore.getState();
      const companyId = getUserCompanyId();
      
      if (!companyId) {
        console.warn('No company ID available for WebSocket connection');
        return;
      }

      // Connect to webhook server
      const serverUrl = import.meta.env.VITE_WEBHOOK_SERVER_URL || 'http://localhost:3000';
      
      this.socket = io(serverUrl, {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true
      });

      this.socket.on('connect', () => {
        console.log('✅ Connected to webhook server');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // Join company room for targeted notifications
        this.socket.emit('join-company', companyId);
        
        toast.success('Connected to webhook server - ready for real calls!', { duration: 3000 });
      });

      this.socket.on('disconnect', () => {
        console.log('❌ Disconnected from webhook server');
        this.isConnected = false;
        this.scheduleReconnect();
      });

      this.socket.on('incoming-call', (callData) => {
        console.log('📞 Real-time incoming call received:', callData);
        this.handleIncomingCall(callData);
      });

      this.socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        this.isConnected = false;
        this.scheduleReconnect();
      });

    } catch (error) {
      console.error('Failed to initialize WebSocket connection:', error);
      this.scheduleReconnect();
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
      toast.success(`📞 Real incoming call from ${callerName} (${callData.caller_number})`, {
        duration: 4000
      });

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

  scheduleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      
      console.log(`🔄 Scheduling WebSocket reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
      
      setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      console.error('❌ Max WebSocket reconnection attempts reached');
      toast.error('Lost connection to webhook server. Please refresh the page.', { duration: 5000 });
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
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();

// Auto-connect when user is authenticated
if (typeof window !== 'undefined') {
  // Listen for auth state changes
  const checkAuthAndConnect = () => {
    const { user } = useAuthStore.getState();
    if (user) {
      // Connect after a short delay to ensure everything is ready
      setTimeout(() => {
        websocketService.connect();
      }, 2000);
    }
  };

  // Check on load
  setTimeout(checkAuthAndConnect, 1000);
}