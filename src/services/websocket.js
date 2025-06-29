import { useCallStore } from '../store/callStore';
import { useCallerStore } from '../store/callerStore';

class WebSocketService {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 5000;
  }

  connect() {
    try {
      // Mock WebSocket connection for demo
      // In production, replace with actual WebSocket URL
      // this.ws = new WebSocket('ws://localhost:3001/ws');
      
      // Mock incoming calls for demo
      this.simulateIncomingCalls();
      
    } catch (error) {
      console.error('WebSocket connection failed:', error);
      this.scheduleReconnect();
    }
  }

  simulateIncomingCalls() {
    // Simulate incoming calls every 30 seconds for demo
    setInterval(() => {
      if (Math.random() > 0.7) { // 30% chance of incoming call
        this.handleIncomingCall({
          id: Date.now(),
          caller_number: this.getRandomPhoneNumber(),
          timestamp: new Date().toISOString(),
          call_status: 'incoming'
        });
      }
    }, 30000);
  }

  getRandomPhoneNumber() {
    const numbers = ['+1234567890', '+0987654321', '+1122334455'];
    return numbers[Math.floor(Math.random() * numbers.length)];
  }

  handleIncomingCall(callData) {
    const { setIncomingCall, addCall } = useCallStore.getState();
    const { getCallerByPhone } = useCallerStore.getState();
    
    // Check if caller exists
    const caller = getCallerByPhone(callData.caller_number);
    
    // Add call to history
    const newCall = {
      ...callData,
      caller_id: caller?.id || null,
      caller: caller || null,
      company_id: 1 // Mock company ID
    };
    
    addCall(newCall);
    setIncomingCall(newCall);
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