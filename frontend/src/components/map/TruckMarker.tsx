import { useEffect, useRef } from 'react';
import type { Truck } from '../../types';

interface TruckMarkerProps {
  map: google.maps.Map | null;
  truck: Truck;
  onClick?: (truck: Truck) => void;
}

const STATUS_COLORS: Record<string, string> = {
  in_transit: '#10b981',
  at_gate:    '#f59e0b',
  loading:    '#3b82f6',
  delayed:    '#ef4444',
  idle:       '#94a3b8',
  outbound:   '#06b6d4',
};

function buildTruckSVG(color: string, heading: number): string {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
      <g transform="rotate(${heading}, 20, 20)">
        <circle cx="20" cy="20" r="16" fill="${color}" fill-opacity="0.15" stroke="${color}" stroke-width="1.5"/>
        <circle cx="20" cy="20" r="8" fill="${color}"/>
        <polygon points="20,8 24,16 16,16" fill="white" opacity="0.9"/>
      </g>
    </svg>
  `.trim();
}

export function TruckMarker({ map, truck, onClick }: TruckMarkerProps) {
  const markerRef = useRef<google.maps.Marker | null>(null);

  useEffect(() => {
    if (!map || typeof google === 'undefined') return;

    const color = STATUS_COLORS[truck.status] || '#94a3b8';
    const svg   = buildTruckSVG(color, truck.heading);

    const marker = new google.maps.Marker({
      position: { lat: truck.latitude, lng: truck.longitude },
      map,
      icon: {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
        scaledSize: new google.maps.Size(40, 40),
        anchor:     new google.maps.Point(20, 20),
      },
      title: `${truck.id} — ${truck.speedKmh} km/h`,
      zIndex: truck.status === 'delayed' ? 100 : 50,
    });

    // Speed label
    const label = new google.maps.Marker({
      position: { lat: truck.latitude + 0.0005, lng: truck.longitude },
      map,
      icon: { url: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', scaledSize: new google.maps.Size(0, 0) },
      label: {
        text:     `${Math.round(truck.speedKmh)} km/h`,
        color:    '#ffffff',
        fontSize: '10px',
        fontWeight: '600',
      },
      zIndex: 51,
    });

    if (onClick) {
      marker.addListener('click', () => onClick(truck));
    }

    markerRef.current = marker;

    return () => {
      marker.setMap(null);
      label.setMap(null);
    };
  }, [map]); // eslint-disable-line

  // Update position/heading on data changes
  useEffect(() => {
    if (!markerRef.current || typeof google === 'undefined') return;
    const color = STATUS_COLORS[truck.status] || '#94a3b8';
    const svg   = buildTruckSVG(color, truck.heading);
    markerRef.current.setPosition({ lat: truck.latitude, lng: truck.longitude });
    markerRef.current.setIcon({
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
      scaledSize: new google.maps.Size(40, 40),
      anchor:     new google.maps.Point(20, 20),
    });
  }, [truck.latitude, truck.longitude, truck.heading, truck.status, truck.speedKmh]);

  return null;
}
