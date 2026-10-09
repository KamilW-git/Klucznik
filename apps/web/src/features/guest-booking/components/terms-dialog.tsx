import type { PublicPropertyDto } from '@klucznik/api-client';

import { formatCancellationPolicy, formatConfirmationTime } from '@/features/public-property';
import { formatTime } from '@/shared/lib/dates';
import { Button } from '@/shared/ui/button';
import { DialogClose, DialogContent } from '@/shared/ui/dialog';

/**
 * „Warunki rezerwacji” (Q-19): zasady obiektu z danych API zamiast atrapy regulaminu.
 * Treść regulaminu per obiekt to rozwiązanie po MVP.
 */
export function TermsDialogContent({ property }: { property: PublicPropertyDto }) {
  return (
    <DialogContent
      title="Warunki rezerwacji"
      description={property.name}
      footer={
        <DialogClose asChild>
          <Button>Rozumiem</Button>
        </DialogClose>
      }
    >
      <ul className="grid list-disc gap-3 pl-5 text-base">
        <li>
          Wysłanie formularza to <strong>prośba o rezerwację</strong>. Gospodarz potwierdza ją{' '}
          {formatConfirmationTime(property.pendingExpiryHours)}; bez potwierdzenia prośba wygasa.
        </li>
        <li>
          Zameldowanie od {formatTime(property.checkInTime)}, wymeldowanie do{' '}
          {formatTime(property.checkOutTime)}.
        </li>
        <li>
          {formatCancellationPolicy(property.cancellationDeadlineDays)}. Rezerwację anulujesz z
          linku w e-mailu; później – w kontakcie z gospodarzem.
        </li>
        <li>
          Cena obejmuje cały pobyt i liczy się według cennika obiektu. Wysłanie prośby niczego nie
          pobiera.
        </li>
        <li>
          Twoje dane (imię, nazwisko, e-mail, telefon, uwagi) otrzymuje gospodarz obiektu{' '}
          {property.name} w celu obsługi rezerwacji.
        </li>
      </ul>
    </DialogContent>
  );
}
