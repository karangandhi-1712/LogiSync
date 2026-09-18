// ─── Port registry (mirrors backend/app/ports.py — keep in sync) ──────────
// Static fallback so the selector + map work even if /api/ports is unreachable.

export interface PortInfo {
  id: string;
  coast: 'West' | 'East';
  name: string;
  short: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  zoom: number;
  corridor: string;
  gates: string[];
}

export const DEFAULT_PORT_ID = 'voc';

export const PORTS: PortInfo[] = [
  { id: 'voc', coast: 'East', name: 'V.O. Chidambaranar Port', short: 'VOC Port', city: 'Thoothukudi', state: 'Tamil Nadu', lat: 8.7642, lng: 78.1348, zoom: 12, corridor: 'Madurai–Thoothukudi Hwy (NH 38)', gates: ['Gate 1 (Bulk)', 'Gate 2 (General)', 'Gate 3 (Container/Reefer)', 'Gate 4 (Express Rail)'] },
  { id: 'deendayal', coast: 'West', name: 'Deendayal Port (Kandla)', short: 'Deendayal', city: 'Kandla', state: 'Gujarat', lat: 23.0, lng: 70.221, zoom: 12, corridor: 'Kandla–Ahmedabad Hwy (NH 41)', gates: ['Gate 1 (Dry Bulk)', 'Gate 2 (General)', 'Gate 3 (Container)', 'Gate 4 (Liquid/Express)'] },
  { id: 'mumbai', coast: 'West', name: 'Mumbai Port', short: 'Mumbai', city: 'Mumbai', state: 'Maharashtra', lat: 18.918, lng: 72.935, zoom: 12, corridor: 'Eastern Freeway / Harbour Link', gates: ['Gate 1 (Green Gate)', 'Gate 2 (General)', 'Gate 3 (Container)', 'Gate 4 (Coastal/Express)'] },
  { id: 'jnpt', coast: 'West', name: 'Jawaharlal Nehru Port (Nhava Sheva)', short: 'JNPT', city: 'Navi Mumbai', state: 'Maharashtra', lat: 18.945, lng: 72.94, zoom: 12, corridor: 'JNPT–Panvel Hwy (NH 348)', gates: ['Gate 1 (Main Entry)', 'Gate 2 (General)', 'Gate 3 (Container/Reefer)', 'Gate 4 (Rail/Express)'] },
  { id: 'mormugao', coast: 'West', name: 'Mormugao Port', short: 'Mormugao', city: 'Vasco da Gama', state: 'Goa', lat: 15.419, lng: 73.8, zoom: 12, corridor: 'Vasco–Panaji Hwy (NH 66)', gates: ['Gate 1 (Iron Ore/Bulk)', 'Gate 2 (General)', 'Gate 3 (Container)', 'Gate 4 (Coastal/Express)'] },
  { id: 'mangalore', coast: 'West', name: 'New Mangalore Port', short: 'N. Mangalore', city: 'Mangaluru', state: 'Karnataka', lat: 12.915, lng: 74.796, zoom: 12, corridor: 'Mangaluru–Bengaluru Hwy (NH 75)', gates: ['Gate 1 (POL/Bulk)', 'Gate 2 (General)', 'Gate 3 (Container/Reefer)', 'Gate 4 (Rail/Express)'] },
  { id: 'cochin', coast: 'West', name: 'Cochin Port', short: 'Cochin', city: 'Kochi', state: 'Kerala', lat: 9.967, lng: 76.24, zoom: 12, corridor: 'Kochi–Salem Hwy (NH 544)', gates: ['Gate 1 (Main Entry)', 'Gate 2 (General)', 'Gate 3 (Container ICTT)', 'Gate 4 (Coastal/Express)'] },
  { id: 'haldia', coast: 'East', name: 'Syama Prasad Mookerjee Port (Haldia Dock)', short: 'Haldia', city: 'Haldia', state: 'West Bengal', lat: 22.03, lng: 88.065, zoom: 12, corridor: 'Haldia–Kolkata Hwy (NH 116)', gates: ['Gate 1 (Bulk)', 'Gate 2 (General)', 'Gate 3 (Container)', 'Gate 4 (Rail/Express)'] },
  { id: 'paradip', coast: 'East', name: 'Paradip Port', short: 'Paradip', city: 'Paradip', state: 'Odisha', lat: 20.262, lng: 86.682, zoom: 12, corridor: 'Paradip–Cuttack Hwy (NH 53)', gates: ['Gate 1 (Iron Ore/Bulk)', 'Gate 2 (General)', 'Gate 3 (Container)', 'Gate 4 (POL/Express)'] },
  { id: 'vizag', coast: 'East', name: 'Visakhapatnam Port', short: 'Vizag', city: 'Visakhapatnam', state: 'Andhra Pradesh', lat: 17.686, lng: 83.283, zoom: 12, corridor: 'Vizag–Raipur Hwy (NH 26)', gates: ['Gate 1 (Ore/Bulk)', 'Gate 2 (General)', 'Gate 3 (Container)', 'Gate 4 (Rail/Express)'] },
  { id: 'chennai', coast: 'East', name: 'Chennai Port', short: 'Chennai', city: 'Chennai', state: 'Tamil Nadu', lat: 13.1, lng: 80.293, zoom: 12, corridor: 'Chennai–Bengaluru Hwy (NH 48)', gates: ['Gate 1 (Main Entry)', 'Gate 2 (General)', 'Gate 3 (Container)', 'Gate 4 (Coastal/Express)'] },
  { id: 'ennore', coast: 'East', name: 'Kamarajar Port (Ennore)', short: 'Ennore', city: 'Ennore', state: 'Tamil Nadu', lat: 13.25, lng: 80.32, zoom: 12, corridor: 'Ennore–Chennai Port Corridor', gates: ['Gate 1 (Coal/Bulk)', 'Gate 2 (General)', 'Gate 3 (Container/LNG)', 'Gate 4 (Rail/Express)'] },
];

export function getPort(portId: string): PortInfo {
  return PORTS.find(p => p.id === portId) || PORTS[0];
}
