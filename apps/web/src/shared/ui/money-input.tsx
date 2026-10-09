import { useState, type ComponentProps } from 'react';

import { fromMinor, toMinor } from '@/shared/lib/money';

import { Input, InputGroup } from './input';

interface MoneyInputProps extends Omit<
  ComponentProps<'input'>,
  'value' | 'onChange' | 'type' | 'defaultValue'
> {
  /** Kwota w groszach (`null` = puste pole). */
  value: number | null;
  onChange: (minor: number | null) => void;
  /** Dopisek po prawej, np. „zł / noc”. */
  suffix?: string;
}

/**
 * Pole kwoty w złotych (format polski: przecinek dziesiętny), wartość w groszach.
 * Niepoprawny tekst daje `NaN`, które formularz (zod) zgłasza jako błąd.
 */
export function MoneyInput({ value, onChange, suffix = 'zł', onBlur, ...props }: MoneyInputProps) {
  const [text, setText] = useState(() => formatMajor(value));
  const [lastValue, setLastValue] = useState(value);

  // Wartość zmieniona z zewnątrz (reset formularza) nadpisuje tekst.
  // `Object.is`: `NaN` (niepoprawny tekst) jest równe sobie, więc nie zapętla renderowania.
  if (!Object.is(value, lastValue)) {
    setLastValue(value);
    if (!Object.is(value, parseMajor(text))) setText(formatMajor(value));
  }

  return (
    <InputGroup end={<span className="pr-3 text-base text-muted-foreground">{suffix}</span>}>
      <Input
        inputMode="decimal"
        autoComplete="off"
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          const parsed = parseMajor(event.target.value);
          setLastValue(parsed);
          onChange(parsed);
        }}
        onBlur={(event) => {
          const parsed = parseMajor(text);
          if (parsed !== null && !Number.isNaN(parsed)) setText(formatMajor(parsed));
          onBlur?.(event);
        }}
        className="tabular"
        {...props}
      />
    </InputGroup>
  );
}

function formatMajor(minor: number | null): string {
  if (minor === null || Number.isNaN(minor)) return '';
  const major = fromMinor(minor);
  return Number.isInteger(major) ? String(major) : major.toFixed(2).replace('.', ',');
}

/** „1 640,50” → 164050; puste → `null`; niepoprawne → `NaN`. */
function parseMajor(text: string): number | null {
  const normalized = text.replace(/\s/g, '').replace(',', '.');
  if (normalized === '') return null;
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return Number.NaN;
  return toMinor(Number(normalized));
}
