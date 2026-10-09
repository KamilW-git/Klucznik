import { createContext, use } from 'react';

export interface FieldControlProps {
  id: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
  'aria-required'?: boolean;
}

export const FormFieldContext = createContext<FieldControlProps | null>(null);

/** Atrybuty kontrolki z najbliższego `FormField` (`id`, `aria-invalid`, `aria-describedby`). */
export function useFieldControlProps(): FieldControlProps | null {
  return use(FormFieldContext);
}
