import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { PORTS, DEFAULT_PORT_ID, getPort, type PortInfo } from '../data/ports';

const STORAGE_KEY = 'logisync-port';

interface PortContextValue {
  portId: string;
  port: PortInfo;
  setPortId: (id: string) => void;
  ports: PortInfo[];
}

const PortContext = createContext<PortContextValue>({
  portId: DEFAULT_PORT_ID,
  port: PORTS[0],
  setPortId: () => {},
  ports: PORTS,
});

function initialPortId(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && PORTS.some(p => p.id === saved)) return saved;
  } catch { /* private mode */ }
  return DEFAULT_PORT_ID;
}

export function PortProvider({ children }: { children: ReactNode }) {
  const [portId, setPortIdState] = useState(initialPortId);

  const setPortId = (id: string) => {
    if (!PORTS.some(p => p.id === id)) return;
    setPortIdState(id);
    try { localStorage.setItem(STORAGE_KEY, id); } catch { /* ignore */ }
  };

  // Cross-tab sync
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue && PORTS.some(p => p.id === e.newValue)) {
        setPortIdState(e.newValue);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return (
    <PortContext.Provider value={{ portId, port: getPort(portId), setPortId, ports: PORTS }}>
      {children}
    </PortContext.Provider>
  );
}

export function usePort() {
  return useContext(PortContext);
}
