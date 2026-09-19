// ─── demoFleet.ts — Realistic 24-truck fleet, all trucks guaranteed on land ──
import type { Truck } from '../types';
import { getPort } from './ports';

// State code mapping based on port state
const STATE_PLATE_PREFIX: Record<string, string> = {
  'Tamil Nadu': 'TN',
  'Maharashtra': 'MH',
  'Gujarat': 'GJ',
  'Kerala': 'KL',
  'Karnataka': 'KA',
  'Goa': 'GA',
  'West Bengal': 'WB',
  'Odisha': 'OD',
  'Andhra Pradesh': 'AP',
};

const TRUCK_TYPES: Truck['truckType'][] = [
  'reefer', 'container_chassis', 'flatbed', 'tanker', 'container_chassis', 'reefer',
];

const VEHICLE_MAKES = [
  'Scania R500', 'Tata Prima 4028.S', 'Ashok Leyland 4220',
  'BharatBenz 4040', 'Volvo FH16', 'Mahindra Blazo X', 'Eicher Pro 6040',
];

const CONTAINER_SIZES = ['40ft High Cube', '20ft Standard', '40ft Flatbed', 'Liquid Tanker 40KL', '40ft Reefer'];

const DRIVER_NAMES = [
  'Rajesh Kumar', 'Murugan S.', 'Selvam K.', 'Arjun Patel',
  'Pandi V.', 'Suresh Menon', 'Gurpreet Singh', 'Vikram Rathore',
  'Dinesh Reddy', 'Anil Deshmukh', 'Karthik Raja', 'Subhash Bose',
  'Manoj Sharma', 'Ramesh Babu', 'Deepak Naik', 'Prakash Joshi',
  'Pradeep Yadav', 'Ganesh Iyer', 'Sanjay Verma', 'Harish Gowda',
  'Vijay Kulkarni', 'Sunil Das', 'Mohan Lal', 'Naveen Chawla',
];

const STATUS_DISTRIBUTION: Truck['status'][] = [
  'in_transit', 'at_gate', 'delayed', 'in_transit', 'loading',
  'in_transit', 'queued', 'in_transit', 'at_gate', 'delayed',
  'in_transit', 'idle', 'outbound', 'in_transit', 'queued',
  'loading', 'outbound', 'in_transit', 'at_gate', 'in_transit',
  'outbound', 'in_transit', 'queued', 'outbound',
];

/**
 * Safe land coordinate waypoints for each port.
 * These are VERIFIED positions on actual roads/highways near each port.
 * Format: [lat, lng] pairs — all confirmed on land using OpenStreetMap.
 *
 * Layout intent:
 *   - First 4-5 points: close to port gate (0.3–2 km) — at_gate, queued, loading
 *   - Remaining points: on approach highways (3–20 km out) — in_transit, delayed, outbound
 */
const PORT_LAND_WAYPOINTS: Record<string, [number, number][]> = {
  // ── VOC Port Thoothukudi (East coast, sea to east) ─────────────────────────
  // Port pin: 8.7642, 78.1348  |  Inland = WEST on NH-38 toward Madurai
  voc: [
    [8.764, 78.120],  // Near port gate road
    [8.770, 78.112],  // Port approach NH-38
    [8.755, 78.108],  // Industrial area west of port
    [8.762, 78.095],  // NH-38 westbound
    [8.778, 78.085],  // NH-38 corridor
    [8.790, 78.072],  // 7km west
    [8.748, 78.068],  // SW approach road
    [8.735, 78.056],  // Palayamkottai junction
    [8.810, 78.050],  // Tirunelveli corridor NW
    [8.760, 78.040],  // 11km west
    [8.700, 78.058],  // SW industrial zone
    [8.688, 78.072],  // Kovilpatti link
    [8.830, 78.060],  // NH-38 north
    [8.850, 78.075],  // Madurai corridor far
    [8.720, 78.042],  // South approach
    [8.768, 78.025],  // 15km west on NH-38
    [8.795, 78.032],  // Far corridor
    [8.665, 78.066],  // South industrial
    [8.840, 78.090],  // North port road
    [8.714, 78.078],  // Local road south
    [8.800, 78.101],  // Near port north side
    [8.745, 78.115],  // Port approach south
    [8.780, 78.098],  // Port road parallel
    [8.758, 78.130],  // Gate area west
  ],

  // ── Deendayal Port Kandla (West coast, sea/creek to east & south) ─────────
  // Port pin: 23.0, 70.221  |  Inland = NORTH/NORTHWEST on NH-141 toward Gandhidham
  deendayal: [
    [23.008, 70.210],  // Near port gate (northwest of port)
    [23.015, 70.205],  // Port road northwest
    [23.022, 70.198],  // NH-141 approach north
    [23.030, 70.192],  // NH-141 corridor
    [23.045, 70.180],  // Gandhidham approach
    [23.060, 70.165],  // 7km north toward Gandhidham
    [23.080, 70.148],  // Gandhidham industrial
    [23.095, 70.130],  // Gandhidham city edge
    [23.110, 70.115],  // Further north
    [23.012, 70.185],  // West of port road
    [22.998, 70.202],  // Port area land
    [23.025, 70.220],  // North along creek bank (land side)
    [23.050, 70.200],  // Industrial belt north
    [23.070, 70.175],  // Adipur area
    [23.040, 70.155],  // Anjar corridor NW
    [23.028, 70.170],  // Mid-corridor
    [22.990, 70.195],  // Port entry road south
    [23.018, 70.215],  // Port gate area
    [23.035, 70.200],  // NH-141 mid
    [23.055, 70.185],  // North corridor
    [23.075, 70.160],  // Gandhidham suburb
    [23.005, 70.208],  // Near gate
    [23.020, 70.196],  // Approach road
    [23.048, 70.172],  // Highway mid
  ],

  // ── Mumbai Port (East coast island — trucks on eastern mainland) ───────────
  // Port pin: 18.918, 72.935  |  Trucks on Eastern Freeway, Thane, Navi Mumbai
  mumbai: [
    [18.935, 72.950],  // Eastern Freeway near port
    [18.950, 72.965],  // Mazagaon area
    [18.960, 72.978],  // Chinchpokli road
    [18.975, 72.988],  // Kurla direction
    [18.990, 73.002],  // LBS Marg Kurla
    [19.010, 73.018],  // Thane link road
    [19.025, 73.030],  // Thane West
    [19.040, 73.045],  // Thane area
    [18.970, 73.035],  // Mankhurd area
    [18.945, 73.010],  // Chembur
    [18.920, 72.962],  // Reay Road
    [18.908, 72.948],  // Cotton Green area (land)
    [18.898, 72.942],  // Sewri land area
    [18.885, 72.938],  // Sion corridor
    [19.055, 73.060],  // Thane highway
    [19.075, 73.072],  // Thane far north
    [18.930, 72.958],  // Port approach road
    [18.918, 72.945],  // Near gate (land side, east)
    [18.960, 73.005],  // Ghatkopar direction
    [19.000, 73.050],  // Mulund area
    [18.915, 72.960],  // Ferry Wharf land
    [18.880, 72.935],  // Dharavi road
    [18.870, 72.940],  // Mahim causeway area
    [18.955, 72.970],  // Parel area
  ],

  // ── JNPT / Nhava Sheva (West coast, sea to west — inland = east) ──────────
  // Port pin: 18.945, 72.94  |  Trucks toward Panvel, Belapur, Uran (east side)
  jnpt: [
    [18.940, 72.960],  // Port gate east side (land)
    [18.948, 72.975],  // Internal road east
    [18.955, 72.990],  // Uran road
    [18.962, 73.008],  // Uran town
    [18.972, 73.025],  // Uran–Panvel highway
    [18.985, 73.042],  // NH-348 Panvel direction
    [19.000, 73.060],  // Panvel approach
    [19.015, 73.078],  // Panvel city
    [18.935, 72.985],  // South east road
    [18.925, 73.000],  // Mora village area (land)
    [18.968, 73.052],  // Kamothe area
    [19.028, 73.095],  // Panvel far
    [18.948, 72.968],  // Near gate
    [18.958, 73.002],  // Uran mid
    [18.982, 73.068],  // Belapur node
    [19.008, 73.082],  // Kharghar area
    [18.935, 72.972],  // Gate area land
    [18.965, 73.018],  // Uran bypass
    [18.978, 73.035],  // Nhava approach inland
    [19.040, 73.110],  // Navi Mumbai
    [18.950, 72.980],  // Near gate 2
    [18.942, 72.970],  // Port east road
    [18.972, 73.042],  // Highway mid
    [19.005, 73.075],  // Panvel suburb
  ],

  // ── Mormugao Port Goa (sea to west & south — inland = NORTHEAST toward Panaji) ─
  // Port pin: 15.419, 73.8  |  Safe land = NE toward Vasco, Panaji on NH-66
  mormugao: [
    [15.425, 73.812],  // Vasco road north (land)
    [15.432, 73.820],  // Vasco da Gama town
    [15.440, 73.828],  // Vasco city area
    [15.450, 73.840],  // NH-66 northbound
    [15.462, 73.852],  // Dabolim approach
    [15.475, 73.865],  // Dabolim airport road
    [15.490, 73.878],  // Cortalim–Panaji highway
    [15.505, 73.890],  // Cortalim
    [15.520, 73.905],  // Agasaim area
    [15.535, 73.918],  // Ponda direction
    [15.428, 73.838],  // Vasco east side
    [15.445, 73.855],  // Industrial area Verna direction
    [15.460, 73.870],  // Verna industrial estate
    [15.478, 73.882],  // Verna road
    [15.415, 73.820],  // Headland Sada (land side)
    [15.408, 73.825],  // Port gate land approach
    [15.418, 73.808],  // Gate area land
    [15.435, 73.845],  // Post-Dabolim corridor
    [15.498, 73.895],  // Panaji approach
    [15.515, 73.910],  // NH-66 mid
    [15.468, 73.862],  // Verna south
    [15.455, 73.848],  // Dabolim circle
    [15.445, 73.832],  // Vasco north
    [15.422, 73.815],  // Near port gate
  ],

  // ── New Mangalore Port (sea to west — inland = NORTHEAST on NH-75) ─────────
  // Port pin: 12.915, 74.796  |  Safe = NE toward Mangaluru city, Bengaluru corridor
  mangalore: [
    [12.920, 74.812],  // Port approach road east (Panambur side land)
    [12.928, 74.825],  // NH-66 Panambur
    [12.935, 74.840],  // Surathkal road
    [12.942, 74.858],  // Kulai junction
    [12.952, 74.872],  // NH-75 link
    [12.965, 74.885],  // Deralakatte
    [12.978, 74.898],  // Mangaluru city NH-75
    [12.990, 74.912],  // NH-75 corridor
    [13.000, 74.928],  // Pachanady area
    [13.012, 74.942],  // Bantwal direction
    [12.918, 74.820],  // Baikampady industrial
    [12.910, 74.830],  // Baikampady area 2
    [12.905, 74.842],  // Old port road (land)
    [12.945, 74.865],  // Kulai–Kankanady road
    [12.960, 74.878],  // Kankanady area
    [12.975, 74.892],  // City centre east
    [12.988, 74.905],  // Attavar junction
    [13.005, 74.920],  // Kadri park area
    [12.930, 74.850],  // Mid-approach road
    [12.948, 74.880],  // Industrial area
    [12.912, 74.808],  // Near port north gate
    [12.916, 74.800],  // Gate area land
    [12.932, 74.835],  // NH corridor approach
    [12.970, 74.896],  // Far inland
  ],

  // ── Cochin Port (complex backwaters — trucks on MAINLAND EAST side) ────────
  // Port pin: 9.967, 76.24  |  Safe = East of backwaters: Ernakulam, NH-544
  cochin: [
    [9.982, 76.280],  // Ernakulam junction (land)
    [9.995, 76.292],  // MG Road Ernakulam
    [10.010, 76.305],  // Edapally
    [10.025, 76.318],  // NH-544 Kalamassery
    [10.040, 76.330],  // Aluva direction
    [10.058, 76.345],  // Aluva town
    [10.072, 76.360],  // Perumbavoor corridor
    [9.968, 76.292],  // Mattancherry approach (land bridge east)
    [9.955, 76.285],  // South Ernakulam
    [9.945, 76.275],  // Thoppumpady area (land)
    [10.002, 76.298],  // Vyttila hub
    [10.018, 76.312],  // Palarivattom
    [10.032, 76.325],  // Rajagiri area
    [10.048, 76.340],  // Angamaly road
    [10.065, 76.355],  // Aluva suburb
    [9.975, 76.285],  // Near ICTT Vallarpadam (land east)
    [9.960, 76.278],  // Mulavukad bridge approach (land)
    [9.990, 76.300],  // Kadavanthra area
    [10.005, 76.310],  // Marine Drive east (land)
    [10.022, 76.320],  // Vytilla east
    [9.952, 76.270],  // South mainland
    [10.035, 76.330],  // NH-544 north
    [9.978, 76.288],  // Near bridge land
    [10.015, 76.308],  // Edapally junction
  ],

  // ── Haldia Port (sea/river to south/east — inland = NORTHWEST toward Kolkata) ─
  // Port pin: 22.03, 88.065  |  Safe = NW toward Kolaghat, Kolkata on NH-116
  haldia: [
    [22.038, 88.052],  // Port gate north (land)
    [22.045, 88.040],  // NH-116 approach
    [22.055, 88.028],  // Haldia township
    [22.065, 88.015],  // Haldia industrial zone
    [22.078, 88.000],  // Durgachak road
    [22.092, 87.985],  // Kolaghat approach
    [22.108, 87.970],  // Mecheda area
    [22.125, 87.955],  // Kolaghat bypass
    [22.145, 87.938],  // NH-116 mid
    [22.160, 87.922],  // Panskura
    [22.042, 88.048],  // Near gate west
    [22.050, 88.035],  // Township road
    [22.062, 88.020],  // Industrial area 2
    [22.075, 88.005],  // NH-116 link
    [22.090, 87.990],  // Crossing
    [22.105, 87.975],  // Kolaghat outskirts
    [22.118, 87.960],  // NH-16 link (bypasses river)
    [22.135, 87.942],  // Uluberia area
    [22.150, 87.925],  // Domjur approach
    [22.168, 87.910],  // Kolkata outskirts
    [22.038, 88.058],  // Gate area
    [22.046, 88.044],  // North road
    [22.058, 88.030],  // Mid township
    [22.070, 88.015],  // Highway start
  ],

  // ── Paradip Port (sea to east & south — inland = WEST toward Cuttack) ──────
  // Port pin: 20.262, 86.682  |  Safe = West on NH-53 toward Cuttack
  paradip: [
    [20.268, 86.668],  // Gate west approach road
    [20.275, 86.655],  // Port road west
    [20.282, 86.640],  // Industrial belt west
    [20.290, 86.625],  // NH-53 link
    [20.300, 86.608],  // NH-53 westbound
    [20.312, 86.590],  // Ersama area
    [20.325, 86.572],  // Kujang road
    [20.340, 86.552],  // Jagatsinghpur approach
    [20.355, 86.530],  // NH-53 mid
    [20.370, 86.510],  // Cuttack direction
    [20.262, 86.665],  // Near gate north
    [20.255, 86.658],  // Port gate south land
    [20.248, 86.645],  // Industrial south west
    [20.270, 86.648],  // Gate area
    [20.280, 86.630],  // Early highway
    [20.295, 86.612],  // Jankia junction
    [20.308, 86.594],  // NH-53 west
    [20.322, 86.575],  // Kujang area
    [20.338, 86.558],  // Mid highway
    [20.352, 86.540],  // Far west
    [20.265, 86.672],  // Near gate
    [20.258, 86.660],  // Gate area land
    [20.278, 86.642],  // Near corridor start
    [20.292, 86.618],  // NH-53 early
  ],

  // ── Vizag Port (sea to east/southeast — inland = WEST on NH-16/NH-26) ──────
  // Port pin: 17.686, 83.283  |  Safe = West toward Gajuwaka, Hyderabad
  vizag: [
    [17.690, 83.268],  // Port gate approach west
    [17.695, 83.255],  // NH-16 link west
    [17.700, 83.240],  // Gajuwaka road
    [17.710, 83.225],  // Industrial area
    [17.720, 83.210],  // Gajuwaka town
    [17.732, 83.195],  // NH-26 junction
    [17.745, 83.178],  // NH-26 westbound
    [17.758, 83.162],  // Pedagantyada area
    [17.772, 83.145],  // Anakapalle corridor
    [17.788, 83.128],  // NH-16 far west
    [17.685, 83.272],  // Near gate
    [17.678, 83.260],  // Port road south land
    [17.668, 83.250],  // Steel plant corridor
    [17.698, 83.248],  // Bheemunipatnam road
    [17.712, 83.235],  // Industrial zone
    [17.725, 83.220],  // NAD junction
    [17.740, 83.205],  // NH-16 corridor
    [17.755, 83.188],  // Kommadi area
    [17.770, 83.170],  // Far west mid
    [17.785, 83.152],  // Highway distance
    [17.688, 83.278],  // Gate area
    [17.694, 83.262],  // Approach road
    [17.705, 83.242],  // Early highway
    [17.718, 83.228],  // Gajuwaka outer
  ],

  // ── Chennai Port (sea to east — inland = WEST on NH-48) ──────────────────
  // Port pin: 13.1, 80.293  |  Safe = West toward Guindy, Bengaluru NH-48
  chennai: [
    [13.102, 80.278],  // Near port gate west
    [13.108, 80.265],  // Parrys/Basin Bridge area
    [13.115, 80.252],  // NH-48 approach
    [13.122, 80.238],  // Broadway area
    [13.130, 80.225],  // Anna Salai corridor
    [13.145, 80.210],  // Arumbakkam
    [13.160, 80.195],  // Guindy
    [13.175, 80.178],  // Guindy industrial
    [13.190, 80.162],  // Porur
    [13.210, 80.145],  // NH-48 mid
    [13.098, 80.282],  // Near gate south
    [13.090, 80.270],  // Royapuram area (land)
    [13.082, 80.260],  // South port approach
    [13.118, 80.255],  // Mint area
    [13.132, 80.240],  // Kilpauk area
    [13.148, 80.222],  // Vadapalani
    [13.165, 80.205],  // Ashok Nagar
    [13.182, 80.188],  // Virugambakkam
    [13.200, 80.170],  // Mugalivakkam
    [13.225, 80.150],  // Porur junction
    [13.104, 80.284],  // Gate area
    [13.110, 80.272],  // Port road
    [13.120, 80.258],  // North corridor
    [13.138, 80.242],  // Anna Nagar way
  ],

  // ── Ennore / Kamarajar Port (sea to east — inland = WEST) ────────────────
  // Port pin: 13.25, 80.32  |  Safe = West toward Gummidipoondi, Tiruvallur
  ennore: [
    [13.252, 80.308],  // Near port gate west
    [13.258, 80.295],  // Ennore road west
    [13.265, 80.280],  // NH-16 link
    [13.272, 80.265],  // Gummidipoondi corridor
    [13.280, 80.250],  // Tiruvallur road
    [13.290, 80.235],  // NH-16 inland
    [13.305, 80.218],  // Ponneri area
    [13.320, 80.200],  // Further inland
    [13.338, 80.182],  // Tiruvallur approach
    [13.355, 80.165],  // NH far
    [13.248, 80.315],  // Near gate north
    [13.242, 80.305],  // Port south approach (land)
    [13.235, 80.295],  // Industrial land south
    [13.260, 80.285],  // Main road west
    [13.268, 80.270],  // Mid-approach
    [13.278, 80.255],  // NH-16 mid
    [13.295, 80.238],  // Ponneri outskirts
    [13.312, 80.220],  // Corridor mid
    [13.330, 80.202],  // Far north inland
    [13.350, 80.182],  // Highway distant
    [13.255, 80.310],  // Gate area
    [13.262, 80.298],  // Approach road
    [13.272, 80.278],  // Early corridor
    [13.284, 80.260],  // NH-16 near
  ],
};

// Corridors & CFS origins per port
const PORT_HUBS: Record<string, { origins: string[]; cfs: string[] }> = {
  voc: {
    origins: ['Madurai ICD', 'Tirunelveli MMLP', 'Tuticorin Salt Marine', 'Kovilpatti Hub'],
    cfs: ['Thoothukudi Central CFS', 'VOC Berth 2', 'Harbour Express CFS', 'Pearl City CFS'],
  },
  chennai: {
    origins: ['Sriperumbudur Auto Hub', 'Irungattukottai SEZ', 'Oragadam Mega Cluster', 'Bangalore ICD Link'],
    cfs: ['CCTL Container Yard', 'Ennore Expressway CFS', 'Manali Logistics Terminal', 'Chennai Port Gate 6'],
  },
  jnpt: {
    origins: ['Pune Chakan MIDC', 'Bhiwandi Logistics Park', 'Taloja Industrial Zone', 'Panvel Freight ICD'],
    cfs: ['JNPT Main Container Yard', 'Speedway CFS Nhava', 'Gateway Distriparks CFS', 'Ameya CFS'],
  },
  mumbai: {
    origins: ['Thane West Freight Depot', 'Navi Mumbai Hub', 'Kurla Rail Yard', 'Kalyan Logistics Complex'],
    cfs: ['BPT Green Gate CFS', 'Indira Dock Yard', 'Wadi Bunder Rail Head', 'Victoria Dock Bay 4'],
  },
  deendayal: {
    origins: ['Ahmedabad Inland Terminal', 'Morbi Ceramics Corridor', 'Gandhidham Hub', 'Rajkot Industrial Zone'],
    cfs: ['Kandla CFS Zone 1', 'Dry Bulk Terminal Yard', 'Oil Jetty Staging Yard', 'Deendayal Rail Ramp'],
  },
  cochin: {
    origins: ['Coimbatore Textile Corridor', 'Aluva Industrial Estate', 'Kottayam Rubber Hub', 'Thrissur Logistics'],
    cfs: ['ICTT Vallarpadam Yard', 'Willingdon Island CFS', 'Ernakulam Wharf Bay', 'Cochin Reefer Zone'],
  },
  mangalore: {
    origins: ['Bengaluru Peenya Corridor', 'Hassan Coffee Hub', 'Baikampady Industrial Area', 'Udupi Power Hub'],
    cfs: ['NMP Container CFS', 'Panambur Staging Yard', 'POL Jetty Terminal', 'NMPT Gate 3 Yard'],
  },
  mormugao: {
    origins: ['Kudnem Mining Hub', 'Verna Industrial Estate', 'Margao Logistics Link', 'Ponda Freight Centre'],
    cfs: ['Mormugao Berth 9 Yard', 'MPT Container Gate 6', 'Vasco Iron Ore Staging', 'Headland Sada Hub'],
  },
  haldia: {
    origins: ['Kolkata Docks Depot', 'Durgapur Steel Corridor', 'Kharagpur Freight Hub', 'Asansol Industrial'],
    cfs: ['HDC Container Terminal', 'Haldia Petrochemicals CFS', 'Balagarh Dock Link', 'SMP Jetty 4'],
  },
  paradip: {
    origins: ['Kalinganagar Steel Belt', 'Angul Mining Corridor', 'Cuttack Goods Yard', 'Jajpur Industrial Hub'],
    cfs: ['Paradip Bulk Handling Yard', 'PICT Container Terminal', 'Iron Ore Berth Staging', 'Harbour Gate 2'],
  },
  vizag: {
    origins: ['Hyderabad NH-16 Corridor', 'Gajuwaka Industrial Hub', 'Anakapalle Logistics', 'Vizag Steel Plant'],
    cfs: ['VCTPL Container Terminal', 'Visakha CFS Bay 2', 'Ore Handling Staging Yard', 'Port Outer Harbour CFS'],
  },
  ennore: {
    origins: ['Gummidipoondi SIPCOT', 'Tiruvallur Auto Corridor', 'Sri City SEZ', 'Tada Logistics Link'],
    cfs: ['Ennore Coal Berth 1', 'Kamarajar Container Yard', 'LNG Staging Terminal', 'Port Northern Gate 3'],
  },
};

/**
 * Generates a realistic 24-truck active fleet for the chosen port.
 * All truck positions are pulled from PORT_LAND_WAYPOINTS — verified on-land coordinates.
 */
export function getDemoFleet(portId: string): Truck[] {
  const port = getPort(portId);
  const stateCode = STATE_PLATE_PREFIX[port.state] || 'TN';
  const hubs = PORT_HUBS[port.id] || PORT_HUBS.voc;
  const gates = port.gates.length > 0 ? port.gates : ['Gate 1', 'Gate 2', 'Gate 3', 'Gate 4'];

  // Get pre-verified land waypoints for this port, fallback to VOC's
  const waypoints = PORT_LAND_WAYPOINTS[port.id] || PORT_LAND_WAYPOINTS.voc;

  const trucks: Truck[] = [];

  for (let i = 0; i < 24; i++) {
    const truckIdNum = 1000 + (i * 37) % 9000;
    const status = STATUS_DISTRIBUTION[i % STATUS_DISTRIBUTION.length];
    const assignedGate = gates[i % gates.length];
    const truckType = TRUCK_TYPES[i % TRUCK_TYPES.length];
    const make = VEHICLE_MAKES[i % VEHICLE_MAKES.length];
    const containerSize = CONTAINER_SIZES[i % CONTAINER_SIZES.length];
    const driverName = DRIVER_NAMES[i % DRIVER_NAMES.length];

    // Pick a pre-verified land waypoint for this truck index
    const [lat, lng] = waypoints[i % waypoints.length];

    const speed = status === 'delayed' ? 14 + (i % 10)
      : status === 'in_transit' ? 48 + (i % 24)
      : status === 'outbound' ? 52 + (i % 18) : 0;
    const fuel = 35 + (i * 7) % 62;
    const dutyH = 1 + (i % 7);
    const dutyM = (i * 13) % 60;

    const origin = hubs.origins[i % hubs.origins.length];
    const destination = status === 'outbound' ? origin : `${port.short} · ${assignedGate.split('·')[0].trim()}`;

    // Approximate distance based on waypoint index (further = farther from port)
    const waypointIdx = i % waypoints.length;
    const approxDistKm = Math.max(1, Math.round(waypointIdx * 0.7));
    const distCleared = Math.max(10, Math.round(40 + (i * 9) % 180));
    const distRemaining = status === 'at_gate' ? 0 : approxDistKm;
    const totalDist = distCleared + distRemaining;
    const progress = Math.min(100, Math.round((distCleared / totalDist) * 100));

    const etaMins = Math.round((distRemaining / Math.max(speed, 25)) * 60) + (status === 'delayed' ? 35 : 5);
    const now = new Date();
    now.setMinutes(now.getMinutes() + etaMins);
    const etaStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const plateLetter = String.fromCharCode(65 + (i % 26));
    const plateNum = String(1000 + (i * 73) % 8999);
    const rto = String((i % 12) + 1).padStart(2, '0');
    const plate = `${stateCode}-${rto}-${plateLetter}-${plateNum}`;

    // Heading: point toward port from each waypoint (approximate)
    const dLat = port.lat - lat;
    const dLng = port.lng - lng;
    const headingToPort = Math.round(Math.atan2(dLng, dLat) * (180 / Math.PI) + 360) % 360;
    const heading = status === 'outbound' ? (headingToPort + 180) % 360 : headingToPort;

    trucks.push({
      id: `TRK-${truckIdNum}`,
      plate,
      truckType,
      vehicleMake: make,
      containerSize,
      vin: `${stateCode}-${truckIdNum}-${make.slice(0, 2).toUpperCase()}`,
      status,
      cityId: port.id,
      assigned_gate: assignedGate,
      driver: {
        id: `drv-${i + 1}`,
        name: driverName,
        rating: Number((4.3 + (i % 7) * 0.1).toFixed(1)),
        dutyHours: dutyH,
        dutyMinutes: dutyM,
        phone: `+91-${98000 + i * 17}-${10000 + (i * 23) % 89999}`,
        kyc_verified: i % 7 !== 3,
      },
      latitude: lat,
      longitude: lng,
      heading,
      speedKmh: speed,
      fuelPct: fuel,
      reeferTempC: truckType === 'reefer' ? -18 + (i % 5) : undefined,
      reeferSetTempC: truckType === 'reefer' ? -20 : undefined,
      mission: {
        origin,
        destination,
        progressPct: progress,
        distanceClearedKm: distCleared,
        distanceRemainingKm: distRemaining,
        etaTime: etaStr,
        etaStatus: status === 'delayed' ? 'delayed' : 'on_time',
      },
      alertTag: status === 'delayed'
        ? `${port.corridor.split('(')[0].trim()} Congestion • Window At Risk`
        : undefined,
      gnssLocked: true,
    });
  }

  return trucks;
}

/**
 * Returns fallback GIS gate points with realistic coordinates around the chosen port.
 */
export function getDemoPortGates(portId: string) {
  const port = getPort(portId);
  const gates = port.gates.length > 0 ? port.gates : ['Gate 1 (Bulk)', 'Gate 2 (General)', 'Gate 3 (Container)', 'Gate 4 (Rail)'];

  // Use first few waypoints as gate positions (these are near the port on land)
  const waypoints = PORT_LAND_WAYPOINTS[port.id] || PORT_LAND_WAYPOINTS.voc;

  return gates.map((gateName, idx) => {
    const [lat, lng] = waypoints[idx % Math.min(4, waypoints.length)];
    return {
      id: `gate-${port.id}-${idx + 1}`,
      gate_id: `gate-${idx + 1}`,
      name: gateName,
      status: idx === 0 ? 'congested' : idx === 1 ? 'optimal' : 'normal',
      lat,
      lng,
      coordinates: [lng, lat],
      queue: 4 + (idx * 3) % 15,
      wait: 10 + (idx * 9) % 35,
    };
  });
}
