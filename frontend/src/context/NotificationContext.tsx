// ─── NotificationContext.tsx — Global Terminal Alerts & Slot Booking Feed ──────
import React, { createContext, useContext, useState, useEffect } from 'react';
import type { BookingRecord } from '../data/portServiceData';

export interface TerminalNotification {
  id: string;
  type: 'slot' | 'reroute' | 'congestion' | 'system';
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
  bookingDetails?: BookingRecord;
}

interface NotificationContextType {
  notifications: TerminalNotification[];
  unreadCount: number;
  addNotification: (item: {
    type: TerminalNotification['type'];
    title: string;
    body: string;
    bookingDetails?: BookingRecord;
  }) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  selectedSlotBooking: BookingRecord | null;
  setSelectedSlotBooking: (booking: BookingRecord | null) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

const INITIAL_NOTIFICATIONS: TerminalNotification[] = [
  {
    id: 'notif-slot-demo-1',
    type: 'slot',
    title: 'Gate Slot Reservation Confirmed',
    body: 'Abhinav · TN-02-F-9987 · Gate 4 · General Purpose · 11:30 – 12:00 on 2026-09-18',
    timestamp: 'Just now',
    read: false,
    bookingDetails: {
      id: 'b-demo-inmaa-0101',
      tokenNumber: 'LGS-INMAA-260918-0101',
      portId: 'chennai',
      service: 'general',
      serviceLabel: 'General Cargo',
      gate: 'Gate 4 · General Purpose',
      date: '2026-09-18',
      timeWindow: '11:30 – 12:00',
      vehicleNumber: 'TN-02-F-9987',
      vehicleType: 'trailer',
      driverName: 'Abhinav',
      driverPhone: '+91 98400 12345',
      driverLicenseOk: true,
      destination: 'Vellore Institute of Technology - Chennai, Vandalur - Mambakkam - Kelambakkam Road',
      status: 'upcoming',
      tier: 'standard',
      tierFee: 0,
      cargoType: 'General Cargo',
    },
  },
  {
    id: 'notif-init-1',
    type: 'congestion',
    title: 'Gate 2 Bulk Quay Surge Warning',
    body: 'Approach queue on Madurai–Tuticorin Hwy exceeds 18 trucks. Diversion advisory active.',
    timestamp: '10 mins ago',
    read: false,
  },
  {
    id: 'notif-init-2',
    type: 'system',
    title: 'RFID Fast-Pass Scanner Calibrated',
    body: 'Lane 4 smart optical OCR & RFID toll scanners online with 99.98% telemetry accuracy.',
    timestamp: '25 mins ago',
    read: true,
  },
  {
    id: 'notif-init-3',
    type: 'reroute',
    title: 'Vessel Berthing Sequence Updated',
    body: 'Container vessel MSC Alessia cleared for Berth 3. Inbound container slots expedited.',
    timestamp: '1 hour ago',
    read: true,
  },
];

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<TerminalNotification[]>(INITIAL_NOTIFICATIONS);
  const [selectedSlotBooking, setSelectedSlotBooking] = useState<BookingRecord | null>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  const addNotification = ({
    type,
    title,
    body,
    bookingDetails,
  }: {
    type: TerminalNotification['type'];
    title: string;
    body: string;
    bookingDetails?: BookingRecord;
  }) => {
    const newNotif: TerminalNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      title,
      body,
      timestamp: 'Just now',
      read: false,
      bookingDetails,
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const markRead = (id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markRead,
        markAllRead,
        selectedSlotBooking,
        setSelectedSlotBooking,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return ctx;
}
