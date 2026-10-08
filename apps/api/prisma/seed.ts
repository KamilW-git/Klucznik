/**
 * Seed danych demo: `pnpm --filter @klucznik/api prisma:seed` (apps/api/docs/persistence-layer.md#seed).
 *
 * Idempotentny:
 * - użytkownicy, obiekty, pokoje i goście: upsert po kluczach naturalnych (e-mail, slug, obiekt + nazwa),
 * - rezerwacje demo (numery `KL-<rok>-000101…109`), stawki i blokady pokoi demo: usuwane i tworzone
 *   od nowa, bo ich daty liczymy względem „dziś”, a aktualizacja w miejscu mogłaby po drodze naruszyć
 *   `reservations_no_overlap`.
 */
import { existsSync } from 'node:fs';

import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'argon2';
import { z } from 'zod';

import { CalendarDate } from '../src/common/domain/calendar-date';
import { InclusiveDateRange } from '../src/common/domain/date-range';
import { StayRange } from '../src/common/domain/stay-range';
import { SystemClock } from '../src/infrastructure/clock/system-clock';
import {
  type ActorType,
  Prisma,
  PrismaClient,
  type ReservationEventType,
} from '../src/infrastructure/prisma/generated/client';
import { toDbDate } from '../src/infrastructure/prisma/prisma-dates';
import {
  DEMO_SEQ_MAX,
  MAIN_OWNER,
  type OwnerDef,
  type ReservationDef,
  type RoomDef,
  SECOND_OWNER,
  SEASONS,
  type SeasonKey,
} from './seed-data';

type Tx = Prisma.TransactionClient;

for (const path of ['.env', '../../.env']) {
  if (existsSync(path)) {
    process.loadEnvFile(path);
    break;
  }
}

const seedEnv = z
  .object({
    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
    APP_TIMEZONE: z.string().default('Europe/Warsaw'),
    SEED_ADMIN_EMAIL: z.email(),
    SEED_ADMIN_PASSWORD: z.string().min(8),
    // Niewymagana: bez niej konta demo właścicieli dostają hasło admina.
    SEED_OWNER_PASSWORD: z.string().min(8).optional(),
  })
  .parse(Object.fromEntries(Object.entries(process.env).filter(([, value]) => value !== '')));

const clock = new SystemClock(seedEnv.APP_TIMEZONE);
const now = clock.now();
const today = clock.today();
const year = Number(today.toString().slice(0, 4));
const HOUR_MS = 3_600_000;

const reservationNumber = (seqYear: number, seq: number): string =>
  `KL-${seqYear}-${String(seq).padStart(6, '0')}`;

/** Najbliższe (bieżące lub przyszłe) wystąpienie sezonu jako zakres nocy włącznie. */
function nextOccurrence(season: { from: string; to: string }): InclusiveDateRange {
  for (const startYear of [year, year + 1]) {
    const endYear = season.to < season.from ? startYear + 1 : startYear;
    const range = InclusiveDateRange.of(
      CalendarDate.parse(`${startYear}-${season.from}`),
      CalendarDate.parse(`${endYear}-${season.to}`),
    );
    if (!range.to.isBefore(today)) {
      return range;
    }
  }
  throw new Error(`No upcoming occurrence of season ${season.from}–${season.to}`);
}

const seasonRanges = Object.fromEntries(
  Object.entries(SEASONS).map(([key, season]) => [key, nextOccurrence(season)]),
) as Record<SeasonKey, InclusiveDateRange>;

// Cena za noc: stawka sezonowa obejmująca noc albo cena bazowa (BR-05). Docelowo `calculatePrice` (M6).
function priceBreakdown(room: RoomDef, stay: StayRange): { date: string; price: number }[] {
  return stay.eachNight().map((night) => {
    const season = (Object.keys(room.seasonalPrices) as SeasonKey[]).find((key) =>
      seasonRanges[key].contains(night),
    );
    const price = season ? room.seasonalPrices[season] : undefined;
    return { date: night.toString(), price: price ?? room.basePricePerNight };
  });
}

async function upsertUser(
  tx: Tx,
  user: { email: string; firstName: string; lastName: string; role: 'ADMIN' | 'OWNER' },
  passwordHash: string,
) {
  const email = user.email.toLowerCase();
  return tx.user.upsert({
    where: { email },
    create: {
      email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      passwordHash,
    },
    update: {
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      passwordHash,
      isActive: true,
    },
  });
}

async function seedOwner(tx: Tx, def: OwnerDef, passwordHash: string): Promise<number> {
  const owner = await upsertUser(tx, { ...def, role: 'OWNER' }, passwordHash);
  const { rooms, guests, reservations, block, ...propertyData } = def.property;

  const property = await tx.property.upsert({
    where: { slug: propertyData.slug },
    create: { ...propertyData, ownerId: owner.id },
    update: { ...propertyData, ownerId: owner.id, isActive: true, deletedAt: null },
  });

  const roomIds = new Map<string, string>();
  for (const room of rooms) {
    const data = {
      name: room.name,
      description: room.description,
      capacity: room.capacity,
      basePricePerNight: room.basePricePerNight,
    };
    const existing = await tx.room.findFirst({
      where: { propertyId: property.id, name: room.name },
    });
    const saved = existing
      ? await tx.room.update({
          where: { id: existing.id },
          data: { ...data, isActive: true, deletedAt: null },
        })
      : await tx.room.create({ data: { ...data, propertyId: property.id } });
    roomIds.set(room.name, saved.id);
  }
  const demoRoomIds = [...roomIds.values()];

  // Stawki sezonowe i blokady pokoi demo od nowa (daty zależą od bieżącego roku i dnia).
  await tx.seasonalRate.deleteMany({ where: { roomId: { in: demoRoomIds } } });
  await tx.availabilityBlock.deleteMany({ where: { roomId: { in: demoRoomIds } } });
  for (const room of rooms) {
    for (const [key, price] of Object.entries(room.seasonalPrices) as [SeasonKey, number][]) {
      const season: { name: string; minNights?: number } = SEASONS[key];
      await tx.seasonalRate.create({
        data: {
          roomId: roomIds.get(room.name)!,
          name: season.name,
          dateFrom: toDbDate(seasonRanges[key].from),
          dateTo: toDbDate(seasonRanges[key].to),
          pricePerNight: price,
          minNights: season.minNights ?? null,
        },
      });
    }
  }
  if (block) {
    await tx.availabilityBlock.create({
      data: {
        roomId: roomIds.get(block.room)!,
        dateFrom: toDbDate(today.addDays(block.fromOffset)),
        dateTo: toDbDate(today.addDays(block.toOffset)),
        reason: block.reason,
      },
    });
  }

  const guestIds = new Map<string, string>();
  for (const { key, ...guest } of guests) {
    const email = guest.email?.toLowerCase() ?? null;
    const existing = await tx.guest.findFirst({
      where: email
        ? { propertyId: property.id, email }
        : {
            propertyId: property.id,
            email: null,
            firstName: guest.firstName,
            lastName: guest.lastName,
          },
    });
    const saved = existing
      ? await tx.guest.update({ where: { id: existing.id }, data: { ...guest, email } })
      : await tx.guest.create({ data: { ...guest, email, propertyId: property.id } });
    guestIds.set(key, saved.id);
  }

  for (const reservation of reservations) {
    const room = rooms.find((r) => r.name === reservation.room)!;
    await createReservation(tx, reservation, {
      propertyId: property.id,
      roomId: roomIds.get(room.name)!,
      guestId: guestIds.get(reservation.guest)!,
      ownerId: owner.id,
      room,
    });
  }
  return reservations.length;
}

async function createReservation(
  tx: Tx,
  def: ReservationDef,
  refs: { propertyId: string; roomId: string; guestId: string; ownerId: string; room: RoomDef },
): Promise<void> {
  const checkIn = today.addDays(def.checkInOffset);
  const stay = StayRange.of(checkIn, checkIn.addDays(def.nights));
  const breakdown = priceBreakdown(refs.room, stay);
  const expiresAt =
    def.expiresInHours === undefined
      ? null
      : new Date(now.getTime() + def.expiresInHours * HOUR_MS);
  const confirmed = def.status === 'CONFIRMED' || def.status === 'COMPLETED';

  const reservation = await tx.reservation.create({
    data: {
      number: reservationNumber(year, def.seq),
      propertyId: refs.propertyId,
      roomId: refs.roomId,
      guestId: refs.guestId,
      checkIn: toDbDate(stay.checkIn),
      checkOut: toDbDate(stay.checkOut),
      guestsCount: def.guestsCount,
      status: def.status,
      source: def.source,
      totalPrice: breakdown.reduce((sum, night) => sum + night.price, 0),
      currency: 'PLN',
      priceBreakdown: breakdown,
      guestNotes: def.guestNotes ?? null,
      internalNotes: def.internalNotes ?? null,
      expiresAt,
      confirmedAt: confirmed ? now : null,
      cancelledAt: def.status === 'CANCELLED' ? now : null,
      cancelledBy: def.status === 'CANCELLED' ? 'GUEST' : null,
      cancellationReason: def.status === 'CANCELLED' ? 'Zmiana planów urlopowych.' : null,
    },
  });

  // Historia (Q-05): utworzenie + zmiana statusu, jak przy prawdziwych przejściach.
  const manual = def.source === 'MANUAL';
  const events: { type: ReservationEventType; actorType: ActorType; actorUserId?: string }[] = [
    manual
      ? { type: 'CREATED', actorType: 'OWNER', actorUserId: refs.ownerId }
      : { type: 'CREATED', actorType: 'GUEST' },
  ];
  if (confirmed && !manual)
    events.push({ type: 'CONFIRMED', actorType: 'OWNER', actorUserId: refs.ownerId });
  if (def.status === 'COMPLETED') events.push({ type: 'COMPLETED', actorType: 'SYSTEM' });
  if (def.status === 'CANCELLED') events.push({ type: 'CANCELLED', actorType: 'GUEST' });
  if (def.status === 'EXPIRED') events.push({ type: 'EXPIRED', actorType: 'SYSTEM' });

  await tx.reservationEvent.createMany({
    data: events.map((event) => ({ ...event, reservationId: reservation.id })),
  });
}

async function main(): Promise<void> {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: seedEnv.DATABASE_URL }),
  });
  // argon2 jest wolny, więc hashe liczymy przed transakcją.
  const adminHash = await hash(seedEnv.SEED_ADMIN_PASSWORD);
  const ownerHash = seedEnv.SEED_OWNER_PASSWORD
    ? await hash(seedEnv.SEED_OWNER_PASSWORD)
    : adminHash;

  const demoNumbers = [year - 1, year].flatMap((y) =>
    Array.from({ length: DEMO_SEQ_MAX - 100 }, (_, i) => reservationNumber(y, 101 + i)),
  );

  try {
    const count = await prisma.$transaction(
      async (tx) => {
        await upsertUser(
          tx,
          {
            email: seedEnv.SEED_ADMIN_EMAIL,
            firstName: 'Administrator',
            lastName: 'Klucznika',
            role: 'ADMIN',
          },
          adminHash,
        );

        const demo = await tx.reservation.findMany({
          where: { number: { in: demoNumbers } },
          select: { id: true },
        });
        const demoIds = demo.map((r) => r.id);
        await tx.emailLog.deleteMany({ where: { reservationId: { in: demoIds } } });
        await tx.reservation.deleteMany({ where: { id: { in: demoIds } } });

        const created =
          (await seedOwner(tx, MAIN_OWNER, ownerHash)) +
          (await seedOwner(tx, SECOND_OWNER, ownerHash));

        // Licznik numerów (Q-12) nie może wydać numeru zajętego przez dane demo.
        await tx.$executeRaw`
          INSERT INTO reservation_counters (year, last_value) VALUES (${year}, ${DEMO_SEQ_MAX})
          ON CONFLICT (year) DO UPDATE
          SET last_value = GREATEST(reservation_counters.last_value, EXCLUDED.last_value)
        `;
        return created;
      },
      { timeout: 30_000 },
    );

    console.log(
      `Seed gotowy (dziś: ${today.toString()}): 1 admin, 2 właścicieli, ${count} rezerwacji demo.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
