import { z } from 'zod';

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Podaj godzinę w formacie GG:MM.');

/** Ustawienia obiektu (kształt `UpdatePropertyDto`). */
export const propertySettingsSchema = z.object({
  name: z.string().trim().min(1, 'Podaj nazwę obiektu.').max(120, 'Najwyżej 120 znaków.'),
  slug: z
    .string()
    .trim()
    .min(3, 'Co najmniej 3 znaki.')
    .max(60, 'Najwyżej 60 znaków.')
    .regex(
      /^[a-z0-9]+(-[a-z0-9]+)*$/,
      'Tylko małe litery bez polskich znaków, cyfry i myślniki, np. lesna-polana.',
    ),
  description: z.string().max(5000, 'Najwyżej 5000 znaków.'),
  street: z.string().trim().min(1, 'Podaj ulicę i numer.').max(200, 'Najwyżej 200 znaków.'),
  postalCode: z
    .string()
    .trim()
    .regex(/^\d{2}-\d{3}$/, 'Kod pocztowy w formacie 00-000.'),
  city: z.string().trim().min(1, 'Podaj miejscowość.').max(120, 'Najwyżej 120 znaków.'),
  phone: z.string().trim().max(30, 'Najwyżej 30 znaków.'),
  contactEmail: z
    .string()
    .trim()
    .refine(
      (value) => value === '' || z.email().safeParse(value).success,
      'Podaj poprawny adres e-mail.',
    ),
  checkInTime: time,
  checkOutTime: time,
  cancellationDeadlineDays: z.int().min(0).max(60),
  pendingExpiryHours: z.int().min(1).max(168),
  isActive: z.boolean(),
});

export type PropertySettingsValues = z.infer<typeof propertySettingsSchema>;
