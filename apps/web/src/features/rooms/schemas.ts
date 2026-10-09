import { z } from 'zod';

import { minorPriceSchema } from '@/shared/lib/money-schema';

/** Zakładka „Informacje” (kształt `CreateRoomDto` / `UpdateRoomDto`). */
export const roomInfoSchema = z.object({
  name: z.string().trim().min(1, 'Podaj nazwę pokoju.').max(120, 'Najwyżej 120 znaków.'),
  description: z.string().max(5000, 'Najwyżej 5000 znaków.'),
  capacity: z.int().min(1, 'Co najmniej 1 osoba.').max(30, 'Najwyżej 30 osób.'),
  isActive: z.boolean(),
});

/** Nowy pokój: informacje + cena bazowa i minimalny pobyt (wymagane przez API). */
export const newRoomSchema = roomInfoSchema.extend({
  basePricePerNight: minorPriceSchema,
  minNights: z.int().min(1).max(30),
});

export type RoomInfoFormValues = z.input<typeof roomInfoSchema>;
export type NewRoomFormValues = z.input<typeof newRoomSchema>;
export type NewRoomFormOutput = z.output<typeof newRoomSchema>;
