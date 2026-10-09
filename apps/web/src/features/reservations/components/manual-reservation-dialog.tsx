import { zodResolver } from '@hookform/resolvers/zod';
import {
  isApiError,
  useAvailabilityQuote,
  useReservationsCreateManual,
  useRoomsList,
  type ReservationDto,
} from '@klucznik/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { Info, UserRound, X } from 'lucide-react';
import { Controller, useForm, useWatch } from 'react-hook-form';

import { useRoomOccupancy } from '@/features/availability';
import { GuestAutocomplete } from '@/features/guests';
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
import { Input } from '@/shared/ui/input';
import { Select } from '@/shared/ui/select';
import { Stepper } from '@/shared/ui/stepper';
import { Textarea } from '@/shared/ui/textarea';

import {
  manualReservationSchema,
  type ManualReservationFormOutput,
  type ManualReservationFormValues,
} from '../schemas';
import { StayQuoteSummary } from './stay-quote-summary';

export interface ManualReservationPrefill {
  roomId?: string;
  checkIn?: string;
  checkOut?: string;
}

interface ManualReservationDialogProps {
  propertyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefill?: ManualReservationPrefill;
  onCreated?: (reservation: ReservationDto) => void;
}

function defaults(prefill?: ManualReservationPrefill): ManualReservationFormValues {
  return {
    roomId: prefill?.roomId ?? '',
    stay:
      prefill?.checkIn && prefill.checkOut ? { from: prefill.checkIn, to: prefill.checkOut } : null,
    guestsCount: 2,
    guest: { mode: 'none' },
    guestNotes: '',
    internalNotes: '',
    ignoreMinNights: false,
  };
}

/** Nazwa z autocomplete („Jan Kowalski”) jako imię i nazwisko nowego gościa. */
function splitName(query: string): { firstName: string; lastName: string } {
  if (query.includes('@') || /\d/.test(query)) return { firstName: '', lastName: '' };
  const [firstName = '', ...rest] = query.split(/\s+/);
  return { firstName, lastName: rest.join(' ') };
}

/**
 * O5 „Nowa rezerwacja” (reservations.md): pokój, termin z zajętymi nocami, goście, gość z książki
 * gości albo nowy, notatki; cena i kolizje z `quote`. Rezerwacja ręczna jest od razu potwierdzona.
 */
export function ManualReservationDialog(props: ManualReservationDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      {/* Montowany przy każdym otwarciu: świeży formularz z danymi z kalendarza / pulpitu. */}
      {props.open && <ManualReservationForm {...props} />}
    </Dialog>
  );
}

function ManualReservationForm({
  propertyId,
  onOpenChange,
  prefill,
  onCreated,
}: ManualReservationDialogProps) {
  const queryClient = useQueryClient();
  const rooms = useRoomsList(propertyId, { includeInactive: false });
  const form = useForm<ManualReservationFormValues, unknown, ManualReservationFormOutput>({
    resolver: zodResolver(manualReservationSchema),
    defaultValues: defaults(prefill),
  });
  const { errors } = form.formState;
  // Błędy pól nowego gościa (unia `guest` nie zawęża typu błędów).
  const guestErrors = errors.guest as
    Partial<Record<'firstName' | 'lastName' | 'email' | 'phone', { message?: string }>> | undefined;
  const [roomId, stay, guestsCount, guest, ignoreMinNights] = useWatch({
    control: form.control,
    name: ['roomId', 'stay', 'guestsCount', 'guest', 'ignoreMinNights'],
  });

  const occupancy = useRoomOccupancy(propertyId, roomId || null, {
    initialMonth: prefill?.checkIn ? parseApiDate(prefill.checkIn) : undefined,
  });
  const quote = useAvailabilityQuote(
    roomId,
    { checkIn: stay?.from ?? '', checkOut: stay?.to ?? '', guests: guestsCount },
    { query: { enabled: Boolean(roomId && stay), retry: false } },
  );
  const create = useReservationsCreateManual();

  const room = rooms.data?.data.find((item) => item.id === roomId);
  const blocked =
    quote.data &&
    !quote.data.available &&
    !(quote.data.unavailableReason === 'MIN_NIGHTS_NOT_MET' && ignoreMinNights);

  const onSubmit = form.handleSubmit((values) => {
    if (values.guest.mode === 'none') return;
    const guestInput =
      values.guest.mode === 'existing'
        ? { id: values.guest.id }
        : {
            firstName: values.guest.firstName,
            lastName: values.guest.lastName,
            email: values.guest.email || null,
            phone: values.guest.phone || null,
          };
    create.mutate(
      {
        propertyId,
        data: {
          roomId: values.roomId,
          checkIn: values.stay.from,
          checkOut: values.stay.to,
          guestsCount: values.guestsCount,
          guest: guestInput,
          guestNotes: values.guestNotes.trim() || null,
          internalNotes: values.internalNotes.trim() || null,
          ignoreMinNights: values.ignoreMinNights,
        },
      },
      {
        onSuccess: (reservation) => {
          void invalidateReservations(queryClient);
          notifySuccess(
            `Dodano rezerwację ${reservation.number}`,
            `${reservation.guest.firstName} ${reservation.guest.lastName}, ${formatMoney(reservation.totalPrice, reservation.currency)}`,
          );
          onOpenChange(false);
          onCreated?.(reservation);
        },
        onError: (error) => {
          applyFieldErrors(error, form.setError, [
            'roomId',
            'guestsCount',
            'guestNotes',
            'internalNotes',
          ]);
          if (isApiError(error) && error.code === 'RESERVATION_OVERLAP') void quote.refetch();
        },
      },
    );
  });

  return (
    <DialogContent
      size="xl"
      title="Nowa rezerwacja"
      description="Rezerwacja ręczna (np. telefoniczna) jest od razu potwierdzona."
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={create.isPending}>
            Anuluj
          </Button>
          <Button
            type="submit"
            form="manual-reservation-form"
            loading={create.isPending}
            disabled={Boolean(blocked)}
          >
            Dodaj rezerwację
          </Button>
        </>
      }
    >
      <form
        id="manual-reservation-form"
        noValidate
        onSubmit={(event) => void onSubmit(event)}
        className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]"
      >
        <div className="grid content-start gap-5">
          <FormField label="Pokój" required error={errors.roomId?.message}>
            <Controller
              control={form.control}
              name="roomId"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value);
                    form.setValue('ignoreMinNights', false);
                  }}
                  placeholder={rooms.isPending ? 'Ładowanie pokoi…' : 'Wybierz pokój'}
                  options={(rooms.data?.data ?? []).map((item) => ({
                    value: item.id,
                    label: `${item.name} (do ${item.capacity} os.)`,
                  }))}
                />
              )}
            />
          </FormField>

          <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_12rem]">
            <FormField
              label="Termin pobytu"
              required
              error={errors.stay?.message}
              hint={roomId ? 'Zajęte noce są niedostępne.' : 'Najpierw wybierz pokój.'}
            >
              <Controller
                control={form.control}
                name="stay"
                render={({ field }) => (
                  <DateRangePicker
                    value={field.value}
                    onChange={(value) => {
                      field.onChange(value);
                      form.setValue('ignoreMinNights', false);
                    }}
                    isNightUnavailable={occupancy.isNightUnavailable}
                    onMonthChange={occupancy.onMonthChange}
                    defaultMonth={occupancy.month}
                    placeholder="Przyjazd – wyjazd"
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
                render={({ field }) => (
                  <Stepper value={field.value} onChange={field.onChange} min={1} max={99} />
                )}
              />
            </FormField>
          </div>

          <fieldset className="grid gap-4 rounded-lg border p-4">
            <legend className="px-1 text-base font-semibold">Gość</legend>
            {guest.mode === 'existing' ? (
              <div className="flex items-center gap-3 rounded-md bg-accent px-4 py-3">
                <UserRound className="size-5 text-primary" aria-hidden="true" />
                <span className="flex-1 font-medium">{guest.label}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => form.setValue('guest', { mode: 'none' })}
                >
                  <X aria-hidden="true" />
                  Zmień
                </Button>
              </div>
            ) : guest.mode === 'new' ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Imię" required error={guestErrors?.firstName?.message}>
                  <Input autoComplete="off" {...form.register('guest.firstName')} />
                </FormField>
                <FormField label="Nazwisko" required error={guestErrors?.lastName?.message}>
                  <Input autoComplete="off" {...form.register('guest.lastName')} />
                </FormField>
                <FormField
                  label="E-mail"
                  hint="Bez e-maila gość nie dostanie potwierdzenia."
                  error={guestErrors?.email?.message}
                >
                  <Input type="email" autoComplete="off" {...form.register('guest.email')} />
                </FormField>
                <FormField label="Telefon" error={guestErrors?.phone?.message}>
                  <Input type="tel" autoComplete="off" {...form.register('guest.phone')} />
                </FormField>
                <Button
                  variant="link"
                  className="justify-self-start"
                  onClick={() => form.setValue('guest', { mode: 'none' })}
                >
                  Wybierz gościa z listy
                </Button>
              </div>
            ) : (
              <div className="grid gap-2">
                <GuestAutocomplete
                  propertyId={propertyId}
                  onSelect={(selected) =>
                    form.setValue(
                      'guest',
                      {
                        mode: 'existing',
                        id: selected.id,
                        label: `${selected.firstName} ${selected.lastName}${selected.email ? ` (${selected.email})` : ''}`,
                      },
                      { shouldValidate: true },
                    )
                  }
                  onCreateNew={(query) =>
                    form.setValue('guest', {
                      mode: 'new',
                      ...splitName(query),
                      email: query.includes('@') ? query : '',
                      phone: '',
                    })
                  }
                />
                <Button
                  variant="link"
                  className="justify-self-start"
                  onClick={() =>
                    form.setValue('guest', {
                      mode: 'new',
                      firstName: '',
                      lastName: '',
                      email: '',
                      phone: '',
                    })
                  }
                >
                  Dodaj nowego gościa
                </Button>
                {errors.guest?.message && (
                  <p className="text-sm text-destructive" role="alert">
                    {errors.guest.message}
                  </p>
                )}
              </div>
            )}
          </fieldset>

          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label="Uwagi gościa" error={errors.guestNotes?.message}>
              <Textarea rows={3} {...form.register('guestNotes')} />
            </FormField>
            <FormField
              label="Notatka wewnętrzna"
              hint="Widoczna tylko w panelu."
              error={errors.internalNotes?.message}
            >
              <Textarea rows={3} {...form.register('internalNotes')} />
            </FormField>
          </div>
        </div>

        <aside className="grid content-start gap-4">
          <StayQuoteSummary
            quote={quote.data}
            loading={quote.isFetching && !quote.data}
            error={quote.error}
            capacity={room?.capacity}
            ignoreMinNights={{
              checked: ignoreMinNights,
              onChange: (checked) => form.setValue('ignoreMinNights', checked),
            }}
          />
          <p className="flex gap-2 rounded-lg bg-info-soft p-3 text-sm text-info">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            Rezerwacja ręczna jest od razu potwierdzona. Gość z adresem e-mail dostanie
            potwierdzenie.
          </p>
          {create.isError &&
            !(isApiError(create.error) && create.error.code === 'VALIDATION_ERROR') && (
              <Alert title={getErrorMessage(create.error)} />
            )}
        </aside>
      </form>
    </DialogContent>
  );
}
