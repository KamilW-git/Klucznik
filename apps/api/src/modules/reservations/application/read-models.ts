import type { ReservationSource, ReservationStatus } from '../domain/reservation-status';

/** Wiersz listy rezerwacji (docs/features/reservations.md: `ReservationListItemDto`). */
export interface ReservationListItem {
  id: string;
  number: string;
  propertyId: string;
  room: { id: string; name: string };
  guest: { id: string; firstName: string; lastName: string; email: string | null };
  /** `YYYY-MM-DD`. */
  checkIn: string;
  /** `YYYY-MM-DD`. */
  checkOut: string;
  nights: number;
  guestsCount: number;
  totalPrice: number;
  currency: string;
  status: ReservationStatus;
  source: ReservationSource;
  expiresAt: Date | null;
  createdAt: Date;
}

/** Dane pulpitu obiektu (docs/features/properties.md: `DashboardDto`, Q-08). */
export interface Dashboard {
  arrivalsToday: number;
  departuresToday: number;
  pendingCount: number;
  /** Procent 0–100. */
  occupancyThisMonth: number;
  pendingReservations: ReservationListItem[];
  upcomingArrivals: ReservationListItem[];
  occupancyNext30Days: { date: string; occupiedRooms: number; totalRooms: number }[];
}
