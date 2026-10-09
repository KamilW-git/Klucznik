import { CircleAlert } from 'lucide-react';
import { useId, type ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';

import { FormFieldContext, type FieldControlProps } from './form-field-context';
import { Label } from './label';

interface FormFieldProps {
  label: string;
  /** Kontrolka (`Input`, także wewnątrz `InputGroup`); atrybuty dostaje z kontekstu. */
  children: ReactNode;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
  /** Dodatek po prawej stronie etykiety (np. link). */
  labelAside?: ReactNode;
  className?: string;
}

/** Etykieta zawsze widoczna (nie tylko placeholder), błąd pod polem powiązany przez `aria-describedby`. */
export function FormField({
  label,
  children,
  error,
  hint,
  required,
  labelAside,
  className,
}: FormFieldProps) {
  const id = useId();
  const controlId = `${id}-control`;
  const describedBy = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(' ');
  const controlProps: FieldControlProps = {
    id: controlId,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy || undefined,
    'aria-required': required || undefined,
  };

  return (
    <div data-slot="form-field" className={cn('grid gap-2', className)}>
      <div className="flex items-baseline justify-between gap-4">
        <Label htmlFor={controlId}>
          {label}
          {required && (
            <span className="text-destructive" aria-hidden="true">
              *
            </span>
          )}
        </Label>
        {labelAside}
      </div>
      <FormFieldContext value={controlProps}>{children}</FormFieldContext>
      {hint && !error && (
        <p id={`${id}-hint`} className="text-sm text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="flex items-start gap-1.5 text-sm text-destructive">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}
