import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import {
  DEFAULT_PORT_ID,
  FALLBACK_PORT_INFOS,
  toPortInfo,
  type PortInfo,
} from '../data/ports';
import { fetchPorts } from '../services/api';

const STORAGE_KEY = 'logisync-port';

interface PortContextValue {
  portId: string;
  port: PortInfo;
  setPortId: (id: string) => void;
  ports: PortInfo[];
  /** True until the server list has been applied. */
  loading: boolean;
  reload: () => Promise<void>;
}

const PortContext = createContext<PortContextValue>({
  portId: DEFAULT_PORT_ID,
  port: FALLBACK_PORT_INFOS[0],
  setPortId: () => {},
  ports: FALLBACK_PORT_INFOS,
  loading: false,
  reload: async () => {},
});

function initialPortId(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && FALLBACK_PORT_INFOS.some((p) => p.id === saved)) return saved;
  } catch {
    /* private mode */
  }
  return DEFAULT_PORT_ID;
}

export function PortProvider({ children }: { children: ReactNode }) {
  const [portId, setPortIdState] = useState(initialPortId);
  const [ports, setPorts] = useState<PortInfo[]>(FALLBACK_PORT_INFOS);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchPorts();
      if (rows.length) setPorts(rows.map(toPortInfo));
    } catch {
      // Offline: the bundled fallback keeps every selector and map working.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setPortId = useCallback(
    (id: string) => {
      if (!ports.some((p) => p.id === id)) return;
      setPortIdState(id);
      try {
        localStorage.setItem(STORAGE_KEY, id);
      } catch {
        /* ignore */
      }
    },
    [ports],
  );

  // Cross-tab sync
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) setPortId(e.newValue);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [setPortId]);

  return (
    <PortContext.Provider
      value={{
        portId,
        port: ports.find((p) => p.id === portId) ?? ports[0],
        setPortId,
        ports,
        loading,
        reload: load,
      }}
    >
      {children}
    </PortContext.Provider>
  );
}

export function usePort() {
  return useContext(PortContext);
}