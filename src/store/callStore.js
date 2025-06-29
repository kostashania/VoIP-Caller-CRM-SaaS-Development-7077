import { create } from 'zustand';

export const useCallStore = create((set, get) => ({
  calls: [],
  incomingCall: null,
  callHistory: [],
  
  setIncomingCall: (callData) => {
    set({ incomingCall: callData });
  },
  
  clearIncomingCall: () => {
    set({ incomingCall: null });
  },
  
  addCall: (callData) => {
    set((state) => ({
      calls: [callData, ...state.calls],
      callHistory: [callData, ...state.callHistory]
    }));
  },
  
  setCalls: (calls) => {
    set({ calls });
  },
  
  setCallHistory: (history) => {
    set({ callHistory: history });
  },
  
  updateCallStatus: (callId, status) => {
    set((state) => ({
      calls: state.calls.map(call => 
        call.id === callId ? { ...call, call_status: status } : call
      ),
      callHistory: state.callHistory.map(call => 
        call.id === callId ? { ...call, call_status: status } : call
      )
    }));
  }
}));