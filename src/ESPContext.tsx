import React, { createContext, useContext } from 'react';
import axios from 'axios';

type ESPContextType = {
  sendToESP: (command: string, data: Object) => Promise<void>;
};

const ESPContext = createContext<ESPContextType | undefined>(undefined);

export const ESPProvider = ({ children }: { children: React.ReactNode }) => {
  const sendToESP = async (command: string, data: Object) => {
        try {
          const start = performance.now()
          let cmd_str = command + "," + Object.values(data).map(v => String(v)).join(',') + ","
          const res = await axios.get("http://192.168.6.123/alan?data="+cmd_str)
          console.log('Latency: ', performance.now() - start);
          console.log('Echo: ', res.data.echo);
          // add sensors to response here if command was 'p'

        } catch (err) {
        if (axios.isAxiosError(err)) {
            console.error("Axios error:", err.message);
        } else {
            console.error("Unknown error:", (err as Error).message);
        }
    };
  };

  return (
    <ESPContext.Provider value={{ sendToESP }}>
      {children}
    </ESPContext.Provider>
  );
};

export const useESP = () => {
  const context = useContext(ESPContext);
  if (!context) {
    throw new Error('useESP must be used within an ESPProvider');
  }
  return context;
};









