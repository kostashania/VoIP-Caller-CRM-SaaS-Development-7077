import { create } from 'zustand';

export const useCallerStore = create((set, get) => ({
  callers: [],
  currentCaller: null,
  
  setCallers: (callers) => {
    set({ callers });
  },
  
  addCaller: (caller) => {
    set((state) => ({
      callers: [caller, ...state.callers]
    }));
  },
  
  updateCaller: (callerId, updates) => {
    set((state) => ({
      callers: state.callers.map(caller => 
        caller.id === callerId ? { ...caller, ...updates } : caller
      ),
      currentCaller: state.currentCaller?.id === callerId 
        ? { ...state.currentCaller, ...updates } 
        : state.currentCaller
    }));
  },
  
  setCurrentCaller: (caller) => {
    set({ currentCaller: caller });
  },
  
  getCallerByPhone: (phoneNumber) => {
    const state = get();
    return state.callers.find(caller => caller.phone_number === phoneNumber);
  },
  
  addAddress: (callerId, address) => {
    set((state) => ({
      callers: state.callers.map(caller => 
        caller.id === callerId 
          ? { ...caller, addresses: [...(caller.addresses || []), address] }
          : caller
      ),
      currentCaller: state.currentCaller?.id === callerId
        ? { ...state.currentCaller, addresses: [...(state.currentCaller.addresses || []), address] }
        : state.currentCaller
    }));
  },
  
  updateAddress: (callerId, addressId, updates) => {
    set((state) => ({
      callers: state.callers.map(caller => 
        caller.id === callerId 
          ? {
              ...caller, 
              addresses: caller.addresses?.map(addr => 
                addr.id === addressId ? { ...addr, ...updates } : addr
              )
            }
          : caller
      ),
      currentCaller: state.currentCaller?.id === callerId
        ? {
            ...state.currentCaller,
            addresses: state.currentCaller.addresses?.map(addr => 
              addr.id === addressId ? { ...addr, ...updates } : addr
            )
          }
        : state.currentCaller
    }));
  },
  
  deleteAddress: (callerId, addressId) => {
    set((state) => ({
      callers: state.callers.map(caller => 
        caller.id === callerId 
          ? {
              ...caller, 
              addresses: caller.addresses?.filter(addr => addr.id !== addressId)
            }
          : caller
      ),
      currentCaller: state.currentCaller?.id === callerId
        ? {
            ...state.currentCaller,
            addresses: state.currentCaller.addresses?.filter(addr => addr.id !== addressId)
          }
        : state.currentCaller
    }));
  }
}));