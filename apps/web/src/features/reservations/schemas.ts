import { z } from 'zod';

const stay = z
  .object({ from: z.string(), to: z.string() })
  .nullable()
  .refine((value) => value !== null, 'Wybierz termin pobytu.');

const optionalEmail = z
  .string()
  .trim()
  .max(254, 'Adres e-mail jest za długi.')
  .refine(
    (value) => value === '' || z.email().safeParse(value).success,
    'Podaj poprawny adres e-mail.',
  );

const notes = z.string().max(2000, 'Najwyżej 2000 znaków.');

/** Gość rezerwacji ręcznej: istniejący (`id`) albo nowy (Q-03: e-mail i telefon opcjonalne). */
const guest = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('existing'),
    id: z.string(),
    label: z.string(),
  }),
  z.object({
    mode: z.literal('new'),
    firstName: z.string().trim().min(1, 'Podaj imię.').max(100, 'Najwyżej 100 znaków.'),
    lastName: z.string().trim().min(1, 'Podaj nazwisko.').max(100, 'Najwyżej 100 znaków.'),
    email: optionalEmail,
    phone: z.string().trim().max(30, 'Najwyżej 30 znaków.'),
  }),
  z.object({ mode: z.literal('none') }),
]);

/** Formularz O5 (kształt `CreateManualReservationDto`; reguły BR liczy API). */
export const manualReservationSchema = z
  .object({
    roomId: z.string().min(1, 'Wybierz pokój.'),
    stay,
    guestsCount: z.int().min(1).max(99),
    guest,
    guestNotes: notes,
    internalNotes: notes,
    ignoreMinNights: z.boolean(),
  })
  .refine((value) => value.guest.mode !== 'none', {
    path: ['guest'],
    message: 'Wybierz gościa z listy albo dodaj nowego.',
  });

/** Wartości pól (termin może być pusty) i wynik walidacji (termin wybrany). */
export type ManualReservationFormValues = z.input<typeof manualReservationSchema>;
export type ManualReservationFormOutput = z.output<typeof manualReservationSchema>;

/** Edycja terminu, pokoju i liczby gości (Q-02). */
export const editReservationSchema = z.object({
  roomId: z.string().min(1, 'Wybierz pokój.'),
  stay,
  guestsCount: z.int().min(1).max(99),
  guestNotes: notes,
  ignoreMinNights: z.boolean(),
});

export type EditReservationFormValues = z.input<typeof editReservationSchema>;
export type EditReservationFormOutput = z.output<typeof editReservationSchema>;
