import { usePropertiesDashboard, type ReservationListItemDto } from '@klucznik/api-client';
import { differenceInHours, parseISO } from 'date-fns';
import {
  BellRing,
  CalendarClock,
  Check,
  Hourglass,
  LogIn,
  LogOut,
  Plus,
  TrendingUp,
  X,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';

import { routes } from '@/app/routes';
import { useAuth } from '@/features/auth';
import { useCurrentProperty } from '@/features/current-property';
import {
  CancelReservationDialog,
  ManualReservationDialog,
  ReservationDrawer,
  useConfirmReservation,
} from '@/features/reservations';
import { cn } from '@/shared/lib/cn';
import { formatLongDate, formatStayRange, pluralize } from '@/shared/lib/dates';
import { formatMoney } from '@/shared/lib/money';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { PageHeader } from '@/shared/ui/page-header';
import { EmptyState, ErrorState, PageSkeleton } from '@/shared/ui/states';
import { StatusBadge } from '@/shared/ui/status-badge';

import { OccupancyChart } from '../components/occupancy-chart';

/** O2: pulpit obiektu (`GET /properties/:id/dashboard`, „dziś” liczy API). */
export function DashboardPage() {
  const property = useCurrentProperty();
  const { user } = useAuth();
  const dashboard = usePropertiesDashboard(property.id);
  const [createOpen, setCreateOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="grid gap-8">
      <PageHeader
        title={`Dzień dobry, ${user?.firstName ?? ''}!`}
        description={
          <>
            Podsumowanie obiektu {property.name} •{' '}
            <span className="font-medium text-primary capitalize-first">
              {formatLongDate(new Date())}
            </span>
          </>
        }
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus aria-hidden="true" />
            Nowa rezerwacja
          </Button>
        }
      />

      {dashboard.isPending ? (
        <PageSkeleton />
      ) : dashboard.isError ? (
        <ErrorState
          error={dashboard.error}
          onRetry={() => void dashboard.refetch()}
          retrying={dashboard.isFetching}
        />
      ) : (
        <>
          <section
            aria-label="Najważniejsze liczby"
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
          >
            <Kpi
              icon={<LogIn />}
              label="Przyjazdy dziś"
              value={dashboard.data.arrivalsToday}
              unit={pluralize(dashboard.data.arrivalsToday, 'przyjazd', 'przyjazdy', 'przyjazdów')}
            />
            <Kpi
              icon={<LogOut />}
              label="Wyjazdy dziś"
              value={dashboard.data.departuresToday}
              unit={pluralize(dashboard.data.departuresToday, 'wyjazd', 'wyjazdy', 'wyjazdów')}
            />
            <Kpi
              icon={<BellRing />}
              label="Oczekujące rezerwacje"
              value={dashboard.data.pendingCount}
              unit={dashboard.data.pendingCount > 0 ? 'wymaga decyzji' : 'brak'}
              highlight={dashboard.data.pendingCount > 0}
              link={{
                to: `${routes.panel.reservations()}?status=PENDING`,
                label: 'Zobacz oczekujące',
              }}
            />
            <Kpi
              icon={<TrendingUp />}
              label="Obłożenie w tym miesiącu"
              value={`${dashboard.data.occupancyThisMonth}%`}
              progress={dashboard.data.occupancyThisMonth}
            />
          </section>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <div className="grid content-start gap-6">
              <PendingDecisions
                reservations={dashboard.data.pendingReservations}
                total={dashboard.data.pendingCount}
                onOpen={setOpenId}
              />
              <Card>
                <CardHeader>
                  <CardTitle>Obłożenie w najbliższych 30 dniach</CardTitle>
                  <CardDescription>
                    Zajęte pokoje dzień po dniu (rezerwacje potwierdzone).
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <OccupancyChart days={dashboard.data.occupancyNext30Days} />
                </CardContent>
              </Card>
            </div>
            <UpcomingArrivals reservations={dashboard.data.upcomingArrivals} onOpen={setOpenId} />
          </div>
        </>
      )}

      <ReservationDrawer reservationId={openId} onClose={() => setOpenId(null)} />
      <ManualReservationDialog
        propertyId={property.id}
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(reservation) => setOpenId(reservation.id)}
      />
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  unit,
  highlight,
  progress,
  link,
}: {
  icon: ReactNode;
  label: string;
  value: number | string;
  unit?: string;
  highlight?: boolean;
  progress?: number;
  link?: { to: string; label: string };
}) {
  return (
    <Card className={cn('grid gap-3 p-5', highlight && 'border-highlight/60 bg-warning-soft/40')}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-base text-muted-foreground">{label}</p>
        <span
          className={cn(
            'flex size-10 items-center justify-center rounded-md [&_svg]:size-5',
            highlight ? 'bg-highlight-strong text-highlight-foreground' : 'bg-accent text-primary',
          )}
          aria-hidden="true"
        >
          {icon}
        </span>
      </div>
      <p className="flex items-baseline gap-2">
        <span className="text-headline tabular">{value}</span>
        {unit && <span className="text-sm font-medium text-muted-foreground">{unit}</span>}
      </p>
      {progress !== undefined && (
        <div
          className="h-2 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label={label}
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
        </div>
      )}
      {link && (
        <Link
          to={link.to}
          className="text-sm font-semibold text-primary underline underline-offset-4"
        >
          {link.label}
        </Link>
      )}
    </Card>
  );
}

function expiresInLabel(expiresAt: string | null): string | null {
  if (!expiresAt) return null;
  const hours = differenceInHours(parseISO(expiresAt), new Date());
  if (hours < 1) return 'Wygasa za mniej niż godzinę';
  return `Wygasa za ${hours} h`;
}

/** „Wymagają Twojej decyzji”: najstarsze prośby `PENDING` z akcjami Potwierdź / Odrzuć. */
function PendingDecisions({
  reservations,
  total,
  onOpen,
}: {
  reservations: readonly ReservationListItemDto[];
  total: number;
  onOpen: (id: string) => void;
}) {
  const confirm = useConfirmReservation();
  const [rejecting, setRejecting] = useState<ReservationListItemDto | null>(null);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="grid gap-1">
          <CardTitle>Wymagają Twojej decyzji</CardTitle>
          <CardDescription>Prośby o rezerwację ze strony obiektu.</CardDescription>
        </div>
        {total > 0 && (
          <span className="rounded-full bg-status-pending px-3 py-1 text-xs font-semibold text-status-pending-foreground">
            {total} {pluralize(total, 'oczekująca', 'oczekujące', 'oczekujących')}
          </span>
        )}
      </CardHeader>
      <CardContent>
        {reservations.length === 0 ? (
          <EmptyState
            className="border-dashed py-8"
            icon={<Check aria-hidden="true" />}
            title="Wszystko załatwione"
            description="Nie ma próśb czekających na Twoją decyzję."
          />
        ) : (
          <ul className="grid divide-y">
            {reservations.map((reservation) => {
              const expires = expiresInLabel(reservation.expiresAt);
              const busy = confirm.isPending && confirm.variables?.id === reservation.id;
              return (
                <li key={reservation.id} className="grid gap-3 py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="grid gap-1">
                      <button
                        type="button"
                        onClick={() => onOpen(reservation.id)}
                        className="text-left text-title-sm hover:text-primary hover:underline"
                      >
                        {reservation.guest.firstName} {reservation.guest.lastName}
                      </button>
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <StatusBadge status="PENDING" />
                        {expires && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-destructive-soft px-2.5 py-0.5 text-xs font-semibold text-destructive">
                            <Hourglass className="size-3.5" aria-hidden="true" />
                            {expires}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-title tabular">
                      {formatMoney(reservation.totalPrice, reservation.currency)}
                    </p>
                  </div>
                  <p className="rounded-md bg-background px-3 py-2 text-sm">
                    <span className="font-medium">{reservation.room.name}</span> •{' '}
                    {formatStayRange(reservation.checkIn, reservation.checkOut)} •{' '}
                    {reservation.guestsCount} os.
                  </p>
                  <div className="flex gap-3">
                    <Button
                      className="flex-1"
                      loading={busy}
                      disabled={confirm.isPending && !busy}
                      onClick={() => confirm.mutate({ id: reservation.id })}
                    >
                      {!busy && <Check aria-hidden="true" />}
                      Potwierdź
                    </Button>
                    <Button variant="outline" onClick={() => setRejecting(reservation)}>
                      <X aria-hidden="true" />
                      Odrzuć
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
      <CancelReservationDialog
        reservation={rejecting}
        onOpenChange={(open) => !open && setRejecting(null)}
      />
    </Card>
  );
}

/** „Najbliższe przyjazdy”: potwierdzone rezerwacje z przyjazdem w ciągu 7 dni. */
function UpcomingArrivals({
  reservations,
  onOpen,
}: {
  reservations: readonly ReservationListItemDto[];
  onOpen: (id: string) => void;
}) {
  return (
    <Card className="content-start">
      <CardHeader>
        <CardTitle>Najbliższe przyjazdy</CardTitle>
        <CardDescription>Potwierdzone rezerwacje na kolejne 7 dni.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {reservations.length === 0 ? (
          <p className="text-base text-muted-foreground">Brak przyjazdów w najbliższym tygodniu.</p>
        ) : (
          <ol className="grid gap-4 border-l-2 border-border pl-5">
            {reservations.map((reservation) => (
              <li key={reservation.id} className="relative grid gap-0.5">
                <span
                  className="absolute top-1.5 -left-[1.6rem] size-3 rounded-full border-2 border-card bg-primary"
                  aria-hidden="true"
                />
                <span className="text-sm font-semibold text-primary capitalize-first">
                  {formatLongDate(reservation.checkIn)}
                </span>
                <button
                  type="button"
                  onClick={() => onOpen(reservation.id)}
                  className="text-left text-base font-semibold hover:text-primary hover:underline"
                >
                  {reservation.guest.firstName} {reservation.guest.lastName}
                </button>
                <span className="text-sm text-muted-foreground">
                  {reservation.room.name} • {reservation.guestsCount} os. • {reservation.nights}{' '}
                  {pluralize(reservation.nights, 'noc', 'noce', 'nocy')}
                </span>
              </li>
            ))}
          </ol>
        )}
        <Button asChild variant="outline">
          <Link to={routes.panel.calendar()}>
            <CalendarClock aria-hidden="true" />
            Zobacz kalendarz
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
