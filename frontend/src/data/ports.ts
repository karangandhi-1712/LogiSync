// ─── Port registry (mirrors backend/app/ports.py — keep in sync) ──────────
// Static fallback so the selector + map work even if /api/ports is unreachable.

export interface PortInfo {
  id: string;
  coast: 'West' | 'East';
  name: string;
  short: string;
  locode: string;            // UN/LOCODE e.g. "INTUT"
  city: string;
  state: string;
  lat: number;
  lng: number;
  zoom: number;
  corridor: string;
  gates: string[];
  congestionLevel: 'low' | 'moderate' | 'high'; // decorative, for modal dot
}

export const DEFAULT_PORT_ID = 'voc';

export const PORTS: PortInfo[] = [
  { id: 'voc',       coast: 'East', name: 'V.O. Chidambaranar Port',              locode: 'INTUT', short: 'VOC Port',    city: 'Thoothukudi',  state: 'Tamil Nadu',      lat: 8.7642,  lng: 78.1348, zoom: 12, corridor: 'Madurai–Thoothukudi Hwy (NH 38)',  gates: ['Gate 1 (Bulk)', 'Gate 2 (General)', 'Gate 3 (Container/Reefer)', 'Gate 4 (Express Rail)'],         congestionLevel: 'moderate' },
  { id: 'deendayal', coast: 'West', name: 'Deendayal Port (Kandla)',               locode: 'INKLA', short: 'Deendayal',  city: 'Kandla',       state: 'Gujarat',         lat: 23.0,    lng: 70.221,  zoom: 12, corridor: 'Kandla–Ahmedabad Hwy (NH 41)',       gates: ['Gate 1 (Dry Bulk)', 'Gate 2 (General)', 'Gate 3 (Container)', 'Gate 4 (Liquid/Express)'],          congestionLevel: 'low'      },
  { id: 'mumbai',    coast: 'West', name: 'Mumbai Port',                           locode: 'INBOM', short: 'Mumbai',     city: 'Mumbai',       state: 'Maharashtra',     lat: 18.918,  lng: 72.935,  zoom: 12, corridor: 'Eastern Freeway / Harbour Link',       gates: ['Gate 1 (Green Gate)', 'Gate 2 (General)', 'Gate 3 (Container)', 'Gate 4 (Coastal/Express)'],      congestionLevel: 'high'     },
  { id: 'jnpt',      coast: 'West', name: 'Jawaharlal Nehru Port (Nhava Sheva)',   locode: 'INNSA', short: 'JNPT',       city: 'Navi Mumbai',  state: 'Maharashtra',     lat: 18.945,  lng: 72.94,   zoom: 12, corridor: 'JNPT–Panvel Hwy (NH 348)',             gates: ['Gate 1 (Main Entry)', 'Gate 2 (General)', 'Gate 3 (Container/Reefer)', 'Gate 4 (Rail/Express)'],   congestionLevel: 'high'     },
  { id: 'mormugao',  coast: 'West', name: 'Mormugao Port',                         locode: 'INMAR', short: 'Mormugao',   city: 'Vasco da Gama',state: 'Goa',             lat: 15.419,  lng: 73.8,    zoom: 12, corridor: 'Vasco–Panaji Hwy (NH 66)',              gates: ['Gate 1 (Iron Ore/Bulk)', 'Gate 2 (General)', 'Gate 3 (Container)', 'Gate 4 (Coastal/Express)'],  congestionLevel: 'low'      },
  { id: 'mangalore', coast: 'West', name: 'New Mangalore Port',                    locode: 'INMRM', short: 'N. Mangalore',city: 'Mangaluru',   state: 'Karnataka',       lat: 12.915,  lng: 74.796,  zoom: 12, corridor: 'Mangaluru–Bengaluru Hwy (NH 75)',       gates: ['Gate 1 (POL/Bulk)', 'Gate 2 (General)', 'Gate 3 (Container/Reefer)', 'Gate 4 (Rail/Express)'],    congestionLevel: 'moderate' },
  { id: 'cochin',    coast: 'West', name: 'Cochin Port',                           locode: 'INCOK', short: 'Cochin',     city: 'Kochi',        state: 'Kerala',          lat: 9.967,   lng: 76.24,   zoom: 12, corridor: 'Kochi–Salem Hwy (NH 544)',              gates: ['Gate 1 (Main Entry)', 'Gate 2 (General)', 'Gate 3 (Container ICTT)', 'Gate 4 (Coastal/Express)'], congestionLevel: 'moderate' },
  { id: 'haldia',    coast: 'East', name: 'Syama Prasad Mookerjee Port (Haldia)', locode: 'INHLD', short: 'Haldia',     city: 'Haldia',       state: 'West Bengal',     lat: 22.03,   lng: 88.065,  zoom: 12, corridor: 'Haldia–Kolkata Hwy (NH 116)',           gates: ['Gate 1 (Bulk)', 'Gate 2 (General)', 'Gate 3 (Container)', 'Gate 4 (Rail/Express)'],               congestionLevel: 'low'      },
  { id: 'paradip',   coast: 'East', name: 'Paradip Port',                          locode: 'INPAT', short: 'Paradip',    city: 'Paradip',      state: 'Odisha',          lat: 20.262,  lng: 86.682,  zoom: 12, corridor: 'Paradip–Cuttack Hwy (NH 53)',           gates: ['Gate 1 (Iron Ore/Bulk)', 'Gate 2 (General)', 'Gate 3 (Container)', 'Gate 4 (POL/Express)'],     congestionLevel: 'moderate' },
  { id: 'vizag',     coast: 'East', name: 'Visakhapatnam Port',                    locode: 'INVTZ', short: 'Vizag',      city: 'Visakhapatnam',state: 'Andhra Pradesh',  lat: 17.686,  lng: 83.283,  zoom: 12, corridor: 'Vizag–Raipur Hwy (NH 26)',              gates: ['Gate 1 (Ore/Bulk)', 'Gate 2 (General)', 'Gate 3 (Container)', 'Gate 4 (Rail/Express)'],          congestionLevel: 'high'     },
  { id: 'chennai',   coast: 'East', name: 'Chennai Port',                          locode: 'INMAA', short: 'Chennai',    city: 'Chennai',      state: 'Tamil Nadu',      lat: 13.1,    lng: 80.293,  zoom: 12, corridor: 'Chennai–Bengaluru Hwy (NH 48)',         gates: ['Gate 2 (Bulk)', 'Gate 4 (General)', 'Gate 6 (Container)', 'Gate 7 (Coastal/Express)', 'Gate 10 (Rail/Express)'], congestionLevel: 'high' },
  { id: 'ennore',    coast: 'East', name: 'Kamarajar Port (Ennore)',               locode: 'INENT', short: 'Ennore',     city: 'Ennore',       state: 'Tamil Nadu',      lat: 13.25,   lng: 80.32,   zoom: 12, corridor: 'Ennore–Chennai Port Corridor',          gates: ['Gate 1 (Coal/Bulk)', 'Gate 2 (General)', 'Gate 3 (Container/LNG)', 'Gate 4 (Rail/Express)'],   congestionLevel: 'low'      },
];

export function getPort(portId: string): PortInfo {
  return PORTS.find(p => p.id === portId) || PORTS[0];
}
