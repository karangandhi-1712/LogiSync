// ─── locationSuggestions.ts — Google Maps style logistics & cargo destinations ──
import { getPort } from './ports';

export interface LocationSuggestion {
  id: string;
  title: string;
  subtitle: string;
  category: 'CFS' | 'ICD' | 'Port Yard' | 'Logistics Park' | 'Industrial Zone' | 'City Hub';
  portId?: string; // Associated primary port if applicable
  approxKm?: number;
}

export const LOGISTICS_DESTINATIONS: LocationSuggestion[] = [
  // Chennai & Ennore Corridor
  { id: 'c-1', title: 'CCTL Container Terminal Yard, Bay 4', subtitle: 'Rajaji Salai, Chennai Port Approach, Tamil Nadu', category: 'Port Yard', portId: 'chennai', approxKm: 2 },
  { id: 'c-2', title: 'DP World Container Freight Station', subtitle: 'Ennore Expressway, Tiruvottiyur, Chennai', category: 'CFS', portId: 'chennai', approxKm: 8 },
  { id: 'c-3', title: 'Sriperumbudur Auto Cluster & Logistics Park', subtitle: 'NH 48 Chennai–Bengaluru Corridor, Kanchipuram', category: 'Industrial Zone', portId: 'chennai', approxKm: 42 },
  { id: 'c-4', title: 'Irungattukottai SIPCOT Industrial Hub', subtitle: 'Near Hyundai Plant, Sriperumbudur, Tamil Nadu', category: 'Industrial Zone', portId: 'chennai', approxKm: 38 },
  { id: 'c-5', title: 'Manali Petrochemicals Cargo Yard', subtitle: 'Manali Industrial Corridor, North Chennai', category: 'Logistics Park', portId: 'chennai', approxKm: 16 },
  { id: 'c-6', title: 'Whitefield Inland Container Depot (ICD)', subtitle: 'CONCOR ICD Whitefield, Bengaluru, Karnataka', category: 'ICD', portId: 'chennai', approxKm: 320 },
  { id: 'c-7', title: 'Sri City Multi-Product SEZ', subtitle: 'Tada–Satyavedu Corridor, Andhra Pradesh / TN Border', category: 'Industrial Zone', portId: 'chennai', approxKm: 58 },
  { id: 'c-8', title: 'Ennore Cargo Logistics Hub', subtitle: 'Kamarajar Port Access Road, Ennore, Chennai', category: 'Port Yard', portId: 'ennore', approxKm: 4 },

  // VOC / Thoothukudi Corridor
  { id: 'v-1', title: 'Madurai Inland Container Depot (ICD)', subtitle: 'Koodal Nagar, CONCOR Madurai, Tamil Nadu', category: 'ICD', portId: 'voc', approxKm: 145 },
  { id: 'v-2', title: 'Thoothukudi Central CFS Staging Yard', subtitle: 'Harbour Estate Road, Tuticorin, Tamil Nadu', category: 'CFS', portId: 'voc', approxKm: 4 },
  { id: 'v-3', title: 'Tirunelveli Multi-Modal Logistics Park', subtitle: 'Gangaikondan SIPCOT, NH 44, Tamil Nadu', category: 'Logistics Park', portId: 'voc', approxKm: 52 },
  { id: 'v-4', title: 'Kovilpatti Cotton & Marine Cargo Hub', subtitle: 'NH 38 Thoothukudi–Madurai Hwy, Tamil Nadu', category: 'City Hub', portId: 'voc', approxKm: 65 },
  { id: 'v-5', title: 'Tuticorin Salt & Marine Terminal', subtitle: 'VOC New Port South Breakwater, Tamil Nadu', category: 'Port Yard', portId: 'voc', approxKm: 3 },

  // JNPT & Mumbai Corridor
  { id: 'j-1', title: 'JNPT Central Container Staging Yard', subtitle: 'Sheva Nhava Island, Navi Mumbai, Maharashtra', category: 'Port Yard', portId: 'jnpt', approxKm: 3 },
  { id: 'j-2', title: 'Speedway Container Freight Station', subtitle: 'Dronagiri Node, Uran, Navi Mumbai', category: 'CFS', portId: 'jnpt', approxKm: 7 },
  { id: 'j-3', title: 'Bhiwandi Mega Logistics Park', subtitle: 'Mumbai–Nashik Highway NH 160, Thane, Maharashtra', category: 'Logistics Park', portId: 'jnpt', approxKm: 54 },
  { id: 'j-4', title: 'Taloja MIDC Chemical & Cargo Depot', subtitle: 'Old Mumbai–Pune Hwy, Navi Mumbai', category: 'Industrial Zone', portId: 'jnpt', approxKm: 28 },
  { id: 'j-5', title: 'Pune Chakan Industrial Hub (MIDC Phase II)', subtitle: 'Talegaon–Chakan Corridor, Pune, Maharashtra', category: 'Industrial Zone', portId: 'jnpt', approxKm: 118 },
  { id: 'm-1', title: 'BPT Green Gate CFS Terminal', subtitle: 'Shoorji Vallabhdas Marg, Ballard Estate, Mumbai', category: 'CFS', portId: 'mumbai', approxKm: 2 },
  { id: 'm-2', title: 'Wadi Bunder Central Freight Shed', subtitle: 'P D\'Mello Road, Mazgaon, Mumbai', category: 'ICD', portId: 'mumbai', approxKm: 4 },

  // Deendayal / Kandla & Gujarat
  { id: 'd-1', title: 'Ahmedabad CONCOR Inland Container Depot', subtitle: 'Khodiyar ICD, Gandhinagar–Ahmedabad, Gujarat', category: 'ICD', portId: 'deendayal', approxKm: 295 },
  { id: 'd-2', title: 'Kandla Free Trade Zone (KASEZ)', subtitle: 'Gandhidham, Kutch, Gujarat', category: 'Industrial Zone', portId: 'deendayal', approxKm: 12 },
  { id: 'd-3', title: 'Morbi Ceramics Freight Complex', subtitle: 'NH 8A Morbi–Kandla Bypass, Gujarat', category: 'Logistics Park', portId: 'deendayal', approxKm: 145 },
  { id: 'd-4', title: 'Dry Bulk Terminal Staging Yard', subtitle: 'Deendayal Port Trust Outer Quay, Kandla', category: 'Port Yard', portId: 'deendayal', approxKm: 3 },

  // Cochin / Kerala Corridor
  { id: 'k-1', title: 'ICTT Vallarpadam Container Yard', subtitle: 'Vallarpadam SEZ, Kochi, Kerala', category: 'Port Yard', portId: 'cochin', approxKm: 2 },
  { id: 'k-2', title: 'Coimbatore Inland Container Depot (ICD)', subtitle: 'Irugur Container Yard, Coimbatore, Tamil Nadu', category: 'ICD', portId: 'cochin', approxKm: 195 },
  { id: 'k-3', title: 'Aluva Industrial Logistics Park', subtitle: 'NH 544 Kochi–Salem Hwy, Ernakulam, Kerala', category: 'Logistics Park', portId: 'cochin', approxKm: 24 },

  // Vizag, Paradip, Haldia, Mangalore, Mormugao
  { id: 'z-1', title: 'VCTPL Container Terminal Staging Area', subtitle: 'Outer Harbour, Visakhapatnam Port, Andhra Pradesh', category: 'Port Yard', portId: 'vizag', approxKm: 2 },
  { id: 'z-2', title: 'Hyderabad Sanathnagar ICD', subtitle: 'CONCOR Inland Port, Sanathnagar, Hyderabad, Telangana', category: 'ICD', portId: 'vizag', approxKm: 610 },
  { id: 'p-1', title: 'Paradip Steel & Bulk Handling Yard', subtitle: 'Harbour Access Road, Jagatsinghpur, Odisha', category: 'Port Yard', portId: 'paradip', approxKm: 3 },
  { id: 'p-2', title: 'Kalinganagar Mega Steel Cluster', subtitle: 'Duburi, Jajpur Industrial Belt, Odisha', category: 'Industrial Zone', portId: 'paradip', approxKm: 110 },
  { id: 'h-1', title: 'Haldia Dock Complex CFS Bay 2', subtitle: 'HDC Berth Approach, East Midnapore, West Bengal', category: 'CFS', portId: 'haldia', approxKm: 4 },
  { id: 'h-2', title: 'Durgapur Industrial Logistics Depot', subtitle: 'NH 19 Steel Corridor, Paschim Bardhaman, West Bengal', category: 'Industrial Zone', portId: 'haldia', approxKm: 185 },
  { id: 'n-1', title: 'NMP Container CFS Yard Panambur', subtitle: 'NH 66 New Mangalore Port Approach, Karnataka', category: 'CFS', portId: 'mangalore', approxKm: 3 },
  { id: 'mo-1', title: 'Mormugao Berth 9 Container Staging', subtitle: 'Headland Sada, Vasco da Gama, Goa', category: 'Port Yard', portId: 'mormugao', approxKm: 2 },
];

/**
 * Returns popular 1-click destination recommendations for the selected port.
 */
export function getPopularDestinationsForPort(portId?: string): LocationSuggestion[] {
  if (!portId) return LOGISTICS_DESTINATIONS.slice(0, 4);
  const matched = LOGISTICS_DESTINATIONS.filter(d => d.portId === portId);
  if (matched.length >= 3) return matched.slice(0, 4);
  return [...matched, ...LOGISTICS_DESTINATIONS.filter(d => d.portId !== portId)].slice(0, 4);
}

/**
 * Instant search suggestions filtering both local Indian logistics hubs and online Nominatim
 */
export async function searchLocationSuggestions(query: string, currentPortId?: string): Promise<LocationSuggestion[]> {
  const q = query.trim().toLowerCase();
  if (!q) return getPopularDestinationsForPort(currentPortId);

  // 1. Instant local matching
  const localMatches = LOGISTICS_DESTINATIONS.filter(item =>
    item.title.toLowerCase().includes(q) ||
    item.subtitle.toLowerCase().includes(q) ||
    item.category.toLowerCase().includes(q)
  );

  // Sort local matches: prefer ones related to current port
  localMatches.sort((a, b) => {
    const aMatch = a.portId === currentPortId ? -1 : 1;
    const bMatch = b.portId === currentPortId ? -1 : 1;
    return aMatch - bMatch;
  });

  // If we already have 4+ great matches, return immediately
  if (localMatches.length >= 4) {
    return localMatches.slice(0, 6);
  }

  // 2. Try OpenStreetMap Nominatim for real Indian addresses
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1800);
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=in&limit=5&addressdetails=1`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    if (resp.ok) {
      const data = await resp.json();
      if (Array.isArray(data)) {
        const osmResults: LocationSuggestion[] = data.map((item: any, idx: number) => {
          const parts = (item.display_name || '').split(',');
          const mainTitle = parts[0]?.trim() || item.name || query;
          const subTitle = parts.slice(1, 4).join(',').trim() || 'India';
          return {
            id: `osm-${item.place_id || idx}`,
            title: mainTitle,
            subtitle: subTitle,
            category: 'City Hub' as const,
          };
        });

        // Merge without duplicates
        const combined = [...localMatches];
        for (const osm of osmResults) {
          if (!combined.some(c => c.title.toLowerCase() === osm.title.toLowerCase())) {
            combined.push(osm);
          }
        }
        return combined.slice(0, 6);
      }
    }
  } catch {
    // Network or timeout: fallback to local matches
  }

  return localMatches.slice(0, 6);
}
