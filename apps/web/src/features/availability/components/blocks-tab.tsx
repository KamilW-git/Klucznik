import {
  useBlocksList,
  useBlocksRemove,
  type AvailabilityBlockDto,
  type RoomDto,
} from '@klucznik/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { Ban, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import { formatDate, formatNights, nightsBetween, toApiDate } from '@/shared/lib/dates';
import { invalidateAvailability } from '@/shared/lib/invalidate';
import { notifyError, notifySuccess } from '@/shared/lib/notify';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { Skeleton } from '@/shared/ui/skeleton';
import { EmptyState, ErrorState } from '@/shared/ui/states';

import { BlockDialog } from './block-dialog';

/** O7 „Blokady terminów”: bieżące i przyszłe blokady pokoju, dodawanie i usuwanie. */
export function BlocksTab({ room }: { room: RoomDto }) {
  const queryClient = useQueryClient();
  const today = useMemo(() => toApiDate(new Date()), []);
  const blocks = useBlocksList(room.id, { from: today });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState<AvailabilityBlockDto | null>(null);
  const remove = useBlocksRemove({
    mutation: {
      onSuccess: () => {
        notifySuccess('Usunięto blokadę – termin jest znowu dostępny');
        setDeleting(null);
        void invalidateAvailability(queryClient);
      },
      onError: (error) => notifyError(error, 'Nie udało się usunąć blokady'),
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="grid gap-1">
          <CardTitle>Blokady terminów</CardTitle>
          <CardDescription>
            Noce wyłączone z rezerwacji (np. remont, pobyt własny). Pokazujemy bieżące i przyszłe.
          </CardDescription>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus aria-hidden="true" />
          Zablokuj termin
        </Button>
      </CardHeader>
      <CardContent>
        {blocks.isPending ? (
          <Skeleton className="h-24 w-full" />
        ) : blocks.isError ? (
          <ErrorState error={blocks.error} onRetry={() => void blocks.refetch()} />
        ) : blocks.data.data.length === 0 ? (
          <EmptyState
            className="border-dashed py-8"
            icon={<Ban aria-hidden="true" />}
            title="Brak blokad"
            description="Wszystkie noce tego pokoju są dostępne do rezerwacji."
          />
        ) : (
          <ul className="grid divide-y rounded-md border">
            {blocks.data.data.map((block) => (
              <li
                key={block.id}
                className="flex flex-wrap items-center gap-3 bg-hatched/40 px-4 py-3"
              >
                <Ban className="size-5 text-muted-foreground" aria-hidden="true" />
                <span className="grid flex-1 gap-0.5">
                  <span className="font-medium tabular">
                    {formatDate(block.dateFrom)} – {formatDate(block.dateTo)}{' '}
                    <span className="font-normal text-muted-foreground">
                      ({formatNights(nightsBetween(block.dateFrom, block.dateTo) + 1)})
                    </span>
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {block.reason ?? 'Bez powodu'}
                  </span>
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  aria-label={`Usuń blokadę ${formatDate(block.dateFrom)} – ${formatDate(block.dateTo)}`}
                  onClick={() => setDeleting(block)}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      <BlockDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        rooms={[room]}
        fixedRoomId={room.id}
      />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Usunąć blokadę?"
        description={
          deleting &&
          `Noce ${formatDate(deleting.dateFrom)} – ${formatDate(deleting.dateTo)} będą znowu dostępne do rezerwacji.`
        }
        confirmLabel="Usuń blokadę"
        loading={remove.isPending}
        onConfirm={() => deleting && remove.mutate({ id: deleting.id })}
      />
    </Card>
  );
}
