import { hash } from 'argon2';

import { CalendarDate } from '../../src/common/domain/calendar-date';
import type {
  AvailabilityBlock,
  Guest,
  Property,
  Reservation,
  ReservationSource,
  ReservationStatus,
  Role,
  Room,
  SeasonalRate,
  User,
} from '../../src/infrastructure/prisma/generated/client';
import { toDbDate } from '../../src/infrastructure/prisma/prisma-dates';
import type { PrismaService } from '../../src/infrastructure/prisma/prisma.service';

/**
 * Fabryki danych testowych (docs/architecture/testing-strategy.md#testy-integracyjne-zasady).
 * Każda tworzy kompletny rekord z sensownymi wartościami domyślnymi; `overrides` zmienia wybrane pola.
 */

export const TEST_PASSWORD = 'Test-password-123';

let sequence = 0;
const next = (): number => ++sequence;

// argon2 jest celowo wolny, więc hash hasła testowego liczymy raz na przebieg.
let passwordHash: Promise<string> | undefined;
const testPasswordHash = (): Promise<string> => (passwordHash ??= hash(TEST_PASSWORD));

const date = (value: string): Date => toDbDate(CalendarDate.parse(value));

export interface UserOverrides {
  email?: string;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
}

async function createUser(
  prisma: PrismaService,
  role: Role,
  overrides: UserOverrides,
): Promise<User> {
  const n = next();
  return prisma.user.create({
    data: {
      email: overrides.email ?? `${role.toLowerCase()}-${n}@test.klucznik.local`,
      passwordHash: await testPasswordHash(),
      firstName: overrides.firstName ?? 'Jan',
      lastName: overrides.lastName ?? `Testowy${n}`,
      role,
      isActive: overrides.isActive ?? true,
    },
  });
}

export const createOwner = (prisma: PrismaService, overrides: UserOverrides = {}): Promise<User> =>
  createUser(prisma, 'OWNER', overrides);

export const createAdmin = (prisma: PrismaService, overrides: UserOverrides = {}): Promise<User> =>
  createUser(prisma, 'ADMIN', overrides);

export function createProperty(
  prisma: PrismaService,
  owner: Pick<User, 'id'>,
  overrides: Partial<
    Pick<Property, 'name' | 'slug' | 'isActive' | 'cancellationDeadlineDays' | 'pendingExpiryHours'>
  > = {},
): Promise<Property> {
  const n = next();
  return prisma.property.create({
    data: {
      ownerId: owner.id,
      name: overrides.name ?? `Obiekt testowy ${n}`,
      slug: overrides.slug ?? `obiekt-testowy-${n}`,
      city: 'Mikołajki',
      ...overrides,
    },
  });
}

export function createRoom(
  prisma: PrismaService,
  property: Pick<Property, 'id'>,
  overrides: Partial<
    Pick<Room, 'name' | 'capacity' | 'basePricePerNight' | 'minNights' | 'isActive'>
  > = {},
): Promise<Room> {
  return prisma.room.create({
    data: {
      propertyId: property.id,
      name: overrides.name ?? `Pokój ${next()}`,
      capacity: 4,
      basePricePerNight: 37_000,
      minNights: 1,
      ...overrides,
    },
  });
}

export function createGuest(
  prisma: PrismaService,
  property: Pick<Property, 'id'>,
  overrides: Partial<Pick<Guest, 'firstName' | 'lastName' | 'email' | 'phone'>> = {},
): Promise<Guest> {
  const n = next();
  return prisma.guest.create({
    data: {
      propertyId: property.id,
      firstName: 'Anna',
      lastName: `Kowalska${n}`,
      email: `gosc-${n}@test.klucznik.local`,
      ...overrides,
    },
  });
}

export interface ReservationInput {
  room: Pick<Room, 'id' | 'propertyId' | 'basePricePerNight'>;
  guest: Pick<Guest, 'id'>;
  /** `YYYY-MM-DD`. */
  checkIn: string;
  /** `YYYY-MM-DD`, po `checkIn`. */
  checkOut: string;
  status?: ReservationStatus;
  source?: ReservationSource;
  guestsCount?: number;
  number?: string;
}

/** Rezerwacja z ceną bazową za każdą noc (bez cennika sezonowego). Numer z serii testowej `KL-TEST-…`. */
export function createReservation(
  prisma: PrismaService,
  input: ReservationInput,
): Promise<Reservation> {
  const checkIn = CalendarDate.parse(input.checkIn);
  const nights = CalendarDate.parse(input.checkOut).diffDays(checkIn);
  const breakdown = Array.from({ length: Math.max(nights, 0) }, (_, i) => ({
    date: checkIn.addDays(i).toString(),
    price: input.room.basePricePerNight,
  }));

  return prisma.reservation.create({
    data: {
      number: input.number ?? `KL-TEST-${String(next()).padStart(6, '0')}`,
      propertyId: input.room.propertyId,
      roomId: input.room.id,
      guestId: input.guest.id,
      checkIn: date(input.checkIn),
      checkOut: date(input.checkOut),
      guestsCount: input.guestsCount ?? 2,
      status: input.status ?? 'CONFIRMED',
      source: input.source ?? 'MANUAL',
      totalPrice: breakdown.reduce((sum, night) => sum + night.price, 0),
      currency: 'PLN',
      priceBreakdown: breakdown,
    },
  });
}

export function createSeasonalRate(
  prisma: PrismaService,
  room: Pick<Room, 'id'>,
  input: {
    dateFrom: string;
    dateTo: string;
    pricePerNight?: number;
    minNights?: number;
    name?: string;
  },
): Promise<SeasonalRate> {
  return prisma.seasonalRate.create({
    data: {
      roomId: room.id,
      name: input.name ?? 'Sezon testowy',
      dateFrom: date(input.dateFrom),
      dateTo: date(input.dateTo),
      pricePerNight: input.pricePerNight ?? 45_000,
      minNights: input.minNights,
    },
  });
}

export function createBlock(
  prisma: PrismaService,
  room: Pick<Room, 'id'>,
  input: { dateFrom: string; dateTo: string; reason?: string },
): Promise<AvailabilityBlock> {
  return prisma.availabilityBlock.create({
    data: {
      roomId: room.id,
      dateFrom: date(input.dateFrom),
      dateTo: date(input.dateTo),
      reason: input.reason ?? 'Remont',
    },
  });
}
