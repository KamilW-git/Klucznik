import { zodResolver } from '@hookform/resolvers/zod';
import {
  isApiError,
  useAvailabilityQuote,
  useReservationsUpdate,
  useRoomsList,
  type ReservationDto,
  type UpdateReservationDto,
} from '@klucznik/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { Controller, useForm, useWatch } from 'react-hook-form';

import { useRoomOccupancy } from '@/features/availability';
import { getErrorMessage } from '@/shared/lib/api-errors';
import { parseApiDate } from '@/shared/lib/dates';
import { applyFieldErrors } from '@/shared/lib/form-errors';
import { invalidateReservations } from '@/shared/lib/invalidate';
import { formatMoney } from '@/shared/lib/money';
import { notifySuccess } from '@/shared/lib/notify';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { DateRangePicker } from '@/shared/ui/date-range-picker';
import { Dialog, DialogContent } from '@/shared/ui/dialog';
import { FormField } from '@/shared/ui/form-field';
import { Select } from '@/shared/ui/select';
import { Stepper } from '@/shared/ui/stepper';
import { Textarea } from '@/shared/ui/textarea';

import {
  editReservationSchema,
  type EditReservationFormOutput,
  type EditReservationFormValues,
} from '../schemas';
import { StayQuoteSummary } from './stay-quote-summary';

interface EditReservationDialogProps {
  reservation: ReservationDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `VERSION_CONFLICT`: odświeżenie szczegółów w drawerze. */
  onConflict: () => void;
}

/** Edycja terminu, pokoju, liczby gości i uwag (Q-02). Zmiana terminu lub pokoju przelicza cenę. */
export function EditReservationDialog(props: EditReservationDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      {props.open && <EditReservationForm {...props} />}
    </Dialog>
  );
}

function EditReservationForm({
  reservation,
  onOpenChange,
  onConflict,
}: EditReservationDialogProps) {
  const queryClient = useQueryClient();
  const rooms = useRoomsList(reservation.propertyId, { includeInactive: false });
  const form = useForm<EditReservationFormValues, unknown, EditReservationFormOutput>({
    resolver: zodResolver(editReservationSchema),
    defaultValues: {
      roomId: reservation.room.id,
      stay: { from: reservation.checkIn, to: reservation.checkOut },
      guestsCount: reservation.guestsCount,
      guestNotes: reservation.guestNotes ?? '',
      ignoreMinNights: false,
    },
  });
  const { errors } = form.formState;
  const [roomId, stay, guestsCount, ignoreMinNights] = useWatch({
    control: form.control,
    name: ['roomId', 'stay', 'guestsCount', 'ignoreMinNights'],
  });
  const stayChanged =
    roomId !== reservation.room.id ||
    stay?.from !== reservation.checkIn ||
    stay.to !== reservation.checkOut;

  const occupancy = useRoomOccupancy(reservation.propertyId, roomId || null, {
    initialMonth: parseApiDate(reservation.checkIn),
    excludeReservationId: reservation.id,
  });
  const quote = useAvailabilityQuote(
    roomId,
    {
      checkIn: stay?.from ?? '',
      checkOut: stay?.to ?? '',
      guests: guestsCount,
      excludeReservationId: reservation.id,
    },
    { query: { enabled: Boolean(roomId && stay) && stayChanged, retry: false } },
  );
  const update = useReservationsUpdate();
  const room = rooms.data?.data.find((item) => item.id === roomId);
  const manual = reservation.source === 'MANUAL';
  const blocked =
    stayChanged &&
    quote.data &&
    !quote.data.available &&
    !(manual && quote.data.unavailableReason === 'MIN_NIGHTS_NOT_MET' && ignoreMinNights);
  const conflict = isApiError(update.error) && update.error.code === 'VERSION_CONFLICT';

  const onSubmit = form.handleSubmit((values) => {
    const data: UpdateReservationDto = { version: reservation.version };
    if (values.roomId !== reservation.room.id) data.roomId = values.roomId;
    if (values.stay.from !== reservation.checkIn) data.checkIn = values.stay.from;
    if (values.stay.to !== reservation.checkOut) data.checkOut = values.stay.to;
    if (values.guestsCount !== reservation.guestsCount) data.guestsCount = values.guestsCount;
    const guestNotes = values.guestNotes.trim() || null;
    if (guestNotes !== reservation.guestNotes) data.guestNotes = guestNotes;
    if (manual && values.ignoreMinNights) data.ignoreMinNights = true;
    if (Object.keys(data).length === 1) {
      onOpenChange(false);
      return;
    }
    update.mutate(
      { id: reservation.id, data },
      {
        onSuccess: (updated) => {
          void invalidateReservations(queryClient);
          notifySuccess(
            'Zapisano zmiany rezerwacji',
            updated.totalPrice !== reservation.totalPrice
              ? `Nowa cena: ${formatMoney(updated.totalPrice, updated.currency)}`
              : undefined,
          );
          onOpenChange(false);
        },
        onError: (error) =>
          applyFieldErrors(error, form.setError, ['roomId', 'guestsCount', 'guestNotes']),
      },
    );
  });

  return (
    <DialogContent
      size="lg"
      title={`Edycja rezerwacji ${reservation.number}`}
      description="Zmiana terminu lub pokoju przelicza cenę według aktualnego cennika."
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={update.isPending}>
            Anuluj
          </Button>
          <Button
            type="submit"
            form="edit-reservation-form"
            loading={update.isPending}
            disabled={Boolean(blocked) || conflict}
          >
            Zapisz zmiany
          </Button>
        </>
      }
    >
      <form
        id="edit-reservation-form"
        noValidate
        onSubmit={(event) => void onSubmit(event)}
        className="grid gap-5"
      >
        {conflict && (
          <Alert
            variant="warning"
            title="Ktoś w międzyczasie zmienił tę rezerwację – odśwież dane"
            action={
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  onConflict();
                }}
              >
                Odśwież dane
              </Button>
            }
          />
        )}
        <FormField label="Pokój" required error={errors.roomId?.message}>
          <Controller
            control={form.control}
            name="roomId"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
                options={(rooms.data?.data ?? []).map((item) => ({
                  value: item.id,
                  label: `${item.name} (do ${item.capacity} os.)`,
                }))}
              />
            )}
          />
        </FormField>
        <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_12rem]">
          <FormField label="Termin pobytu" required error={errors.stay?.message}>
            <Controller
              control={form.control}
              name="stay"
              render={({ field }) => (
                <DateRangePicker
                  value={field.value}
                  onChange={field.onChange}
                  isNightUnavailable={occupancy.isNightUnavailable}
                  onMonthChange={occupancy.onMonthChange}
                  defaultMonth={occupancy.month}
                />
              )}
            />
          </FormField>
          <FormField
            label="Liczba gości"
            required
            hint={room ? `Pokój mieści do ${room.capacity} os.` : undefined}
          >
            <Controller
              control={form.control}
              name="guestsCount"
              render={({ field }) => <Stepper value={field.value} onChange={field.onChange} />}
            />
          </FormField>
        </div>
        <FormField label="Uwagi gościa" error={errors.guestNotes?.message}>
          <Textarea rows={3} {...form.register('guestNotes')} />
        </FormField>
        {stayChanged && (
          <StayQuoteSummary
            quote={quote.data}
            loading={quote.isFetching && !quote.data}
            error={quote.error}
            capacity={room?.capacity}
            ignoreMinNights={
              manual
                ? {
                    checked: ignoreMinNights,
                    onChange: (checked) => form.setValue('ignoreMinNights', checked),
                  }
                : undefined
            }
          />
        )}
        {update.isError &&
          !conflict &&
          !(isApiError(update.error) && update.error.code === 'VALIDATION_ERROR') && (
            <Alert title={getErrorMessage(update.error)} />
          )}
      </form>
    </DialogContent>
  );
}
