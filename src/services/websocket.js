// Legacy websocket service - keeping for compatibility
import { useCallStore } from '../store/callStore';
import { useCallerStore } from '../store/callerStore';
import { useAuthStore } from '../store/authStore';

class WebSocketService {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 5000;
  }

  connect() {
    try {
      console.log('📡 WebSocket service initialized (demo mode)');
      // Mock WebSocket connection for demo
      // In production, replace with actual WebSocket URL
      this.simulateIncomingCalls();
    } catch (error) {
      console.error('WebSocket connection failed:', error);
      this.scheduleReconnect();
    }
  }

  simulateIncomingCalls() {
    // Simulate incoming calls every 45 seconds for demo
    setInterval(() => {
      if (Math.random() > 0.8) { // 20% chance of incoming call
        this.handleIncomingCall({
          id: Date.now(),
          caller_number: this.getRandomPhoneNumber(),
          timestamp: new Date().toISOString(),
          call_status: 'incoming'
        });
      }
    }, 45000);
  }

  getRandomPhoneNumber() {
    const numbers = ['+1234567890', '+0987654321', '+1122334455'];
    return numbers[Math.floor(Math.random() * numbers.length)];
  }

  async handleIncomingCall(callData) {
    const { setIncomingCall, addCall } = useCallStore.getState();
    const { getUserCompanyId } = useAuthStore.getState();
    
    const companyId = getUserCompanyId();
    if (!companyId) return;

    try {
      console.log('📞 Demo incoming call:', callData);
      // For demo purposes, we'll use the webhook service instead
    } catch (error) {
      console.error('Failed to handle incoming call:', error);
    }
  }

  scheduleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        this.reconnectAttempts++;
        this.connect();
      }, this.reconnectInterval);
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const websocketService = new WebSocketService();

// Auto-connect when service is imported
if (typeof window !== 'undefined') {
  websocketService.connect();
}