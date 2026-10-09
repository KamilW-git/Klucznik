import { Check, ChevronDown } from 'lucide-react';
import { Select as SelectPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';

import { cn } from '@/shared/lib/cn';

import { useFieldControlProps } from './form-field-context';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: readonly SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Etykieta dla czytników, gdy pole nie jest w `FormField`. */
  'aria-label'?: string;
}

/** Lista wyboru (Radix Select) w wyglądzie pola formularza; w `FormField` dostaje `id` i `aria-*`. */
export function Select({
  value,
  onValueChange,
  options,
  placeholder,
  disabled,
  className,
  'aria-label': ariaLabel,
}: SelectProps) {
  const field = useFieldControlProps();
  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectPrimitive.Trigger
        {...field}
        aria-label={ariaLabel}
        className={cn(
          'flex h-12 w-full min-w-0 items-center justify-between gap-2 rounded-md border border-input bg-card px-4 text-left text-base data-[placeholder]:text-muted-foreground focus-visible:border-2 focus-visible:border-primary focus-visible:px-[15px] focus-visible:ring-4 focus-visible:ring-primary/15 focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-muted aria-invalid:border-destructive',
          className,
        )}
      >
        <span className="truncate">
          <SelectPrimitive.Value placeholder={placeholder} />
        </span>
        <SelectPrimitive.Icon>
          <ChevronDown className="size-5 text-muted-foreground" aria-hidden="true" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

function SelectContent({
  className,
  children,
  ...props
}: ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Content
      position="popper"
      sideOffset={6}
      className={cn(
        'z-50 max-h-80 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border bg-popover shadow-overlay data-[state=open]:animate-in data-[state=open]:fade-in-0',
        className,
      )}
      {...props}
    >
      <SelectPrimitive.Viewport className="p-1.5">{children}</SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  );
}

function SelectItem({
  className,
  children,
  ...props
}: ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      className={cn(
        'relative flex min-h-11 cursor-pointer items-center rounded-md py-2 pr-3 pl-9 text-base outline-none select-none data-disabled:opacity-50 data-highlighted:bg-accent',
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemIndicator className="absolute left-3">
        <Check className="size-4 text-primary" aria-hidden="true" />
      </SelectPrimitive.ItemIndicator>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}
