import { useCallStore } from '../store/callStore';
import { useCallerStore } from '../store/callerStore';
import { useAuthStore } from '../store/authStore';
import { callsAPI, callersAPI } from './supabaseAPI';

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
    const { getCallerByPhone } = useCallerStore.getState();
    const { getUserCompanyId } = useAuthStore.getState();
    
    const companyId = getUserCompanyId();
    if (!companyId) return;

    try {
      // Check if caller exists in the database
      const caller = await callersAPI.getByPhone(companyId, callData.caller_number);
      
      // Create call record in database
      const newCall = await callsAPI.create({
        company_id: companyId,
        caller_id: caller?.id || null,
        caller_number: callData.caller_number,
        call_status: 'incoming',
        timestamp: callData.timestamp,
        voip_raw_payload: callData
      });

      // Add caller info to call object
      newCall.caller = caller;
      
      // Update local state
      addCall(newCall);
      setIncomingCall(newCall);
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