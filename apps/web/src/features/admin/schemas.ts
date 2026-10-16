import { z } from 'zod';

import { PASSWORD_MIN_LENGTH } from './password';

const name = (required: string) =>
  z.string().trim().min(1, required).max(100, 'Najwyżej 100 znaków.');

const email = z
  .string()
  .trim()
  .min(1, 'Podaj adres e-mail.')
  .max(254, 'Adres e-mail jest za długi.')
  .refine((value) => z.email().safeParse(value).success, 'Podaj poprawny adres e-mail.');

const password = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Hasło musi mieć co najmniej ${PASSWORD_MIN_LENGTH} znaków.`)
  .max(200, 'Najwyżej 200 znaków.');

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** „Nowy właściciel” (kształt `CreateOwnerDto`; obiekt opcjonalny, Q-07). */
export const createOwnerSchema = z
  .object({
    firstName: name('Podaj imię.'),
    lastName: name('Podaj nazwisko.'),
    email,
    password,
    property: z.object({
      enabled: z.boolean(),
      name: z.string().trim().max(120, 'Najwyżej 120 znaków.'),
      slug: z.string().trim(),
    }),
  })
  .superRefine((value, context) => {
    if (!value.property.enabled) return;
    if (!value.property.name) {
      context.addIssue({
        code: 'custom',
        path: ['property', 'name'],
        message: 'Podaj nazwę obiektu.',
      });
    }
    const slug = value.property.slug;
    if (slug && (slug.length < 3 || slug.length > 60 || !SLUG.test(slug))) {
      context.addIssue({
        code: 'custom',
        path: ['property', 'slug'],
        message: '3–60 znaków: małe litery, cyfry i myślniki (np. lesna-polana).',
      });
    }
  });

export type CreateOwnerFormValues = z.input<typeof createOwnerSchema>;
export type CreateOwnerFormOutput = z.output<typeof createOwnerSchema>;

/** Edycja właściciela: dane i opcjonalne nowe hasło tymczasowe. */
export const editOwnerSchema = z.object({
  firstName: name('Podaj imię.'),
  lastName: name('Podaj nazwisko.'),
  email,
  password: z.union([z.literal(''), password]),
});

export type EditOwnerFormValues = z.input<typeof editOwnerSchema>;
export type EditOwnerFormOutput = z.output<typeof editOwnerSchema>;
