import { useAdminOwnersUpdate, type OwnerListItemDto } from '@klucznik/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { getErrorMessage } from '@/shared/lib/api-errors';
import { invalidateAdmin } from '@/shared/lib/invalidate';
import { notifySuccess } from '@/shared/lib/notify';
import { Alert } from '@/shared/ui/alert';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';

interface OwnerAccessDialogProps {
  /** Właściciel do zablokowania (aktywny) albo odblokowania (zablokowany); `null` zamyka dialog. */
  owner: OwnerListItemDto | null;
  onClose: () => void;
}

/**
 * Blokada i odblokowanie konta (`PATCH isActive`, Q-10). Blokada unieważnia wszystkie sesje
 * właściciela (refresh tokeny), dane i rezerwacje zostają.
 */
export function OwnerAccessDialog({ owner, onClose }: OwnerAccessDialogProps) {
  const queryClient = useQueryClient();
  const update = useAdminOwnersUpdate();
  // Ostatni pokazany właściciel: treść nie zmienia się w trakcie animacji zamykania.
  const [shown, setShown] = useState(owner);
  if (owner && owner !== shown) setShown(owner);
  const block = shown?.isActive ?? true;
  const name = shown ? `${shown.firstName} ${shown.lastName}` : '';

  const close = () => {
    update.reset();
    onClose();
  };

  return (
    <ConfirmDialog
      open={owner !== null}
      onOpenChange={(open) => !open && close()}
      title={block ? 'Zablokować konto?' : 'Odblokować konto?'}
      description={
        block
          ? // Q-10: obiekty zablokowanego właściciela pozostają aktywne publicznie.
            `${name} nie zaloguje się do panelu, a wszystkie aktywne sesje tego konta zostaną zakończone. Obiekty właściciela nadal przyjmują rezerwacje online. Konto można później odblokować.`
          : `${name} znów zaloguje się do panelu dotychczasowym hasłem.`
      }
      confirmLabel={block ? 'Zablokuj konto' : 'Odblokuj konto'}
      cancelLabel="Wróć"
      tone={block ? 'destructive' : 'primary'}
      loading={update.isPending}
      onConfirm={() => {
        if (!owner) return;
        update.mutate(
          { id: owner.id, data: { isActive: !block } },
          {
            onSuccess: () => {
              void invalidateAdmin(queryClient);
              notifySuccess(block ? `Zablokowano konto: ${name}` : `Odblokowano konto: ${name}`);
              close();
            },
          },
        );
      }}
    >
      {update.isError && <Alert title={getErrorMessage(update.error)} />}
    </ConfirmDialog>
  );
}
