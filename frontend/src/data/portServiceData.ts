// ─── Port Service Data — Slot Booking Tab ────────────────────────────────────
// All dummy/static data that drives the new sections B, C, D.
// Each port has distinct gate numbers, wait times, congestion arrays, and bookings.

export type ServiceType = 'bulk' | 'general' | 'container_reefer' | 'express_rail';
export type GateStatusType = 'optimal' | 'normal' | 'moderate' | 'congested';
export type BookingStatus = 'upcoming' | 'in_progress' | 'completed';
export type VehicleType = 'trailer' | 'container_truck' | 'reefer_truck' | 'flatbed' | 'tanker';
export type PriorityTier = 'standard' | 'express' | 'urgent';

export interface GateServiceInfo {
  gateNumber: number;       // e.g. 1, 3, 5
  gateName: string;         // e.g. "Gate 1 · Bulk Terminal"
  waitMin: number;
  queue: number;
  status: GateStatusType;
}

export interface ServiceCardData {
  service: ServiceType;
  label: string;            // Display label
  icon: string;             // emoji icon
  gates: GateServiceInfo[];
}

export interface PortCongestionData {
  // hourly wait-time arrays (index 0=06:00, 1=08:00 … 8=22:00) per gate label
  gateLabels: string[];     // e.g. ['Gate 1 (Bulk)', 'Gate 3 (Container)']
  series: number[][];       // parallel arrays, one per gateLabel
  // peak gate summary for today
  peakGateName: string;
  peakWaitMin: number;
  peakTimeWindow: string;   // e.g. "13:00 – 15:00"
  peakService: string;
}

export interface DateDensity {
  // 7 values 0–1 for today…+6 days congestion density (for DateScrubber bar)
  values: number[];
}

export interface BookingRecord {
  id: string;
  tokenNumber: string;
  portId: string;
  service: ServiceType;
  serviceLabel: string;
  gate: string;
  date: string;             // 'YYYY-MM-DD'
  timeWindow: string;       // e.g. '14:15 – 14:45'
  vehicleNumber: string;
  vehicleType: VehicleType;
  driverName: string;
  driverPhone?: string;
  driverLicenseOk: boolean;
  destination: string;
  status: BookingStatus;
  tier: PriorityTier;
  tierFee: number;
  cargoType: string;
}

// ─── Helper ───────────────────────────────────────────────────────────────────
function todayPlusDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

// ─── Service Maps (per port) ──────────────────────────────────────────────────
export const PORT_SERVICE_MAP: Record<string, ServiceCardData[]> = {
  voc: [
    { service: 'bulk',            label: 'Bulk',             icon: '⛽', gates: [{ gateNumber: 1,  gateName: 'Gate 1 · Bulk Terminal',       waitMin: 45, queue: 14, status: 'congested' }, { gateNumber: 3, gateName: 'Gate 3 · Dry Bulk Annex',    waitMin: 28, queue: 8,  status: 'moderate'  }] },
    { service: 'general',         label: 'General Cargo',    icon: '📦', gates: [{ gateNumber: 2,  gateName: 'Gate 2 · General Berth',       waitMin: 18, queue: 6,  status: 'normal'    }] },
    { service: 'container_reefer',label: 'Container/Reefer', icon: '🚢', gates: [{ gateNumber: 5,  gateName: 'Gate 5 · Container Terminal',  waitMin: 11, queue: 2,  status: 'optimal'   }, { gateNumber: 7, gateName: 'Gate 7 · Reefer Berth',      waitMin: 20, queue: 5,  status: 'moderate'  }] },
    { service: 'express_rail',    label: 'Express Rail',     icon: '🚂', gates: [{ gateNumber: 9,  gateName: 'Gate 9 · Rail Ramp',           waitMin: 22, queue: 9,  status: 'moderate'  }] },
  ],
  deendayal: [
    { service: 'bulk',            label: 'Bulk',             icon: '⛽', gates: [{ gateNumber: 2,  gateName: 'Gate 2 · Dry Bulk Quay',       waitMin: 19, queue: 5,  status: 'normal'    }, { gateNumber: 6, gateName: 'Gate 6 · Coal Handling',   waitMin: 32, queue: 10, status: 'moderate'  }] },
    { service: 'general',         label: 'General Cargo',    icon: '📦', gates: [{ gateNumber: 3,  gateName: 'Gate 3 · General Berth',       waitMin: 14, queue: 4,  status: 'normal'    }] },
    { service: 'container_reefer',label: 'Container/Reefer', icon: '🚢', gates: [{ gateNumber: 5,  gateName: 'Gate 5 · Container Yard',      waitMin: 9,  queue: 2,  status: 'optimal'   }] },
    { service: 'express_rail',    label: 'Express Rail',     icon: '🚂', gates: [{ gateNumber: 8,  gateName: 'Gate 8 · ICD Rail Ramp',       waitMin: 16, queue: 3,  status: 'normal'    }, { gateNumber: 10, gateName: 'Gate 10 · Liquid Express', waitMin: 25, queue: 7,  status: 'moderate'  }] },
  ],
  mumbai: [
    { service: 'bulk',            label: 'Bulk',             icon: '⛽', gates: [{ gateNumber: 3,  gateName: 'Gate 3 · Indira Dock Bulk',    waitMin: 55, queue: 18, status: 'congested' }] },
    { service: 'general',         label: 'General Cargo',    icon: '📦', gates: [{ gateNumber: 1,  gateName: 'Gate 1 · Green Gate',          waitMin: 22, queue: 7,  status: 'moderate'  }, { gateNumber: 4, gateName: 'Gate 4 · Victoria Dock',  waitMin: 17, queue: 5,  status: 'normal'    }] },
    { service: 'container_reefer',label: 'Container/Reefer', icon: '🚢', gates: [{ gateNumber: 6,  gateName: 'Gate 6 · BTPCT Container',     waitMin: 38, queue: 12, status: 'congested' }, { gateNumber: 8, gateName: 'Gate 8 · Reefer Terminal',  waitMin: 29, queue: 9,  status: 'moderate'  }] },
    { service: 'express_rail',    label: 'Express Rail',     icon: '🚂', gates: [{ gateNumber: 11, gateName: 'Gate 11 · Wadi Bunder Ramp',   waitMin: 20, queue: 6,  status: 'moderate'  }] },
  ],
  jnpt: [
    { service: 'bulk',            label: 'Bulk',             icon: '⛽', gates: [{ gateNumber: 4,  gateName: 'Gate 4 · Nhava Bulk Quay',     waitMin: 35, queue: 11, status: 'moderate'  }] },
    { service: 'general',         label: 'General Cargo',    icon: '📦', gates: [{ gateNumber: 2,  gateName: 'Gate 2 · General Cargo Berth', waitMin: 20, queue: 6,  status: 'normal'    }] },
    { service: 'container_reefer',label: 'Container/Reefer', icon: '🚢', gates: [{ gateNumber: 1,  gateName: 'Gate 1 · Main Entry Container',waitMin: 48, queue: 16, status: 'congested' }, { gateNumber: 5, gateName: 'Gate 5 · GTI Terminal',   waitMin: 41, queue: 13, status: 'congested' }, { gateNumber: 7, gateName: 'Gate 7 · Reefer Yard', waitMin: 25, queue: 8, status: 'moderate' }] },
    { service: 'express_rail',    label: 'Express Rail',     icon: '🚂', gates: [{ gateNumber: 9,  gateName: 'Gate 9 · Rail Freight',        waitMin: 15, queue: 4,  status: 'normal'    }] },
  ],
  mormugao: [
    { service: 'bulk',            label: 'Bulk',             icon: '⛽', gates: [{ gateNumber: 1,  gateName: 'Gate 1 · Iron Ore Berth A',    waitMin: 12, queue: 3,  status: 'optimal'   }, { gateNumber: 2, gateName: 'Gate 2 · Iron Ore Berth B', waitMin: 16, queue: 4, status: 'normal' }] },
    { service: 'general',         label: 'General Cargo',    icon: '📦', gates: [{ gateNumber: 4,  gateName: 'Gate 4 · MPT General',         waitMin: 10, queue: 2,  status: 'optimal'   }] },
    { service: 'container_reefer',label: 'Container/Reefer', icon: '🚢', gates: [{ gateNumber: 6,  gateName: 'Gate 6 · Container Facility',  waitMin: 14, queue: 3,  status: 'normal'    }] },
    { service: 'express_rail',    label: 'Express Rail',     icon: '🚂', gates: [{ gateNumber: 8,  gateName: 'Gate 8 · Coastal Express',     waitMin: 8,  queue: 1,  status: 'optimal'   }] },
  ],
  mangalore: [
    { service: 'bulk',            label: 'Bulk',             icon: '⛽', gates: [{ gateNumber: 1,  gateName: 'Gate 1 · POL Jetty',           waitMin: 26, queue: 8,  status: 'moderate'  }, { gateNumber: 3, gateName: 'Gate 3 · Fertilizer Berth', waitMin: 33, queue: 10, status: 'moderate' }] },
    { service: 'general',         label: 'General Cargo',    icon: '📦', gates: [{ gateNumber: 2,  gateName: 'Gate 2 · NMP General',         waitMin: 15, queue: 4,  status: 'normal'    }] },
    { service: 'container_reefer',label: 'Container/Reefer', icon: '🚢', gates: [{ gateNumber: 5,  gateName: 'Gate 5 · Container CFS',       waitMin: 19, queue: 5,  status: 'normal'    }, { gateNumber: 7, gateName: 'Gate 7 · Reefer Bay',       waitMin: 22, queue: 6,  status: 'moderate'  }] },
    { service: 'express_rail',    label: 'Express Rail',     icon: '🚂', gates: [{ gateNumber: 9,  gateName: 'Gate 9 · Rail Siding',         waitMin: 13, queue: 2,  status: 'optimal'   }] },
  ],
  cochin: [
    { service: 'bulk',            label: 'Bulk',             icon: '⛽', gates: [{ gateNumber: 2,  gateName: 'Gate 2 · Mattancherry Bulk',   waitMin: 30, queue: 9,  status: 'moderate'  }] },
    { service: 'general',         label: 'General Cargo',    icon: '📦', gates: [{ gateNumber: 1,  gateName: 'Gate 1 · Main Entry',          waitMin: 18, queue: 5,  status: 'normal'    }, { gateNumber: 3, gateName: 'Gate 3 · Ernakulam Wharf',   waitMin: 21, queue: 7,  status: 'moderate'  }] },
    { service: 'container_reefer',label: 'Container/Reefer', icon: '🚢', gates: [{ gateNumber: 5,  gateName: 'Gate 5 · ICTT Vallarpadam',    waitMin: 15, queue: 3,  status: 'normal'    }, { gateNumber: 6, gateName: 'Gate 6 · Reefer Slot',       waitMin: 12, queue: 2,  status: 'optimal'   }] },
    { service: 'express_rail',    label: 'Express Rail',     icon: '🚂', gates: [{ gateNumber: 8,  gateName: 'Gate 8 · Coastal Express',     waitMin: 11, queue: 2,  status: 'optimal'   }] },
  ],
  haldia: [
    { service: 'bulk',            label: 'Bulk',             icon: '⛽', gates: [{ gateNumber: 1,  gateName: 'Gate 1 · HDC Bulk Jetty',      waitMin: 22, queue: 7,  status: 'moderate'  }] },
    { service: 'general',         label: 'General Cargo',    icon: '📦', gates: [{ gateNumber: 2,  gateName: 'Gate 2 · General Multipurpose', waitMin: 14, queue: 4,  status: 'normal'   }, { gateNumber: 4, gateName: 'Gate 4 · SMP Berth',          waitMin: 18, queue: 5,  status: 'normal'    }] },
    { service: 'container_reefer',label: 'Container/Reefer', icon: '🚢', gates: [{ gateNumber: 6,  gateName: 'Gate 6 · Container Terminal',  waitMin: 10, queue: 2,  status: 'optimal'   }] },
    { service: 'express_rail',    label: 'Express Rail',     icon: '🚂', gates: [{ gateNumber: 7,  gateName: 'Gate 7 · Rail Freight CFS',    waitMin: 13, queue: 3,  status: 'normal'    }, { gateNumber: 9,  gateName: 'Gate 9 · Express Rail',     waitMin: 9,  queue: 1,  status: 'optimal'   }] },
  ],
  paradip: [
    { service: 'bulk',            label: 'Bulk',             icon: '⛽', gates: [{ gateNumber: 2,  gateName: 'Gate 2 · Iron Ore Berth',      waitMin: 40, queue: 12, status: 'congested' }, { gateNumber: 4, gateName: 'Gate 4 · Coal Terminal',     waitMin: 31, queue: 10, status: 'moderate'  }] },
    { service: 'general',         label: 'General Cargo',    icon: '📦', gates: [{ gateNumber: 5,  gateName: 'Gate 5 · POT General',         waitMin: 17, queue: 5,  status: 'normal'    }] },
    { service: 'container_reefer',label: 'Container/Reefer', icon: '🚢', gates: [{ gateNumber: 6,  gateName: 'Gate 6 · Container CY',        waitMin: 24, queue: 7,  status: 'moderate'  }] },
    { service: 'express_rail',    label: 'Express Rail',     icon: '🚂', gates: [{ gateNumber: 8,  gateName: 'Gate 8 · POL Express',         waitMin: 11, queue: 3,  status: 'optimal'   }, { gateNumber: 10, gateName: 'Gate 10 · Rail Freight',   waitMin: 14, queue: 4,  status: 'normal'    }] },
  ],
  vizag: [
    { service: 'bulk',            label: 'Bulk',             icon: '⛽', gates: [{ gateNumber: 1,  gateName: 'Gate 1 · Ore Handling Berth',  waitMin: 50, queue: 17, status: 'congested' }, { gateNumber: 3, gateName: 'Gate 3 · Coal Terminal',     waitMin: 42, queue: 13, status: 'congested' }] },
    { service: 'general',         label: 'General Cargo',    icon: '📦', gates: [{ gateNumber: 2,  gateName: 'Gate 2 · VPT General',         waitMin: 24, queue: 7,  status: 'moderate'  }] },
    { service: 'container_reefer',label: 'Container/Reefer', icon: '🚢', gates: [{ gateNumber: 5,  gateName: 'Gate 5 · Container Terminal',  waitMin: 36, queue: 11, status: 'moderate'  }, { gateNumber: 7, gateName: 'Gate 7 · Reefer Facility',  waitMin: 28, queue: 8,  status: 'moderate'  }] },
    { service: 'express_rail',    label: 'Express Rail',     icon: '🚂', gates: [{ gateNumber: 10, gateName: 'Gate 10 · Rail Ramp',          waitMin: 18, queue: 5,  status: 'normal'    }] },
  ],
  chennai: [
    { service: 'bulk',            label: 'Bulk',             icon: '⛽', gates: [{ gateNumber: 2,  gateName: 'Gate 2 · CHPT Bulk Terminal',  waitMin: 47, queue: 15, status: 'congested' }, { gateNumber: 4, gateName: 'Gate 4 · Coal Berth',        waitMin: 39, queue: 12, status: 'congested' }] },
    { service: 'general',         label: 'General Cargo',    icon: '📦', gates: [{ gateNumber: 4,  gateName: 'Gate 4 · General Purpose',     waitMin: 22, queue: 6,  status: 'moderate'  }] },
    { service: 'container_reefer',label: 'Container/Reefer', icon: '🚢', gates: [{ gateNumber: 6,  gateName: 'Gate 6 · Container Terminal',  waitMin: 44, queue: 14, status: 'congested' }, { gateNumber: 7, gateName: 'Gate 7 · Reefer Slot',       waitMin: 30, queue: 9,  status: 'moderate'  }] },
    { service: 'express_rail',    label: 'Express Rail',     icon: '🚂', gates: [{ gateNumber: 7,  gateName: 'Gate 7 · Coastal Express',     waitMin: 19, queue: 5,  status: 'normal'    }, { gateNumber: 10, gateName: 'Gate 10 · Rail ICD',       waitMin: 14, queue: 3,  status: 'normal'    }] },
  ],
  ennore: [
    { service: 'bulk',            label: 'Bulk',             icon: '⛽', gates: [{ gateNumber: 1,  gateName: 'Gate 1 · Coal Handling Berth', waitMin: 16, queue: 4,  status: 'normal'    }] },
    { service: 'general',         label: 'General Cargo',    icon: '📦', gates: [{ gateNumber: 2,  gateName: 'Gate 2 · KPT General',         waitMin: 12, queue: 3,  status: 'optimal'   }] },
    { service: 'container_reefer',label: 'Container/Reefer', icon: '🚢', gates: [{ gateNumber: 3,  gateName: 'Gate 3 · Container / LNG Bay', waitMin: 10, queue: 2,  status: 'optimal'   }] },
    { service: 'express_rail',    label: 'Express Rail',     icon: '🚂', gates: [{ gateNumber: 4,  gateName: 'Gate 4 · Rail Express Siding',waitMin: 8,  queue: 1,  status: 'optimal'   }, { gateNumber: 5,  gateName: 'Gate 5 · Ennore Link Rail', waitMin: 11, queue: 2,  status: 'optimal'   }] },
  ],
};

// ─── Congestion Chart Data (per port) ─────────────────────────────────────────
// Hours: 06,08,10,12,14,16,18,20,22 — wait time in minutes
export const PORT_CONGESTION: Record<string, PortCongestionData> = {
  voc:       { gateLabels: ['Gate 1 (Bulk)', 'Gate 5 (Container)'], series: [[12,18,26,38,48,35,22,14,8], [6,8,10,14,11,9,7,5,4]],   peakGateName: 'Gate 1 · Bulk Terminal',      peakWaitMin: 48, peakTimeWindow: '13:00 – 15:00', peakService: 'Bulk'             },
  deendayal: { gateLabels: ['Gate 2 (Bulk)', 'Gate 5 (Container)'], series: [[8,12,16,22,28,24,18,10,6], [5,7,9,10,9,7,5,4,3]],      peakGateName: 'Gate 6 · Coal Handling',      peakWaitMin: 32, peakTimeWindow: '12:00 – 14:00', peakService: 'Bulk'             },
  mumbai:    { gateLabels: ['Gate 3 (Bulk)', 'Gate 6 (Container)'],  series: [[20,30,42,55,58,50,38,24,14],[18,26,34,44,48,40,30,18,10]], peakGateName: 'Gate 6 · BTPCT Container',   peakWaitMin: 48, peakTimeWindow: '14:00 – 16:00', peakService: 'Container/Reefer' },
  jnpt:      { gateLabels: ['Gate 1 (Container)', 'Gate 4 (Bulk)'],  series: [[22,32,45,52,50,44,36,22,12],[14,18,24,35,38,32,24,16,8]], peakGateName: 'Gate 1 · Main Entry Container', peakWaitMin: 52, peakTimeWindow: '12:00 – 14:00', peakService: 'Container/Reefer' },
  mormugao:  { gateLabels: ['Gate 1 (Bulk)', 'Gate 6 (Container)'],  series: [[6,8,10,13,14,12,9,6,3],   [4,6,8,10,12,10,7,5,3]],    peakGateName: 'Gate 1 · Iron Ore Berth A',  peakWaitMin: 16, peakTimeWindow: '13:00 – 15:00', peakService: 'Bulk'             },
  mangalore:  { gateLabels: ['Gate 1 (Bulk)', 'Gate 5 (Container)'], series: [[10,16,22,30,34,28,20,12,6],[7,10,13,18,22,19,14,9,5]],  peakGateName: 'Gate 3 · Fertilizer Berth',  peakWaitMin: 33, peakTimeWindow: '14:00 – 15:00', peakService: 'Bulk'             },
  cochin:    { gateLabels: ['Gate 2 (Bulk)', 'Gate 5 (Container)'],  series: [[8,12,18,24,28,26,20,14,8],[5,8,11,14,16,14,11,7,4]],  peakGateName: 'Gate 2 · Mattancherry Bulk',  peakWaitMin: 30, peakTimeWindow: '14:00 – 15:00', peakService: 'Bulk'             },
  haldia:    { gateLabels: ['Gate 1 (Bulk)', 'Gate 6 (Container)'],  series: [[8,12,17,22,24,20,15,10,5],[4,6,8,10,12,10,8,5,3]],    peakGateName: 'Gate 1 · HDC Bulk Jetty',    peakWaitMin: 24, peakTimeWindow: '13:00 – 15:00', peakService: 'Bulk'             },
  paradip:   { gateLabels: ['Gate 2 (Bulk)', 'Gate 6 (Container)'],  series: [[16,22,30,38,42,36,28,18,10],[8,10,14,20,26,22,16,10,6]],peakGateName: 'Gate 2 · Iron Ore Berth',   peakWaitMin: 42, peakTimeWindow: '14:00 – 16:00', peakService: 'Bulk'             },
  vizag:     { gateLabels: ['Gate 1 (Bulk)', 'Gate 5 (Container)'],  series: [[18,26,35,46,52,46,36,24,14],[12,18,24,32,38,34,26,18,10]], peakGateName: 'Gate 1 · Ore Handling Berth', peakWaitMin: 52, peakTimeWindow: '14:00 – 15:00', peakService: 'Bulk'             },
  chennai:   { gateLabels: ['Gate 2 (Bulk)', 'Gate 6 (Container)'],  series: [[15,22,32,44,50,46,36,24,14],[14,20,30,42,48,44,34,22,12]], peakGateName: 'Gate 6 · Container Terminal', peakWaitMin: 48, peakTimeWindow: '14:00 – 16:00', peakService: 'Container/Reefer' },
  ennore:    { gateLabels: ['Gate 1 (Coal)', 'Gate 3 (Container)'],  series: [[5,7,10,13,16,14,11,7,4],  [4,5,7,9,11,10,7,5,3]],     peakGateName: 'Gate 1 · Coal Handling Berth',peakWaitMin: 16, peakTimeWindow: '14:00 – 15:00', peakService: 'Bulk'             },
};

// ─── Date Density (0–1 per day, today → today+6) per port ────────────────────
export const PORT_DATE_DENSITY: Record<string, number[]> = {
  voc:       [0.72, 0.55, 0.80, 0.40, 0.65, 0.90, 0.30],
  deendayal: [0.35, 0.42, 0.60, 0.25, 0.50, 0.45, 0.70],
  mumbai:    [0.85, 0.78, 0.92, 0.65, 0.80, 0.75, 0.88],
  jnpt:      [0.90, 0.82, 0.95, 0.70, 0.85, 0.80, 0.92],
  mormugao:  [0.30, 0.25, 0.40, 0.20, 0.35, 0.28, 0.45],
  mangalore: [0.55, 0.60, 0.70, 0.45, 0.62, 0.58, 0.75],
  cochin:    [0.60, 0.52, 0.68, 0.40, 0.65, 0.55, 0.72],
  haldia:    [0.40, 0.38, 0.52, 0.30, 0.45, 0.42, 0.58],
  paradip:   [0.65, 0.58, 0.75, 0.50, 0.70, 0.62, 0.80],
  vizag:     [0.80, 0.72, 0.88, 0.60, 0.78, 0.70, 0.85],
  chennai:   [0.88, 0.80, 0.92, 0.68, 0.82, 0.76, 0.90],
  ennore:    [0.25, 0.20, 0.35, 0.18, 0.30, 0.22, 0.40],
};

// ─── Seeded Bookings (per port) ──────────────────────────────────────────────
export const PORT_BOOKINGS: Record<string, BookingRecord[]> = {
  voc: [
    { id: 'b-voc-1', tokenNumber: 'LGS-VOC-260918-0001', portId: 'voc', service: 'container_reefer', serviceLabel: 'Container/Reefer', gate: 'Gate 5 · Container Terminal', date: todayPlusDays(1), timeWindow: '09:00 – 09:30', vehicleNumber: 'TN-04-E-8821', vehicleType: 'reefer_truck',    driverName: 'Rajesh Kumar',     driverPhone: '+91 98400 12345', driverLicenseOk: true,  destination: 'Madurai Cold Storage, Tamil Nadu', status: 'upcoming',     tier: 'express', tierFee: 500,   cargoType: 'Refrigerated Container' },
    { id: 'b-voc-2', tokenNumber: 'LGS-VOC-260917-0044', portId: 'voc', service: 'bulk',            serviceLabel: 'Bulk',             gate: 'Gate 1 · Bulk Terminal',       date: todayPlusDays(0), timeWindow: '14:15 – 14:45', vehicleNumber: 'TN-09-AB-1234',vehicleType: 'flatbed',         driverName: 'Senthil Murugan',  driverPhone: '+91 98412 34567', driverLicenseOk: true,  destination: 'Tirunelveli Cement Plant, Tamil Nadu', status: 'in_progress', tier: 'standard', tierFee: 0,     cargoType: 'Dry Bulk — Cement' },
    { id: 'b-voc-3', tokenNumber: 'LGS-VOC-260916-0112', portId: 'voc', service: 'general',         serviceLabel: 'General Cargo',    gate: 'Gate 2 · General Berth',        date: todayPlusDays(-2), timeWindow: '11:00 – 11:30', vehicleNumber: 'TN-59-G-5566', vehicleType: 'trailer',         driverName: 'Arumugam Pillai',  driverPhone: '+91 98423 45678', driverLicenseOk: true,  destination: 'Tuticorin Industrial Estate',          status: 'completed',   tier: 'standard', tierFee: 0,     cargoType: 'Break Bulk Goods' },
  ],
  deendayal: [
    { id: 'b-ddy-1', tokenNumber: 'LGS-KLA-260919-0007', portId: 'deendayal', service: 'container_reefer', serviceLabel: 'Container/Reefer', gate: 'Gate 5 · Container Yard', date: todayPlusDays(2), timeWindow: '10:00 – 10:30', vehicleNumber: 'GJ-18-T-4422', vehicleType: 'container_truck', driverName: 'Ramesh Patel',   driverPhone: '+91 98251 98765', driverLicenseOk: true,  destination: 'Ahmedabad ICD, Gujarat',     status: 'upcoming',    tier: 'express', tierFee: 500, cargoType: 'Container — Electronics' },
    { id: 'b-ddy-2', tokenNumber: 'LGS-KLA-260918-0031', portId: 'deendayal', service: 'bulk',            serviceLabel: 'Bulk',             gate: 'Gate 6 · Coal Handling',  date: todayPlusDays(0), timeWindow: '08:30 – 09:00', vehicleNumber: 'GJ-05-A-7788', vehicleType: 'flatbed',         driverName: 'Hitesh Shah',    driverPhone: '+91 98252 87654', driverLicenseOk: true,  destination: 'Rajkot Power Station',        status: 'in_progress', tier: 'standard', tierFee: 0,   cargoType: 'Coal' },
    { id: 'b-ddy-3', tokenNumber: 'LGS-KLA-260916-0088', portId: 'deendayal', service: 'express_rail',    serviceLabel: 'Express Rail',     gate: 'Gate 8 · ICD Rail Ramp', date: todayPlusDays(-3), timeWindow: '16:00 – 16:30', vehicleNumber: 'GJ-01-Z-3311', vehicleType: 'tanker',          driverName: 'Nilesh Patel',   driverPhone: '+91 98253 76543', driverLicenseOk: false, destination: 'Surat Textile Hub',           status: 'completed',   tier: 'urgent',  tierFee: 1000, cargoType: 'Chemical Tanker' },
  ],
  mumbai: [
    { id: 'b-bom-1', tokenNumber: 'LGS-BOM-260920-0003', portId: 'mumbai', service: 'container_reefer', serviceLabel: 'Container/Reefer', gate: 'Gate 6 · BTPCT Container',   date: todayPlusDays(1), timeWindow: '07:30 – 08:00', vehicleNumber: 'MH-01-CE-9900', vehicleType: 'container_truck', driverName: 'Suresh Naik',  driverPhone: '+91 98200 11223', driverLicenseOk: true,  destination: 'Bhiwandi Logistics Park',   status: 'upcoming',    tier: 'urgent',  tierFee: 1000, cargoType: 'High-Value Container' },
    { id: 'b-bom-2', tokenNumber: 'LGS-BOM-260918-0041', portId: 'mumbai', service: 'bulk',            serviceLabel: 'Bulk',             gate: 'Gate 3 · Indira Dock Bulk',   date: todayPlusDays(0), timeWindow: '12:00 – 12:45', vehicleNumber: 'MH-04-AZ-2211', vehicleType: 'flatbed',         driverName: 'Rajan Desai',  driverPhone: '+91 98201 22334', driverLicenseOk: true,  destination: 'Pune Industrial Area',      status: 'in_progress', tier: 'express', tierFee: 500,  cargoType: 'Steel Coils' },
    { id: 'b-bom-3', tokenNumber: 'LGS-BOM-260915-0199', portId: 'mumbai', service: 'general',         serviceLabel: 'General Cargo',    gate: 'Gate 1 · Green Gate',         date: todayPlusDays(-3), timeWindow: '15:30 – 16:00', vehicleNumber: 'MH-02-BA-6655', vehicleType: 'trailer',         driverName: 'Akash More',   driverPhone: '+91 98202 33445', driverLicenseOk: true,  destination: 'Navi Mumbai CFS',           status: 'completed',   tier: 'standard', tierFee: 0,    cargoType: 'General Merchandise' },
  ],
  jnpt: [
    { id: 'b-nsa-1', tokenNumber: 'LGS-NSA-260919-0012', portId: 'jnpt', service: 'container_reefer', serviceLabel: 'Container/Reefer', gate: 'Gate 1 · Main Entry Container', date: todayPlusDays(1), timeWindow: '06:00 – 06:30', vehicleNumber: 'MH-43-AB-0011', vehicleType: 'container_truck', driverName: 'Santosh Yadav', driverPhone: '+91 98210 55667', driverLicenseOk: true,  destination: 'Panvel ICD, Navi Mumbai', status: 'upcoming',    tier: 'urgent',  tierFee: 1000, cargoType: '40FT High Cube Container' },
    { id: 'b-nsa-2', tokenNumber: 'LGS-NSA-260918-0099', portId: 'jnpt', service: 'container_reefer', serviceLabel: 'Container/Reefer', gate: 'Gate 5 · GTI Terminal',        date: todayPlusDays(0), timeWindow: '10:30 – 11:00', vehicleNumber: 'MH-05-CX-5544', vehicleType: 'reefer_truck',    driverName: 'Manoj Sawant', driverPhone: '+91 98211 66778', driverLicenseOk: true,  destination: 'Pune Cold Chain Hub',     status: 'in_progress', tier: 'express', tierFee: 500,  cargoType: 'Perishable Reefer' },
    { id: 'b-nsa-3', tokenNumber: 'LGS-NSA-260914-0227', portId: 'jnpt', service: 'bulk',            serviceLabel: 'Bulk',             gate: 'Gate 4 · Nhava Bulk Quay',     date: todayPlusDays(-4), timeWindow: '13:00 – 13:45', vehicleNumber: 'MH-12-AK-7788', vehicleType: 'tanker',          driverName: 'Dilip Patil',  driverPhone: '+91 98212 77889', driverLicenseOk: true,  destination: 'Raigad Fertilizer Unit',  status: 'completed',   tier: 'standard', tierFee: 0,    cargoType: 'Liquid Chemicals' },
  ],
  mormugao: [
    { id: 'b-mar-1', tokenNumber: 'LGS-MAR-260920-0002', portId: 'mormugao', service: 'bulk',            serviceLabel: 'Bulk',             gate: 'Gate 1 · Iron Ore Berth A', date: todayPlusDays(3), timeWindow: '08:00 – 08:30', vehicleNumber: 'GA-01-A-1234', vehicleType: 'flatbed',         driverName: 'Suraj Naik',    driverPhone: '+91 98221 12345', driverLicenseOk: true,  destination: 'Belgaum Iron Works, Karnataka', status: 'upcoming',    tier: 'standard', tierFee: 0,   cargoType: 'Iron Ore' },
    { id: 'b-mar-2', tokenNumber: 'LGS-MAR-260918-0015', portId: 'mormugao', service: 'container_reefer',serviceLabel: 'Container/Reefer', gate: 'Gate 6 · Container Facility', date: todayPlusDays(-1), timeWindow: '11:00 – 11:30', vehicleNumber: 'GA-03-B-4567', vehicleType: 'container_truck', driverName: 'Raman Gawas',   driverPhone: '+91 98222 23456', driverLicenseOk: true,  destination: 'Panaji Trade Centre',          status: 'completed',   tier: 'express', tierFee: 500, cargoType: 'Container Goods' },
  ],
  mangalore: [
    { id: 'b-mrm-1', tokenNumber: 'LGS-MRM-260919-0008', portId: 'mangalore', service: 'bulk',            serviceLabel: 'Bulk',             gate: 'Gate 1 · POL Jetty', date: todayPlusDays(1), timeWindow: '09:30 – 10:00', vehicleNumber: 'KA-19-B-6633', vehicleType: 'tanker',          driverName: 'Chandan Kumar', driverPhone: '+91 98801 34567', driverLicenseOk: true,  destination: 'Bengaluru Fuel Depot',    status: 'upcoming',    tier: 'express', tierFee: 500, cargoType: 'POL — Petroleum' },
    { id: 'b-mrm-2', tokenNumber: 'LGS-MRM-260917-0033', portId: 'mangalore', service: 'container_reefer',serviceLabel: 'Container/Reefer', gate: 'Gate 5 · Container CFS', date: todayPlusDays(0), timeWindow: '13:00 – 13:30', vehicleNumber: 'KA-01-A-2211', vehicleType: 'container_truck', driverName: 'Anand Shetty',  driverPhone: '+91 98802 45678', driverLicenseOk: true,  destination: 'Mangaluru Industrial Hub', status: 'in_progress', tier: 'standard', tierFee: 0,   cargoType: 'Container — Garments' },
    { id: 'b-mrm-3', tokenNumber: 'LGS-MRM-260914-0077', portId: 'mangalore', service: 'general',         serviceLabel: 'General Cargo',    gate: 'Gate 2 · NMP General',   date: todayPlusDays(-4), timeWindow: '10:00 – 10:30', vehicleNumber: 'KA-04-C-9988', vehicleType: 'trailer',         driverName: 'Raj Suvarna',   driverPhone: '+91 98803 56789', driverLicenseOk: true,  destination: 'Hassan Warehouse',          status: 'completed',   tier: 'standard', tierFee: 0,   cargoType: 'Break Bulk' },
  ],
  cochin: [
    { id: 'b-cok-1', tokenNumber: 'LGS-COK-260921-0001', portId: 'cochin', service: 'container_reefer', serviceLabel: 'Container/Reefer', gate: 'Gate 5 · ICTT Vallarpadam', date: todayPlusDays(2), timeWindow: '07:00 – 07:30', vehicleNumber: 'KL-07-AB-3344', vehicleType: 'container_truck', driverName: 'Thomas Varghese', driverPhone: '+91 98471 12345', driverLicenseOk: true,  destination: 'Ernakulam ICD, Kerala',    status: 'upcoming',    tier: 'express', tierFee: 500, cargoType: 'Container — Spices' },
    { id: 'b-cok-2', tokenNumber: 'LGS-COK-260918-0022', portId: 'cochin', service: 'bulk',            serviceLabel: 'Bulk',             gate: 'Gate 2 · Mattancherry Bulk', date: todayPlusDays(0), timeWindow: '11:30 – 12:00', vehicleNumber: 'KL-01-BZ-8871', vehicleType: 'flatbed',         driverName: 'Raju Menon',      driverPhone: '+91 98472 23456', driverLicenseOk: true,  destination: 'Coimbatore Cement Factory',status: 'in_progress', tier: 'standard', tierFee: 0,   cargoType: 'Limestone Bulk' },
    { id: 'b-cok-3', tokenNumber: 'LGS-COK-260915-0066', portId: 'cochin', service: 'express_rail',    serviceLabel: 'Express Rail',     gate: 'Gate 8 · Coastal Express',  date: todayPlusDays(-3), timeWindow: '15:00 – 15:30', vehicleNumber: 'KL-05-AA-4422', vehicleType: 'trailer',         driverName: 'Joseph Mathew',   driverPhone: '+91 98473 34567', driverLicenseOk: false, destination: 'Thrissur Rail Yard',       status: 'completed',   tier: 'urgent',  tierFee: 1000, cargoType: 'Express Cargo' },
  ],
  haldia: [
    { id: 'b-hld-1', tokenNumber: 'LGS-HLD-260919-0005', portId: 'haldia', service: 'container_reefer', serviceLabel: 'Container/Reefer', gate: 'Gate 6 · Container Terminal', date: todayPlusDays(1), timeWindow: '08:00 – 08:30', vehicleNumber: 'WB-23-A-7722', vehicleType: 'container_truck', driverName: 'Sanjay Das',      driverPhone: '+91 98301 67890', driverLicenseOk: true,  destination: 'Kolkata Bonded Warehouse', status: 'upcoming',    tier: 'express', tierFee: 500, cargoType: 'Container — Jute Goods' },
    { id: 'b-hld-2', tokenNumber: 'LGS-HLD-260917-0019', portId: 'haldia', service: 'bulk',            serviceLabel: 'Bulk',             gate: 'Gate 1 · HDC Bulk Jetty',     date: todayPlusDays(-1), timeWindow: '13:30 – 14:00', vehicleNumber: 'WB-01-E-5544', vehicleType: 'flatbed',         driverName: 'Ramkumar Ghosh',  driverPhone: '+91 98302 78901', driverLicenseOk: true,  destination: 'Durgapur Steel Plant',     status: 'completed',   tier: 'standard', tierFee: 0,   cargoType: 'Iron Ore' },
  ],
  paradip: [
    { id: 'b-pat-1', tokenNumber: 'LGS-PAT-260920-0009', portId: 'paradip', service: 'bulk',            serviceLabel: 'Bulk',             gate: 'Gate 2 · Iron Ore Berth', date: todayPlusDays(1), timeWindow: '09:00 – 09:45', vehicleNumber: 'OD-02-C-6633', vehicleType: 'flatbed',         driverName: 'Bijaya Nayak',   driverPhone: '+91 98611 11223', driverLicenseOk: true,  destination: 'Rourkela Steel Plant, Odisha', status: 'upcoming',    tier: 'urgent',  tierFee: 1000, cargoType: 'Iron Ore Fines' },
    { id: 'b-pat-2', tokenNumber: 'LGS-PAT-260918-0044', portId: 'paradip', service: 'express_rail',    serviceLabel: 'Express Rail',     gate: 'Gate 8 · POL Express',   date: todayPlusDays(0), timeWindow: '14:30 – 15:00', vehicleNumber: 'OD-05-T-2211', vehicleType: 'tanker',          driverName: 'Satyabrata Rath',driverPhone: '+91 98612 22334', driverLicenseOk: true,  destination: 'Bhubaneswar Fuel Terminal',    status: 'in_progress', tier: 'express', tierFee: 500,  cargoType: 'POL' },
    { id: 'b-pat-3', tokenNumber: 'LGS-PAT-260914-0122', portId: 'paradip', service: 'container_reefer',serviceLabel: 'Container/Reefer', gate: 'Gate 6 · Container CY',  date: todayPlusDays(-4), timeWindow: '11:00 – 11:30', vehicleNumber: 'OD-09-G-8811', vehicleType: 'container_truck', driverName: 'Debajit Sahoo', driverPhone: '+91 98613 33445', driverLicenseOk: true,  destination: 'Cuttack Textile Mills',       status: 'completed',   tier: 'standard', tierFee: 0,    cargoType: 'Container Goods' },
  ],
  vizag: [
    { id: 'b-vtz-1', tokenNumber: 'LGS-VTZ-260919-0006', portId: 'vizag', service: 'bulk',            serviceLabel: 'Bulk',             gate: 'Gate 1 · Ore Handling Berth', date: todayPlusDays(1), timeWindow: '07:30 – 08:15', vehicleNumber: 'AP-39-X-1199', vehicleType: 'flatbed',         driverName: 'Suresh Babu',       driverPhone: '+91 98481 99887', driverLicenseOk: true,  destination: 'Vizag Steel Plant, AP',    status: 'upcoming',    tier: 'urgent',  tierFee: 1000, cargoType: 'Iron Ore Pellets' },
    { id: 'b-vtz-2', tokenNumber: 'LGS-VTZ-260918-0055', portId: 'vizag', service: 'container_reefer',serviceLabel: 'Container/Reefer', gate: 'Gate 5 · Container Terminal', date: todayPlusDays(0), timeWindow: '13:00 – 13:30', vehicleNumber: 'AP-16-B-4433', vehicleType: 'container_truck', driverName: 'Krishna Rao',       driverPhone: '+91 98482 88776', driverLicenseOk: true,  destination: 'Hyderabad Logistics Park', status: 'in_progress', tier: 'express', tierFee: 500,  cargoType: '20FT Container' },
    { id: 'b-vtz-3', tokenNumber: 'LGS-VTZ-260915-0188', portId: 'vizag', service: 'general',         serviceLabel: 'General Cargo',    gate: 'Gate 2 · VPT General',        date: todayPlusDays(-3), timeWindow: '16:00 – 16:30', vehicleNumber: 'AP-28-D-7766', vehicleType: 'trailer',         driverName: 'Venkat Naidu',      driverPhone: '+91 98483 77665', driverLicenseOk: true,  destination: 'Vijayawada Warehouse',     status: 'completed',   tier: 'standard', tierFee: 0,    cargoType: 'Break Bulk' },
  ],
  chennai: [
    { id: 'b-maa-1', tokenNumber: 'LGS-MAA-260920-0014', portId: 'chennai', service: 'container_reefer', serviceLabel: 'Container/Reefer', gate: 'Gate 6 · Container Terminal', date: todayPlusDays(1), timeWindow: '06:30 – 07:00', vehicleNumber: 'TN-01-BC-5566', vehicleType: 'container_truck', driverName: 'Selvam Pillai',   driverPhone: '+91 98401 54321', driverLicenseOk: true,  destination: 'Walajapet ICD, Tamil Nadu', status: 'upcoming',    tier: 'urgent',  tierFee: 1000, cargoType: '40FT Reefer Container' },
    { id: 'b-maa-2', tokenNumber: 'LGS-MAA-260918-0077', portId: 'chennai', service: 'bulk',            serviceLabel: 'Bulk',             gate: 'Gate 2 · CHPT Bulk Terminal', date: todayPlusDays(0), timeWindow: '11:00 – 11:45', vehicleNumber: 'TN-07-AY-8877', vehicleType: 'flatbed',         driverName: 'Murugesan R.',    driverPhone: '+91 98402 65432', driverLicenseOk: true,  destination: 'Ennore Thermal Plant',      status: 'in_progress', tier: 'express', tierFee: 500,  cargoType: 'Coal' },
    { id: 'b-maa-3', tokenNumber: 'LGS-MAA-260915-0255', portId: 'chennai', service: 'express_rail',    serviceLabel: 'Express Rail',     gate: 'Gate 10 · Rail ICD',          date: todayPlusDays(-3), timeWindow: '14:30 – 15:00', vehicleNumber: 'TN-22-Z-1133',  vehicleType: 'trailer',         driverName: 'Arjun Sundaram',  driverPhone: '+91 98403 76543', driverLicenseOk: true,  destination: 'Jolarpettai Rail Yard',     status: 'completed',   tier: 'standard', tierFee: 0,    cargoType: 'Express Freight' },
    { id: 'b-maa-4', tokenNumber: 'LGS-MAA-260916-0301', portId: 'chennai', service: 'general',         serviceLabel: 'General Cargo',    gate: 'Gate 4 · General Purpose',    date: todayPlusDays(-2), timeWindow: '09:00 – 09:30', vehicleNumber: 'TN-14-AB-4422', vehicleType: 'trailer',         driverName: 'Balasubramanian S.',driverPhone: '+91 98404 87654', driverLicenseOk: true,  destination: 'Ambattur Industrial Estate',status: 'completed',   tier: 'standard', tierFee: 0,    cargoType: 'General Merchandise' },
  ],
  ennore: [
    { id: 'b-ent-1', tokenNumber: 'LGS-ENT-260920-0003', portId: 'ennore', service: 'bulk',            serviceLabel: 'Bulk',             gate: 'Gate 1 · Coal Handling Berth', date: todayPlusDays(2), timeWindow: '08:00 – 08:30', vehicleNumber: 'TN-12-CD-7744', vehicleType: 'flatbed',         driverName: 'Anbu Arasu',  driverPhone: '+91 98405 98765', driverLicenseOk: true,  destination: 'Ennore Thermal Station', status: 'upcoming',    tier: 'standard', tierFee: 0,   cargoType: 'Coal' },
    { id: 'b-ent-2', tokenNumber: 'LGS-ENT-260918-0011', portId: 'ennore', service: 'container_reefer',serviceLabel: 'Container/Reefer', gate: 'Gate 3 · Container / LNG Bay', date: todayPlusDays(-1), timeWindow: '13:00 – 13:30', vehicleNumber: 'TN-19-AF-3311', vehicleType: 'container_truck', driverName: 'Kalai Selvan',driverPhone: '+91 98406 09876', driverLicenseOk: true,  destination: 'Chennai Logistics Hub', status: 'completed',   tier: 'express', tierFee: 500, cargoType: 'LNG Container' },
  ],
};
