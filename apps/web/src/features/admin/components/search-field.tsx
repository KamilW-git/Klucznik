import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useDebouncedValue } from '@/shared/lib/use-debounced-value';
import { Input, InputGroup } from '@/shared/ui/input';

interface SearchFieldProps {
  /** Wartość z URL. */
  value: string;
  /** Zatwierdzenie po 300 ms przerwy w pisaniu. */
  onCommit: (value: string) => void;
  label: string;
  placeholder: string;
}

/** Wyszukiwarka listy: debounce 300 ms, zmiana URL z zewnątrz (np. „Wyczyść”) aktualizuje pole. */
export function SearchField({ value, onCommit, label, placeholder }: SearchFieldProps) {
  const [text, setText] = useState(value);
  const debounced = useDebouncedValue(text.trim(), 300);

  useEffect(() => {
    if (debounced !== value.trim()) onCommit(debounced);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reagujemy tylko na wpisany tekst
  }, [debounced]);

  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    if (value.trim() !== text.trim()) setText(value);
  }

  return (
    <InputGroup startIcon={<Search />}>
      <Input
        type="search"
        aria-label={label}
        placeholder={placeholder}
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
    </InputGroup>
  );
}
