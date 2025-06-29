import { create } from 'zustand';

export const useCallStore = create((set, get) => ({
  calls: [],
  callLogs: [],
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

  addCallLog: (callLogData) => {
    set((state) => ({
      callLogs: [callLogData, ...state.callLogs],
      calls: [callLogData, ...state.calls],
      callHistory: [callLogData, ...state.callHistory]
    }));
  },

  updateCallLog: (updatedCallLog) => {
    set((state) => ({
      callLogs: state.callLogs.map(log => 
        log.id === updatedCallLog.id ? updatedCallLog : log
      ),
      calls: state.calls.map(call => 
        call.id === updatedCallLog.id ? updatedCallLog : call
      ),
      callHistory: state.callHistory.map(call => 
        call.id === updatedCallLog.id ? updatedCallLog : call
      ),
      incomingCall: state.incomingCall?.id === updatedCallLog.id 
        ? updatedCallLog 
        : state.incomingCall
    }));
  },

  setCalls: (calls) => {
    set({ calls });
  },

  setCallLogs: (callLogs) => {
    set({ callLogs });
  },

  setCallHistory: (history) => {
    set({ callHistory: history });
  },

  updateCallStatus: (callId, status) => {
    set((state) => ({
      calls: state.calls.map(call => 
        call.id === callId ? { ...call, call_status: status } : call
      ),
      callLogs: state.callLogs.map(log => 
        log.id === callId ? { ...log, call_status: status } : log
      ),
      callHistory: state.callHistory.map(call => 
        call.id === callId ? { ...call, call_status: status } : call
      )
    }));
  },

  // New methods for call logs
  getCallLogById: (id) => {
    const state = get();
    return state.callLogs.find(log => log.id === id);
  },

  getCallLogsByStatus: (status) => {
    const state = get();
    return state.callLogs.filter(log => log.call_status === status);
  },

  getCallLogsByDateRange: (startDate, endDate) => {
    const state = get();
    return state.callLogs.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate >= startDate && logDate <= endDate;
    });
  }
}));