export interface TutorialStep {
  id: string;
  target: string; // CSS selector
  title: string;
  body: string;
  whyItMatters: string;
  placement: 'top' | 'bottom' | 'left' | 'right';
  essential: boolean;
  page: string;
}

export const TUTORIAL_STEPS_BY_PAGE: Record<string, TutorialStep[]> = {
  login: [
    {
      id: 'login-roles',
      target: '#tutorial-login-roles',
      title: 'Role-Based Access Control',
      body: 'Select your operational persona: Port Admin (full access), Fleet Manager (live telematics), or Dispatcher (gate slot allocation).',
      whyItMatters: 'Enforces security segregation between terminal gate operators, transport dispatchers, and port authority.',
      placement: 'bottom',
      essential: true,
      page: 'login'
    },
    {
      id: 'login-demo',
      target: '#tutorial-login-demo-btn',
      title: '1-Click Demo Console',
      body: 'Bypass Cognito credentials in local testing with full administrative command rights.',
      whyItMatters: 'Permits instant evaluation of simulated maritime cargo dispatches and corridor bottlenecks.',
      placement: 'top',
      essential: true,
      page: 'login'
    }
  ],
  dashboard: [
    {
      id: 'dash-header',
      target: '#tutorial-dash-status-strip',
      title: 'VOC Port Terminal Operations Strip',
      body: 'Real-time telemetry feeds displaying AIS incoming vessels, yard container density, gate dwell averages, and active quay cranes.',
      whyItMatters: 'Inbound vessel arrivals trigger all downstream gate allocations and container drayage schedules.',
      placement: 'bottom',
      essential: true,
      page: 'dashboard'
    },
    {
      id: 'dash-map',
      target: '#tutorial-map-container',
      title: 'Interactive Leaflet GIS Command Canvas',
      body: 'Pan, zoom, and inspect real-time port maritime boundaries, terminal yards, smart gate lanes, and active vehicle GPS transponders.',
      whyItMatters: 'Provides unified situational awareness across port quayside, highway corridors, and container freight stations.',
      placement: 'right',
      essential: true,
      page: 'dashboard'
    },
    {
      id: 'dash-layers',
      target: '#tutorial-layers-btn',
      title: 'GIS Layer Visibility Toggle',
      body: 'Toggle geofence operational zones, Berth 4 STS crane buffers, and HazMat yard boundaries.',
      whyItMatters: 'Declutters the command view during peak dispatch surges.',
      placement: 'top',
      essential: false,
      page: 'dashboard'
    },
    {
      id: 'dash-reroute',
      target: '#tutorial-reroute-action-btn',
      title: 'Live-Location-Triggered AI Rerouting',
      body: 'Evaluates highway congestion in real-time. Instantly diverts approaching trucks to open gates, avoiding physical queues.',
      whyItMatters: 'Cuts idle fuel burn by up to 35% and prevents multi-kilometer gridlock on NH 38.',
      placement: 'left',
      essential: true,
      page: 'dashboard'
    }
  ],
  slots: [
    {
      id: 'slot-matrix',
      target: '#tutorial-gate-matrix',
      title: 'Four-Gate Congestion Matrix',
      body: 'Displays live queue depth, wait time estimates, and operational states across Gates 1 through 4.',
      whyItMatters: 'Prevents gate overcrowding by directing specific cargo types to designated terminal entries.',
      placement: 'bottom',
      essential: true,
      page: 'slots'
    },
    {
      id: 'slot-ai-pick',
      target: '#tutorial-ai-top-pick',
      title: 'AI Optimizer Top Recommendation',
      body: 'Recommends the lowest-congestion arrival window based on ship unloading schedules and gate throughput.',
      whyItMatters: 'Eliminates peak-hour queue spikes by dynamically smoothing incoming truck waves.',
      placement: 'bottom',
      essential: true,
      page: 'slots'
    },
    {
      id: 'slot-booking-form',
      target: '#tutorial-booking-form',
      title: 'Slot Dispatch & RFID E-Pass Sync',
      body: 'Book targeted arrival slots with vehicle plates, container numbers, and priority tier allocation.',
      whyItMatters: 'Generates automated QR digital entry passes sent via SMS directly to the driver.',
      placement: 'left',
      essential: true,
      page: 'slots'
    }
  ],
  fleet: [
    {
      id: 'fleet-search',
      target: '#tutorial-fleet-search',
      title: 'Multi-Parameter Telematics Filter',
      body: 'Search by vehicle registration plate, driver identity, cargo container code, or duty status.',
      whyItMatters: 'Quickly locates specific hazardous cargo or refrigerated freight needing priority berths.',
      placement: 'bottom',
      essential: true,
      page: 'fleet'
    },
    {
      id: 'fleet-cards',
      target: '#tutorial-fleet-list',
      title: 'Live 24-Vehicle Fleet Roster',
      body: 'Real-time telemetry readouts displaying speed, heading direction, fuel percentages, and cold-chain reefer temperatures.',
      whyItMatters: 'Allows immediate intervention if refrigerated perishable cargo suffers temperature deviations.',
      placement: 'right',
      essential: true,
      page: 'fleet'
    },
    {
      id: 'fleet-network',
      target: '#tutorial-fleet-telecom',
      title: 'GNSS & 5G NR Telemetry Health',
      body: 'Live monitor showing satellite lock count and low-latency wireless communication link quality.',
      whyItMatters: 'Confirms that autonomous truck dispatch commands arrive with sub-5ms latency.',
      placement: 'bottom',
      essential: false,
      page: 'fleet'
    }
  ],
  analytics: [
    {
      id: 'analytics-kpis',
      target: '#tutorial-analytics-kpis',
      title: 'Executive Operational KPIs',
      body: 'Turnaround reductions, fuel saved, gate utilization, and CO2 emissions eliminated through AI coordination.',
      whyItMatters: 'Provides auditable sustainability metrics and port performance benchmarks.',
      placement: 'bottom',
      essential: true,
      page: 'analytics'
    },
    {
      id: 'analytics-heatmap',
      target: '#tutorial-heatmap-chart',
      title: 'Hourly Gate Congestion Heatmap',
      body: 'Visualizes historical and predicted traffic bottlenecks across each gate throughout the working day.',
      whyItMatters: 'Identifies recurring choke points to adjust terminal shift manpower accordingly.',
      placement: 'top',
      essential: true,
      page: 'analytics'
    },
    {
      id: 'analytics-actions',
      target: '#tutorial-analytics-actions',
      title: 'Telemetry Export & Monte Carlo Simulation',
      body: 'Download raw CSV/JSON logs or execute stochastic queue stress tests across hundreds of simulated arrivals.',
      whyItMatters: 'Validates port gate capacity under surge container vessel discharge scenarios.',
      placement: 'left',
      essential: true,
      page: 'analytics'
    }
  ],
  settings: [
    {
      id: 'settings-preferences',
      target: '#tutorial-settings-form',
      title: 'Console Preferences & Notifications',
      body: 'Configure interactive tutorial assistance, theme, default map mode, and automated alert dispatches.',
      whyItMatters: 'Customizes the terminal workspace to suit individual port operator requirements.',
      placement: 'top',
      essential: true,
      page: 'settings'
    }
  ]
};
