import { Copy, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';

import { notifySuccess } from '@/shared/lib/notify';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';

import { generatePassword } from '../password';

interface PasswordFieldProps {
  registration: UseFormRegisterReturn;
  value: string;
  /** Nowe hasło z generatora (ustawia pole i je pokazuje). */
  onGenerate: (password: string) => void;
}

/** Hasło tymczasowe: pokaż / ukryj, kopiuj, „Generuj” (w `FormField`). */
export function PasswordField({ registration, value, onGenerate }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      notifySuccess('Skopiowano hasło');
    } catch {
      // Brak dostępu do schowka: hasło można przepisać po kliknięciu „Pokaż”.
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      {/* Dwa przyciski w polu: własny odstęp z prawej zamiast `InputGroup` (ten mieści jeden). */}
      <div className="relative flex flex-1 items-center">
        <Input
          type={visible ? 'text' : 'password'}
          autoComplete="new-password"
          spellCheck={false}
          className="pr-24 font-mono focus-visible:pr-[95px]"
          {...registration}
        />
        <span className="absolute right-1 flex">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setVisible((current) => !current)}
            aria-label={visible ? 'Ukryj hasło' : 'Pokaż hasło'}
          >
            {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => void copy()}
            disabled={!value}
            aria-label="Kopiuj hasło"
          >
            <Copy aria-hidden="true" />
          </Button>
        </span>
      </div>
      <Button
        variant="outline"
        onClick={() => {
          onGenerate(generatePassword());
          setVisible(true);
        }}
      >
        <RefreshCw aria-hidden="true" />
        Generuj
      </Button>
    </div>
  );
}
