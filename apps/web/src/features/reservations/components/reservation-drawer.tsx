import {
  isApiError,
  useReservationsGet,
  useReservationsUpdate,
  type ReservationDto,
} from '@klucznik/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { Check, Mail, Pencil, Phone, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { getErrorMessage } from '@/shared/lib/api-errors';
import {
  formatDate,
  formatDateTime,
  formatNights,
  formatStayRange,
  toApiDate,
} from '@/shared/lib/dates';
import { invalidateReservations } from '@/shared/lib/invalidate';
import { formatMoney } from '@/shared/lib/money';
import { notifySuccess } from '@/shared/lib/notify';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Sheet, SheetContent } from '@/shared/ui/sheet';
import { Skeleton } from '@/shared/ui/skeleton';
import { ErrorState } from '@/shared/ui/states';
import { StatusBadge } from '@/shared/ui/status-badge';
import { Textarea } from '@/shared/ui/textarea';

import { useConfirmReservation } from '../hooks/use-reservation-actions';
import {
  ACTOR_LABELS,
  EVENT_LABELS,
  FIELD_LABELS,
  SOURCE_LABELS,
  canCancel,
  cancelLabel,
} from '../labels';
import { CancelReservationDialog } from './cancel-reservation-dialog';
import { EditReservationDialog } from './edit-reservation-dialog';

interface ReservationDrawerProps {
  /** `null` = zamknięty. */
  reservationId: string | null;
  onClose: () => void;
}

/**
 * Szczegóły rezerwacji (O4, drawer): gość, pobyt, rozbicie ceny, uwagi, notatka wewnętrzna,
 * historia i akcje (potwierdź, edytuj, anuluj / odrzuć).
 */
export function ReservationDrawer({ reservationId, onClose }: ReservationDrawerProps) {
  return (
    <Sheet open={reservationId !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" title="Szczegóły rezerwacji" className="max-w-xl">
        {reservationId && <DrawerBody reservationId={reservationId} />}
      </SheetContent>
    </Sheet>
  );
}

function DrawerBody({ reservationId }: { reservationId: string }) {
  const query = useReservationsGet(reservationId);
  if (query.isPending) {
    return (
      <div className="grid gap-4 px-6 py-4" role="status">
        <span className="sr-only">Ładowanie rezerwacji…</span>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (query.isError) {
    return (
      <div className="px-6 py-4">
        <ErrorState
          error={query.error}
          title={
            isApiError(query.error) && query.error.status === 404
              ? 'Nie znaleziono rezerwacji'
              : undefined
          }
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
        />
      </div>
    );
  }
  return <ReservationDetails reservation={query.data} onRefresh={() => void query.refetch()} />;
}

function ReservationDetails({
  reservation,
  onRefresh,
}: {
  reservation: ReservationDto;
  onRefresh: () => void;
}) {
  const confirm = useConfirmReservation();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const active = canCancel(reservation.status);
  // Q-02: termin, pokój i liczbę gości można zmienić tylko przed przyjazdem (API: RESERVATION_NOT_EDITABLE).
  const editable = active && reservation.checkIn >= toApiDate(new Date());

  return (
    <>
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <header className="grid gap-2 border-b pb-4">
          <h2 className="text-title-lg tabular">{reservation.number}</h2>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <StatusBadge
              status={reservation.status}
              label={reservation.status === 'PENDING' ? 'Oczekuje na potwierdzenie' : undefined}
            />
            <span>Wpłynęła {formatDateTime(reservation.createdAt)}</span>
            <span aria-hidden="true">•</span>
            <span>{SOURCE_LABELS[reservation.source]}</span>
          </div>
          {reservation.status === 'PENDING' && reservation.expiresAt && (
            <p className="text-sm font-medium text-warning">
              Wygaśnie {formatDateTime(reservation.expiresAt)}, jeśli jej nie potwierdzisz.
            </p>
          )}
        </header>

        <div className="grid gap-4 pt-4">
          <Section title="Gość">
            <p className="text-base font-semibold">
              {reservation.guest.firstName} {reservation.guest.lastName}
            </p>
            <div className="flex flex-wrap gap-2">
              {reservation.guest.phone && (
                <Button asChild variant="outline" size="sm">
                  <a href={`tel:${reservation.guest.phone}`}>
                    <Phone aria-hidden="true" />
                    {reservation.guest.phone}
                  </a>
                </Button>
              )}
              {reservation.guest.email && (
                <Button asChild variant="outline" size="sm">
                  <a href={`mailto:${reservation.guest.email}`}>
                    <Mail aria-hidden="true" />
                    {reservation.guest.email}
                  </a>
                </Button>
              )}
              {!reservation.guest.phone && !reservation.guest.email && (
                <p className="text-sm text-muted-foreground">Brak danych kontaktowych.</p>
              )}
            </div>
          </Section>

          <Section title="Szczegóły pobytu">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <Row label="Pokój" value={reservation.room.name} />
              <Row
                label="Termin"
                value={formatStayRange(reservation.checkIn, reservation.checkOut)}
              />
              <Row label="Liczba gości" value={`${reservation.guestsCount} os.`} />
            </dl>
          </Section>

          <Section title="Rozliczenie">
            <ul className="grid gap-1 text-sm tabular">
              {reservation.priceBreakdown.map((night) => (
                <li key={night.date} className="flex justify-between">
                  <span>{formatDate(night.date)}</span>
                  <span>{formatMoney(night.price, reservation.currency)}</span>
                </li>
              ))}
            </ul>
            <p className="flex justify-between border-t pt-2 text-base font-semibold tabular">
              <span>Razem ({formatNights(reservation.nights)})</span>
              <span>{formatMoney(reservation.totalPrice, reservation.currency)}</span>
            </p>
          </Section>

          {reservation.guestNotes && (
            <Section title="Uwagi gościa">
              <p className="text-sm whitespace-pre-line">{reservation.guestNotes}</p>
            </Section>
          )}

          {reservation.status === 'CANCELLED' && (
            <Section title="Anulowanie">
              <p className="text-sm">
                {reservation.cancelledBy && `${ACTOR_LABELS[reservation.cancelledBy]}, `}
                {reservation.cancelledAt && formatDateTime(reservation.cancelledAt)}
              </p>
              {reservation.cancellationReason && (
                <p className="text-sm text-muted-foreground">
                  Powód: {reservation.cancellationReason}
                </p>
              )}
            </Section>
          )}

          <InternalNote reservation={reservation} onRefresh={onRefresh} />

          <Section title="Historia">
            <ol className="grid gap-3 border-l-2 border-border pl-4">
              {reservation.events.map((event, index) => (
                <li key={index} className="relative text-sm">
                  <span
                    className="absolute top-1.5 -left-[1.3rem] size-2.5 rounded-full bg-primary"
                    aria-hidden="true"
                  />
                  <p className="font-medium">{EVENT_LABELS[event.type]}</p>
                  <p className="text-muted-foreground">
                    {formatDateTime(event.createdAt)} •{' '}
                    {event.actorName ?? ACTOR_LABELS[event.actorType]}
                  </p>
                  {eventDetail(event.payload) && (
                    <p className="text-muted-foreground">{eventDetail(event.payload)}</p>
                  )}
                </li>
              ))}
            </ol>
          </Section>
        </div>
      </div>

      {active && (
        <footer className="flex flex-wrap gap-3 border-t bg-card px-6 py-4">
          {reservation.status === 'PENDING' && (
            <Button
              className="flex-1"
              loading={confirm.isPending}
              onClick={() => confirm.mutate({ id: reservation.id })}
            >
              {!confirm.isPending && <Check aria-hidden="true" />}
              Potwierdź
            </Button>
          )}
          {editable && (
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil aria-hidden="true" />
              Edytuj
            </Button>
          )}
          <Button variant="destructive-outline" onClick={() => setCancelOpen(true)}>
            <X aria-hidden="true" />
            {cancelLabel(reservation.status)}
          </Button>
        </footer>
      )}

      <CancelReservationDialog
        reservation={cancelOpen ? reservation : null}
        onOpenChange={setCancelOpen}
      />
      <EditReservationDialog
        reservation={reservation}
        open={editOpen}
        onOpenChange={setEditOpen}
        onConflict={onRefresh}
      />
    </>
  );
}

/** Notatka wewnętrzna: zapis `PATCH` z `version` (BR-11) w każdym statusie. */
function InternalNote({
  reservation,
  onRefresh,
}: {
  reservation: ReservationDto;
  onRefresh: () => void;
}) {
  const queryClient = useQueryClient();
  const [note, setNote] = useState(reservation.internalNotes ?? '');
  const [lastSaved, setLastSaved] = useState(reservation.internalNotes ?? '');
  const update = useReservationsUpdate();
  const conflict = isApiError(update.error) && update.error.code === 'VERSION_CONFLICT';

  // Nowe dane z serwera (np. po odświeżeniu) zastępują notatkę, jeśli nie była edytowana.
  if ((reservation.internalNotes ?? '') !== lastSaved && note === lastSaved) {
    setLastSaved(reservation.internalNotes ?? '');
    setNote(reservation.internalNotes ?? '');
  }

  const dirty = note.trim() !== lastSaved.trim();
  return (
    <Section title="Notatka wewnętrzna">
      <label htmlFor="internal-note" className="sr-only">
        Notatka wewnętrzna (widoczna tylko w panelu)
      </label>
      <Textarea
        id="internal-note"
        rows={3}
        maxLength={2000}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Widoczna tylko dla Ciebie, np. „Gość prosił o łóżeczko”."
      />
      {conflict ? (
        <Alert
          variant="warning"
          title="Ktoś w międzyczasie zmienił tę rezerwację – odśwież dane"
          action={
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                update.reset();
                onRefresh();
              }}
            >
              Odśwież dane
            </Button>
          }
        />
      ) : (
        update.isError && <Alert title={getErrorMessage(update.error)} />
      )}
      {dirty && (
        <Button
          size="sm"
          className="justify-self-start"
          loading={update.isPending}
          onClick={() =>
            update.mutate(
              {
                id: reservation.id,
                data: { version: reservation.version, internalNotes: note.trim() || null },
              },
              {
                onSuccess: (updated) => {
                  setLastSaved(updated.internalNotes ?? '');
                  setNote(updated.internalNotes ?? '');
                  notifySuccess('Zapisano notatkę');
                  void invalidateReservations(queryClient);
                },
              },
            )
          }
        >
          Zapisz notatkę
        </Button>
      )}
    </Section>
  );
}

function eventDetail(payload: Record<string, unknown> | null): string | null {
  if (!payload) return null;
  const fields = payload['fields'];
  if (Array.isArray(fields) && fields.length > 0) {
    return `Zmienione: ${fields.map((field) => FIELD_LABELS[String(field)] ?? String(field)).join(', ')}`;
  }
  const reason = payload['reason'];
  if (typeof reason === 'string' && reason) return `Powód: ${reason}`;
  return null;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-3 rounded-lg border bg-background/50 p-4">
      <h3 className="text-overline text-muted-foreground uppercase">{title}</h3>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium tabular">{value}</dd>
    </>
  );
}
