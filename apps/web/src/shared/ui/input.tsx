import type { ComponentProps, ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';

import { useFieldControlProps } from './form-field-context';

export const inputClassName =
  'flex h-12 w-full min-w-0 rounded-md border border-input bg-card px-4 text-base text-foreground transition-[border-color,box-shadow] placeholder:text-muted-foreground/80 focus-visible:border-2 focus-visible:border-primary focus-visible:px-[15px] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70 aria-invalid:border-destructive aria-invalid:focus-visible:border-destructive aria-invalid:focus-visible:ring-destructive/15';

export function Input({ className, type = 'text', ...props }: ComponentProps<'input'>) {
  const field = useFieldControlProps();
  return (
    <input
      data-slot="input"
      type={type}
      className={cn(inputClassName, className)}
      {...field}
      {...props}
    />
  );
}

interface InputGroupProps {
  /** Ikona po lewej (dekoracyjna). */
  startIcon?: ReactNode;
  /** Element po prawej, np. przycisk „pokaż hasło”. */
  end?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Pole z ikoną z lewej i/lub akcją z prawej (np. e-mail z ikoną koperty, hasło z przyciskiem oka). */
export function InputGroup({ startIcon, end, children, className }: InputGroupProps) {
  return (
    <div
      className={cn(
        'relative flex items-center',
        startIcon && '[&_input]:pl-11 [&_input:focus-visible]:pl-[43px]',
        end && '[&_input]:pr-12 [&_input:focus-visible]:pr-[47px]',
        className,
      )}
    >
      {startIcon && (
        <span
          className="pointer-events-none absolute left-4 text-muted-foreground [&_svg]:size-5"
          aria-hidden="true"
        >
          {startIcon}
        </span>
      )}
      {children}
      {end && <span className="absolute right-1 flex items-center">{end}</span>}
    </div>
  );
}
