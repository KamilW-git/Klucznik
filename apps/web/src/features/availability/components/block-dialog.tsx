import { zodResolver } from '@hookform/resolvers/zod';
import { isApiError, useBlocksCreate, type RoomDto } from '@klucznik/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { routes } from '@/app/routes';
import { getErrorMessage } from '@/shared/lib/api-errors';
import { applyFieldErrors } from '@/shared/lib/form-errors';
import { invalidateAvailability } from '@/shared/lib/invalidate';
import { notifySuccess } from '@/shared/lib/notify';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { DateRangePicker } from '@/shared/ui/date-range-picker';
import { Dialog, DialogContent } from '@/shared/ui/dialog';
import { FormField } from '@/shared/ui/form-field';
import { Select } from '@/shared/ui/select';
import { Textarea } from '@/shared/ui/textarea';

const blockSchema = z.object({
  roomId: z.string().min(1, 'Wybierz pokój.'),
  nights: z
    .object({ from: z.string(), to: z.string() })
    .nullable()
    .refine((value) => value !== null, 'Wybierz noce do zablokowania.'),
  reason: z.string().trim().max(200, 'Najwyżej 200 znaków.'),
});

type BlockFormValues = z.input<typeof blockSchema>;
type BlockFormOutput = z.output<typeof blockSchema>;

interface BlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pokoje do wyboru (kalendarz) albo jeden stały pokój (zakładka „Blokady terminów”). */
  rooms: readonly Pick<RoomDto, 'id' | 'name'>[];
  fixedRoomId?: string;
}

/** „Zablokuj termin”: noce włącznie, opcjonalny powód (availability.md, Q-15). */
export function BlockDialog(props: BlockDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      {props.open && <BlockForm {...props} />}
    </Dialog>
  );
}

function BlockForm({ onOpenChange, rooms, fixedRoomId }: BlockDialogProps) {
  const queryClient = useQueryClient();
  const form = useForm<BlockFormValues, unknown, BlockFormOutput>({
    resolver: zodResolver(blockSchema),
    defaultValues: { roomId: fixedRoomId ?? '', nights: null, reason: '' },
  });
  const { errors } = form.formState;
  const create = useBlocksCreate();

  const onSubmit = form.handleSubmit((values) =>
    create.mutate(
      {
        roomId: values.roomId,
        data: {
          dateFrom: values.nights.from,
          dateTo: values.nights.to,
          reason: values.reason || null,
        },
      },
      {
        onSuccess: () => {
          void invalidateAvailability(queryClient);
          notifySuccess('Termin został zablokowany');
          onOpenChange(false);
        },
        onError: (error) => applyFieldErrors(error, form.setError, ['roomId', 'reason']),
      },
    ),
  );

  // `details` z `BLOCK_OVERLAPS_RESERVATION`: pierwsza kolidująca rezerwacja (BR-01, Q-15).
  const details =
    isApiError(create.error) && create.error.code === 'BLOCK_OVERLAPS_RESERVATION'
      ? (create.error.details ?? {})
      : null;
  const overlap = details && {
    id:
      typeof details['conflictingReservationId'] === 'string'
        ? details['conflictingReservationId']
        : null,
    number:
      typeof details['conflictingReservationNumber'] === 'string'
        ? details['conflictingReservationNumber']
        : '',
  };

  return (
    <DialogContent
      title="Zablokuj termin"
      description="Zablokowanych nocy goście nie zarezerwują (np. remont, pobyt własny)."
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={create.isPending}>
            Anuluj
          </Button>
          <Button type="submit" form="block-form" loading={create.isPending}>
            Zablokuj termin
          </Button>
        </>
      }
    >
      <form
        id="block-form"
        noValidate
        onSubmit={(event) => void onSubmit(event)}
        className="grid gap-5"
      >
        {!fixedRoomId && (
          <FormField label="Pokój" required error={errors.roomId?.message}>
            <Controller
              control={form.control}
              name="roomId"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder="Wybierz pokój"
                  options={rooms.map((room) => ({ value: room.id, label: room.name }))}
                />
              )}
            />
          </FormField>
        )}
        <FormField
          label="Zablokowane noce"
          required
          hint="Od pierwszej do ostatniej nocy włącznie."
          error={errors.nights?.message}
        >
          <Controller
            control={form.control}
            name="nights"
            render={({ field }) => (
              <DateRangePicker
                mode="nights"
                value={field.value}
                onChange={field.onChange}
                placeholder="Pierwsza – ostatnia noc"
              />
            )}
          />
        </FormField>
        <FormField label="Powód (opcjonalnie)" error={errors.reason?.message}>
          <Textarea
            rows={2}
            maxLength={200}
            placeholder="np. Remont łazienki"
            {...form.register('reason')}
          />
        </FormField>
        {overlap ? (
          <Alert title="Termin obejmuje aktywną rezerwację">
            Najpierw anuluj lub przenieś rezerwację{' '}
            {overlap.id ? (
              <Link className="font-semibold underline" to={routes.panel.reservation(overlap.id)}>
                {overlap.number}
              </Link>
            ) : (
              overlap.number
            )}
            .
          </Alert>
        ) : (
          create.isError &&
          !(isApiError(create.error) && create.error.code === 'VALIDATION_ERROR') && (
            <Alert title={getErrorMessage(create.error)} />
          )
        )}
      </form>
    </DialogContent>
  );
}
