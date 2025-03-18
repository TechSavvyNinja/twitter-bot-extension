
// Type definitions for Chrome extension API
interface Chrome {
  tabs: {
    query: (queryInfo: { active: boolean; currentWindow: boolean }) => Promise<any[]>;
    sendMessage: (tabId: number, message: any, callback?: (response: any) => void) => void;
  };
  runtime: {
    sendMessage: (message: any, callback?: (response: any) => void) => void;
    lastError?: {
      message: string;
    };
  };
  storage: {
    local: {
      get: (keys: string | string[] | object | null, callback?: (items: { [key: string]: any }) => void) => void;
      set: (items: object, callback?: () => void) => void;
    };
    onChanged: {
      addListener: (callback: (changes: { [key: string]: any }) => void) => void;
    };
  };
  alarms: {
    create: (name: string, alarmInfo: { delayInMinutes: number }) => void;
    clearAll: () => Promise<boolean>;
  };
}

declare global {
  interface Window {
    chrome: Chrome;
  }
  
  const chrome: Chrome;
}

export {};
