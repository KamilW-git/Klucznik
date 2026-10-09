import type {
  AvailabilityResultDto,
  PublicPropertyDto,
  PublicReservationCreatedDto,
  PublicReservationDto,
  PublicRoomDto,
  CalendarDto,
  DashboardDto,
  GuestListItemDto,
  PhotoDto,
  PropertyDto,
  PropertyListItemDto,
  ReservationDto,
  ReservationListItemDto,
  RoomDto,
  RoomQuoteDto,
  SeasonalRateDto,
} from '@klucznik/api-client';

/** Dane testowe zgodne z seedem (Domki Leśna Polana, Anna Kowalska). Typy wyłącznie z api-client. */
export const PROPERTY_ID = '11111111-1111-4111-8111-111111111111';
export const ROOM_ID = '22222222-2222-4222-8222-222222222222';
export const ROOM_2_ID = '22222222-2222-4222-8222-222222222223';
export const RESERVATION_ID = '33333333-3333-4333-8333-333333333333';
export const GUEST_ID = '44444444-4444-4444-8444-444444444444';

export const propertyListItem: PropertyListItemDto = {
  id: PROPERTY_ID,
  name: 'Domki Leśna Polana',
  slug: 'lesna-polana',
  city: 'Mrągowo',
  isActive: true,
  roomsCount: 2,
};

export const secondProperty: PropertyListItemDto = {
  id: '11111111-1111-4111-8111-111111111112',
  name: 'Pensjonat Pod Lipami',
  slug: 'pod-lipami',
  city: 'Sopot',
  isActive: true,
  roomsCount: 5,
};

export const photo: PhotoDto = {
  id: '55555555-5555-4555-8555-555555555555',
  url: '/api/v1/files/0b5f8a3e-1c2d-4e5f-8a9b-0c1d2e3f4a5b.jpg',
  altText: 'Domek nad jeziorem',
  sortOrder: 0,
  roomId: ROOM_ID,
  mimeType: 'image/jpeg',
  sizeBytes: 120_000,
  createdAt: '2026-09-01T10:00:00.000Z',
};

export const property: PropertyDto = {
  id: PROPERTY_ID,
  ownerId: '6f2f7c1e-6d3a-4f0e-9d7a-1b2c3d4e5f60',
  name: 'Domki Leśna Polana',
  slug: 'lesna-polana',
  description: 'Kameralne domki nad jeziorem.',
  street: 'ul. Leśna 14',
  postalCode: '11-700',
  city: 'Mrągowo',
  phone: '+48 601 234 567',
  contactEmail: 'kontakt@lesnapolana.example.com',
  checkInTime: '15:00',
  checkOutTime: '11:00',
  cancellationDeadlineDays: 7,
  pendingExpiryHours: 48,
  isActive: true,
  currency: 'PLN',
  coverPhoto: null,
  photos: [],
  publicUrl: 'http://localhost:5173/o/lesna-polana',
  createdAt: '2026-01-10T10:00:00.000Z',
  updatedAt: '2026-01-10T10:00:00.000Z',
};

export const room: RoomDto = {
  id: ROOM_ID,
  propertyId: PROPERTY_ID,
  name: 'Domek Sosna',
  description: 'Całoroczny domek z kominkiem.',
  capacity: 4,
  basePricePerNight: 38_000,
  minNights: 2,
  isActive: true,
  currency: 'PLN',
  coverPhoto: photo,
  photos: [photo],
  upcomingReservationsCount: 3,
  createdAt: '2026-01-10T10:00:00.000Z',
  updatedAt: '2026-01-10T10:00:00.000Z',
};

export const room2: RoomDto = {
  ...room,
  id: ROOM_2_ID,
  name: 'Apartament Pod Dębem',
  capacity: 2,
  basePricePerNight: 42_000,
  isActive: false,
  coverPhoto: null,
  photos: [],
  upcomingReservationsCount: 0,
};

export const reservationListItem: ReservationListItemDto = {
  id: RESERVATION_ID,
  number: 'KL-2026-000123',
  propertyId: PROPERTY_ID,
  room: { id: ROOM_ID, name: 'Domek Sosna' },
  guest: {
    id: GUEST_ID,
    firstName: 'Anna',
    lastName: 'Kowalska',
    email: 'anna.kowalska@example.com',
  },
  checkIn: '2026-11-14',
  checkOut: '2026-11-18',
  nights: 4,
  guestsCount: 3,
  totalPrice: 164_000,
  currency: 'PLN',
  status: 'PENDING',
  source: 'ONLINE',
  expiresAt: '2026-11-01T10:00:00.000Z',
  createdAt: '2026-10-08T12:22:00.000Z',
};

export const reservation: ReservationDto = {
  ...reservationListItem,
  guest: { ...reservationListItem.guest, phone: '+48 601 234 567' },
  priceBreakdown: [
    { date: '2026-11-14', price: 45_000 },
    { date: '2026-11-15', price: 45_000 },
    { date: '2026-11-16', price: 37_000 },
    { date: '2026-11-17', price: 37_000 },
  ],
  guestNotes: 'Przyjedziemy około 17:00.',
  internalNotes: null,
  confirmedAt: null,
  cancelledAt: null,
  cancelledBy: null,
  cancellationReason: null,
  version: 1,
  events: [
    {
      type: 'CREATED',
      actorType: 'GUEST',
      actorName: null,
      createdAt: '2026-10-08T12:22:00.000Z',
      payload: { source: 'ONLINE', status: 'PENDING' },
    },
  ],
  updatedAt: '2026-10-08T12:22:00.000Z',
};

export const dashboard: DashboardDto = {
  arrivalsToday: 2,
  departuresToday: 1,
  pendingCount: 1,
  occupancyThisMonth: 72,
  pendingReservations: [reservationListItem],
  upcomingArrivals: [
    {
      ...reservationListItem,
      id: '33333333-3333-4333-8333-333333333334',
      number: 'KL-2026-000124',
      status: 'CONFIRMED',
      expiresAt: null,
      guest: { id: GUEST_ID, firstName: 'Marek', lastName: 'Lewicki', email: null },
    },
  ],
  occupancyNext30Days: Array.from({ length: 30 }, (_, index) => ({
    date: `2026-11-${String(index + 1).padStart(2, '0')}`,
    occupiedRooms: index % 3,
    totalRooms: 2,
  })),
};

export const calendar = (from: string, to: string): CalendarDto => ({
  from,
  to,
  rooms: [
    { id: ROOM_ID, name: 'Domek Sosna', isActive: true },
    { id: ROOM_2_ID, name: 'Apartament Pod Dębem', isActive: false },
  ],
  reservations: [
    {
      id: RESERVATION_ID,
      roomId: ROOM_ID,
      number: 'KL-2026-000123',
      checkIn: '2026-11-14',
      checkOut: '2026-11-18',
      status: 'CONFIRMED',
      source: 'ONLINE',
      guestName: 'Anna Kowalska',
      guestsCount: 3,
      totalPrice: 164_000,
    },
  ],
  blocks: [
    {
      id: '66666666-6666-4666-8666-666666666666',
      roomId: ROOM_2_ID,
      dateFrom: '2026-11-20',
      dateTo: '2026-11-22',
      reason: 'Remont',
    },
  ],
});

export const quote = (overrides: Partial<RoomQuoteDto> = {}): RoomQuoteDto => ({
  roomId: ROOM_ID,
  checkIn: '2026-12-01',
  checkOut: '2026-12-05',
  nights: 4,
  available: true,
  unavailableReason: null,
  conflicts: [],
  minNights: 2,
  totalPrice: 152_000,
  currency: 'PLN',
  breakdown: ['2026-12-01', '2026-12-02', '2026-12-03', '2026-12-04'].map((date) => ({
    date,
    price: 38_000,
    rateId: null,
  })),
  ...overrides,
});

export const guest: GuestListItemDto = {
  id: GUEST_ID,
  firstName: 'Anna',
  lastName: 'Kowalska',
  email: 'anna.kowalska@example.com',
  phone: '+48 601 234 567',
  reservationsCount: 2,
  lastStayAt: '2025-08-14',
  createdAt: '2025-07-01T10:00:00.000Z',
};

/* Strona publiczna (P1–P5) */

export const PUBLIC_SLUG = 'lesna-polana';
/** Sekretny token z linku w e-mailu (tylko w testach). */
export const GUEST_TOKEN = 'test-guest-token-0123456789abcdef';
/** Wyszukiwany pobyt (testy ustawiają „dziś” na 1.08.2027). */
export const STAY = { checkIn: '2027-08-14', checkOut: '2027-08-18', guests: 2 } as const;

export const publicRoom: PublicRoomDto = {
  id: ROOM_ID,
  name: 'Domek Sosna',
  description: 'Całoroczny domek z kominkiem.',
  capacity: 4,
  minNights: 2,
  priceFrom: 38_000,
  photos: [photo],
};

export const publicRoom2: PublicRoomDto = {
  id: ROOM_2_ID,
  name: 'Apartament Pod Dębem',
  description: null,
  capacity: 2,
  minNights: 5,
  priceFrom: 42_000,
  photos: [],
};

export const publicProperty: PublicPropertyDto = {
  name: 'Domki Leśna Polana',
  slug: PUBLIC_SLUG,
  description: 'Kameralne domki nad jeziorem, w ciszy mazurskiego lasu.',
  street: 'ul. Leśna 14',
  postalCode: '11-700',
  city: 'Mrągowo',
  phone: '+48 601 234 567',
  contactEmail: 'kontakt@lesnapolana.example.com',
  checkInTime: '15:00',
  checkOutTime: '11:00',
  cancellationDeadlineDays: 7,
  pendingExpiryHours: 48,
  currency: 'PLN',
  photos: [{ ...photo, id: '55555555-5555-4555-8555-555555555556', roomId: null }],
  rooms: [publicRoom, publicRoom2],
};

export const availabilityResult = (
  overrides: Partial<AvailabilityResultDto> = {},
): AvailabilityResultDto => ({
  checkIn: STAY.checkIn,
  checkOut: STAY.checkOut,
  nights: 4,
  guests: STAY.guests,
  currency: 'PLN',
  rooms: [
    {
      room: publicRoom,
      available: true,
      unavailableReason: null,
      minNights: 2,
      totalPrice: 164_000,
      averagePricePerNight: 41_000,
      breakdown: [
        { date: '2027-08-14', price: 45_000 },
        { date: '2027-08-15', price: 45_000 },
        { date: '2027-08-16', price: 37_000 },
        { date: '2027-08-17', price: 37_000 },
      ],
    },
    {
      room: publicRoom2,
      available: false,
      unavailableReason: 'MIN_NIGHTS_NOT_MET',
      minNights: 5,
      totalPrice: null,
      averagePricePerNight: null,
      breakdown: null,
    },
  ],
  ...overrides,
});

export const reservationCreated: PublicReservationCreatedDto = {
  number: 'KL-2027-000123',
  status: 'PENDING',
  room: { name: 'Domek Sosna' },
  checkIn: STAY.checkIn,
  checkOut: STAY.checkOut,
  nights: 4,
  guestsCount: 2,
  totalPrice: 164_000,
  currency: 'PLN',
  expiresAt: '2027-08-03T10:00:00.000Z',
  guestEmail: 'anna.kowalska@example.com',
};

export const publicReservation: PublicReservationDto = {
  number: 'KL-2027-000123',
  status: 'CONFIRMED',
  property: {
    name: publicProperty.name,
    slug: PUBLIC_SLUG,
    phone: publicProperty.phone,
    contactEmail: publicProperty.contactEmail,
    street: publicProperty.street,
    postalCode: publicProperty.postalCode,
    city: publicProperty.city,
    checkInTime: '15:00',
    checkOutTime: '11:00',
  },
  room: { name: 'Domek Sosna', coverPhoto: photo },
  checkIn: STAY.checkIn,
  checkOut: STAY.checkOut,
  nights: 4,
  guestsCount: 2,
  totalPrice: 164_000,
  currency: 'PLN',
  guestNotes: 'Przyjedziemy około 17:00.',
  canCancel: true,
  cancellableUntil: '2027-08-07',
  cancelledAt: null,
};

export const rate: SeasonalRateDto = {
  id: '77777777-7777-4777-8777-777777777777',
  roomId: ROOM_ID,
  name: 'Wysoki sezon',
  dateFrom: '2026-06-20',
  dateTo: '2026-08-31',
  pricePerNight: 52_000,
  minNights: 3,
  currency: 'PLN',
};
