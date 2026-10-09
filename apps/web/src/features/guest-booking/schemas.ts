import { z } from 'zod';

const name = (required: string) =>
  z.string().trim().min(1, required).max(100, 'Najwyżej 100 znaków.');

/** Numer z opcjonalnym `+`, cyframi, spacjami, nawiasami i myślnikami; min. 6 cyfr. */
const PHONE = /^\+?[\d\s()-]+$/;

/** Formularz P3 (kształt `CreatePublicReservationDto`; cenę i reguły BR liczy API, BR-05). */
export const bookingFormSchema = z.object({
  guest: z.object({
    firstName: name('Podaj imię.'),
    lastName: name('Podaj nazwisko.'),
    email: z
      .string()
      .trim()
      .min(1, 'Podaj adres e-mail – wyślemy na niego potwierdzenie.')
      .max(254, 'Adres e-mail jest za długi.')
      .refine(
        (value) => z.email().safeParse(value).success,
        'Podaj poprawny adres e-mail, np. anna.kowalska@example.com.',
      ),
    phone: z
      .string()
      .trim()
      .min(1, 'Podaj numer telefonu.')
      .max(30, 'Najwyżej 30 znaków.')
      .refine(
        (value) => PHONE.test(value) && value.replace(/\D/g, '').length >= 6,
        'Podaj poprawny numer telefonu, np. +48 601 234 567.',
      ),
  }),
  guestNotes: z.string().max(2000, 'Najwyżej 2000 znaków.'),
  // Q-19: akceptacja tylko w UI (bez zapisu w bazie).
  acceptTerms: z.boolean().refine((value) => value, 'Zaakceptuj warunki rezerwacji.'),
});

export type BookingFormValues = z.input<typeof bookingFormSchema>;
export type BookingFormOutput = z.output<typeof bookingFormSchema>;

/** Pola formularza, na które mapujemy `VALIDATION_ERROR` z API (`details.fields[].field`). */
export const BOOKING_FORM_FIELDS = [
  'guest.firstName',
  'guest.lastName',
  'guest.email',
  'guest.phone',
  'guestNotes',
] as const;
