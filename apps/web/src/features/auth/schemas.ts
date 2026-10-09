import { z } from 'zod';

/** Kształt zgodny z `LoginDto` (e-mail ≤ 254, hasło 1–200). */
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Podaj adres e-mail.')
    .max(254, 'Adres e-mail jest za długi.')
    .pipe(z.email('Podaj poprawny adres e-mail.')),
  password: z.string().min(1, 'Podaj hasło.').max(200, 'Hasło może mieć najwyżej 200 znaków.'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
