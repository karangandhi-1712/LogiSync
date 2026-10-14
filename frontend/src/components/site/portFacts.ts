import type { PortInfo } from '../../data/ports';

/**
 * Port reference data for the hero map popover.
 *
 * Figures are Ministry of Ports, Shipping and Waterways major-port traffic for
 * FY 2024-25, and the "known for" lines are the commonly cited distinguishing
 * fact for each port. Kept deliberately short — three rows plus one line, not a
 * dossier. Keyed by the same ids the app uses in data/ports.ts.
 */
export interface PortFact {
  locode: string;
  /** Year the port was declared a major port. */
  since: string;
  /** The one thing this port is actually known for. */
  known: string;
  cargo: string;
  share: string;
}

export const PORT_FACTS: Record<string, PortFact> = {
  voc: {
    locode: 'INTUT',
    since: '1974',
    known: "India's southernmost container gateway and the third-largest container terminal in the country.",
    cargo: '41.7 MT',
    share: '4.9% of major-port traffic',
  },
  deendayal: {
    locode: 'INIXY',
    since: '1964',
    known: 'Primary maritime gateway for north India, and the fastest-growing major port in FY 2024-25 at +13.4%.',
    cargo: '150.2 MT',
    share: '17.6% — joint largest by volume',
  },
  mumbai: {
    locode: 'INBOM',
    since: '1870',
    known: 'One of the oldest natural harbours in India, still handling POL, dry bulk and break-bulk alongside containers.',
    cargo: '68.6 MT',
    share: '8.0% of major-port traffic',
  },
  jnpt: {
    locode: 'INNSA',
    since: '1989',
    known: "India's largest container port by a wide margin, handling more than half of all major-port TEU traffic.",
    cargo: '92.1 MT',
    share: '53.9% of container TEUs',
  },
  mormugao: {
    locode: 'INMRM',
    since: '1963',
    known: 'Goa’s only major port, sitting at the mouth of the Zuari and serving the state’s iron ore exports.',
    cargo: '18.1 MT',
    share: '2.1% of major-port traffic',
  },
  mangalore: {
    locode: 'INNML',
    since: '1974',
    known: 'Coast Karnataka’s multipurpose port, handling the state’s POL, LPG, fertiliser and iron ore.',
    cargo: '46.0 MT',
    share: '5.4% of major-port traffic',
  },
  cochin: {
    locode: 'INCOK',
    since: '1936',
    known: 'A natural harbour formed in 1341 AD, hosting Vallarpadam — India’s largest container transshipment terminal.',
    cargo: '37.8 MT',
    share: '4.4% of major-port traffic',
  },
  haldia: {
    locode: 'INHAL',
    since: '1977',
    known: 'The only riverine major port in India, on the Hooghly, and the gateway to the Northeast, Nepal and Bhutan.',
    cargo: '47.3 MT',
    share: '5.5% of major-port traffic',
  },
  paradip: {
    locode: 'INPRT',
    since: '1966',
    known: "India's largest major port by cargo, and the first major port built on the East Coast after Independence.",
    cargo: '150.4 MT',
    share: '17.6% — largest by volume',
  },
  vizag: {
    locode: 'INVTZ',
    since: '1964',
    known: "India's deepest landlocked harbour at 16.5 m, and one of the country's oldest natural harbours.",
    cargo: '82.6 MT',
    share: '9.7% of major-port traffic',
  },
  chennai: {
    locode: 'INMAA',
    since: '1661',
    known: "Among India's oldest modern ports, now a leading gateway for automotive exports.",
    cargo: '55.0 MT',
    share: '6.4% of major-port traffic',
  },
  ennore: {
    locode: 'INENR',
    since: '2001',
    known: "India's only corporatised major port, built for TNEB thermal coal and now a multi-cargo terminal.",
    cargo: '48.4 MT',
    share: '5.7% of major-port traffic',
  },
};

export function factsFor(port: PortInfo): PortFact {
  return (
    PORT_FACTS[port.id] ?? {
      locode: '—',
      since: '—',
      known: 'Part of the LogiSync depot network.',
      cargo: '—',
      share: '—',
    }
  );
}