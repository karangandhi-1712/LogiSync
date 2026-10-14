// ─── Guided tour steps ────────────────────────────────────────────────────────
// Targets must match ids that actually exist in the marketplace UI. Steps whose
// target is missing are skipped by TutorialOverlay rather than throwing.

export interface TutorialStep {
  target: string;
  title: string;
  body: string;
  whyItMatters: string;
  essential?: boolean;
}

export const TUTORIAL_STEPS_BY_PAGE: Record<string, TutorialStep[]> = {
  home: [
    {
      target: 'tutorial-driver-home',
      title: 'Your active batch',
      body: 'The batch you have claimed appears here with its area, departure window and earnings.',
      whyItMatters: 'Everything else on this page hangs off one claimed batch.',
      essential: true,
    },
    {
      target: 'tutorial-stop-checklist',
      title: 'Work the stops in order',
      body: 'Each stop has a one-tap status update: Picked up, Arrived, Delivered - or flag it as failed with a short reason.',
      whyItMatters: 'Every tap is audited and pushed live to the customer.',
      essential: true,
    },
    {
      target: 'tutorial-driver-map',
      title: 'The locked route',
      body: 'Once you depart, the stop order and road geometry are fixed and drawn here.',
      whyItMatters: 'A locked route stops the consumer\'s ETA from moving around.',
    },
  ],

  jobs: [
    {
      target: 'tutorial-availability',
      title: 'Control your availability',
      body: 'Only drivers marked available receive new batch broadcasts.',
      whyItMatters: 'Going offline keeps work away while you are busy.',
      essential: true,
    },
    {
      target: 'tutorial-job-feed',
      title: 'Claim a batch',
      body: 'Broadcast batches appear here in real time. Claim one to take it.',
      whyItMatters: 'First to claim wins, so speed matters.',
      essential: true,
    },
  ],

  deliveries: [
    {
      target: 'tutorial-deliveries',
      title: 'Your delivery history',
      body: 'Every batch you have claimed, expandable to show each stop and its outcome.',
      whyItMatters: 'Useful for reconciling earnings against completed work.',
    },
  ],

  'fleet-manage': [
    {
      target: 'tutorial-fm-pending',
      title: 'Pending requests at your depot',
      body: 'Every consumer request waiting to be batched, plotted on the map.',
      whyItMatters: 'This is the raw material for every batch you create.',
      essential: true,
    },
    {
      target: 'tutorial-schedule-creator',
      title: 'Build and broadcast a batch',
      body: 'Set an area and radius, choose which requests ride along, then broadcast to available drivers.',
      whyItMatters: 'Fuller batches mean fewer empty runs and faster claims.',
      essential: true,
    },
    {
      target: 'tutorial-fm-batches',
      title: 'Oversee live batches',
      body: 'Watch who claimed what, reassign an unresponsive driver, or force-lock a batch early.',
      whyItMatters: 'Manual intervention is the safety net when a batch stalls.',
    },
  ],

  analytics: [
    {
      target: 'tutorial-analytics-kpis',
      title: 'Marketplace health',
      body: 'Time to claim, average batch fill, on-time rate and driver utilisation.',
      whyItMatters: 'Time-to-claim and fill together tell you whether the market is liquid.',
      essential: true,
    },
    {
      target: 'tutorial-heatmap-chart',
      title: 'Volume vs deliveries',
      body: 'Submitted against delivered over the selected period.',
      whyItMatters: 'A widening gap means batching capacity is the bottleneck.',
    },
    {
      target: 'tutorial-busiest-areas',
      title: 'Busiest delivery clusters',
      body: 'Areas ranked by stop volume, with the earnings they generated.',
      whyItMatters: 'This is where new broadcast areas should go.',
    },
  ],

  settings: [
    {
      target: 'tutorial-settings',
      title: 'Preferences',
      body: 'Theme, units, alert channels and tutorials.',
      whyItMatters: 'Everything here is stored against your account.',
      essential: true,
    },
  ],
};