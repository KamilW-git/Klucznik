import { zodResolver } from '@hookform/resolvers/zod';
import {
  isApiError,
  usePublicAvailability,
  usePublicCreateReservation,
  type PublicPropertyDto,
  type RoomAvailabilityDto,
} from '@klucznik/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Send, ShieldCheck } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router';

import { PublicContainer } from '@/app/layouts/public-layout';
import { routes } from '@/app/routes';
import {
  formatGuests,
  parseStaySearch,
  usePublicProperty,
  type StaySearch,
} from '@/features/public-property';
import { getErrorMessage } from '@/shared/lib/api-errors';
import { formatNights } from '@/shared/lib/dates';
import { applyFieldErrors } from '@/shared/lib/form-errors';
import { invalidatePublicAvailability, PUBLIC_AVAILABILITY_QUERY } from '@/shared/lib/public-query';
import { useDocumentMeta } from '@/shared/lib/use-document-meta';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { buttonVariants } from '@/shared/ui/button-variants';
import { Checkbox } from '@/shared/ui/checkbox';
import { Dialog, DialogTrigger } from '@/shared/ui/dialog';
import { FormField } from '@/shared/ui/form-field';
import { Input } from '@/shared/ui/input';
import { EmptyState, PageSkeleton } from '@/shared/ui/states';
import { Textarea } from '@/shared/ui/textarea';

import { BookingSteps } from '../components/booking-steps';
import { BookingSummary } from '../components/booking-summary';
import { TermsDialogContent } from '../components/terms-dialog';
import {
  BOOKING_FORM_FIELDS,
  bookingFormSchema,
  type BookingFormOutput,
  type BookingFormValues,
} from '../schemas';
import type { BookingSentState } from '../booking-sent-state';

/**
 * P3 „Formularz rezerwacji” (`/o/:slug/rezerwacja?roomId&checkIn&checkOut&guests`): dane gościa,
 * akceptacja warunków, podsumowanie z ceną z API. Wynik: prośba `PENDING` i przejście do P4.
 */
export function BookingPage() {
  const property = usePublicProperty();
  const [params] = useSearchParams();
  const search = parseStaySearch(params);
  const roomId = params.get('roomId') ?? '';

  useDocumentMeta({ title: `Rezerwacja – ${property.name}`, robots: 'noindex' });

  if (!search || !roomId) {
    return (
      <PublicContainer className="py-10">
        <EmptyState
          title="Brakuje danych rezerwacji"
          description="Wybierz termin i pokój na stronie obiektu, a potem przejdź do rezerwacji."
          actions={
            <Link to={routes.public.property(property.slug, 'termin')} className={buttonVariants()}>
              Wybierz termin
            </Link>
          }
        />
      </PublicContainer>
    );
  }

  return <BookingContent property={property} search={search} roomId={roomId} />;
}

function BookingContent({
  property,
  search,
  roomId,
}: {
  property: PublicPropertyDto;
  search: StaySearch;
  roomId: string;
}) {
  const availability = usePublicAvailability(property.slug, search, {
    query: { ...PUBLIC_AVAILABILITY_QUERY, retry: false },
  });
  const resultsUrl = routes.public.availability(property.slug, search);

  let content;
  if (availability.isPending) {
    content = <PageSkeleton rows={2} />;
  } else if (availability.isError) {
    content = (
      <Alert
        title={getErrorMessage(availability.error)}
        action={
          <Link
            to={routes.public.property(property.slug, 'termin')}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            Wybierz inny termin
          </Link>
        }
      />
    );
  } else {
    const item = availability.data.rooms.find((entry) => entry.room.id === roomId);
    content =
      item?.available && item.totalPrice !== null ? (
        <BookingForm
          property={property}
          search={search}
          item={item}
          currency={availability.data.currency}
        />
      ) : (
        <Alert
          variant="warning"
          title={
            item?.unavailableReason === 'OCCUPIED'
              ? 'Ten termin jest już zajęty'
              : 'Tego pokoju nie można zarezerwować w wybranym terminie'
          }
          action={
            <Link to={resultsUrl} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              <ArrowLeft aria-hidden="true" />
              Wróć do wyników
            </Link>
          }
        >
          {unavailableHint(item)}
        </Alert>
      );
  }

  return (
    <PublicContainer className="grid gap-8 py-6 lg:py-10">
      <div className="grid gap-4">
        <Link
          to={resultsUrl}
          className="inline-flex min-h-11 items-center gap-2 justify-self-start text-sm font-semibold text-primary"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Wróć do wyników
        </Link>
        <BookingSteps current={2} />
      </div>
      {content}
    </PublicContainer>
  );
}

function unavailableHint(item: RoomAvailabilityDto | undefined): string {
  if (!item) return 'Pokój nie jest już dostępny na stronie obiektu. Wybierz inny pokój.';
  switch (item.unavailableReason) {
    case 'CAPACITY_EXCEEDED':
      return `Pokój mieści do ${item.room.capacity} os. Wybierz większy pokój albo zmień liczbę gości.`;
    case 'MIN_NIGHTS_NOT_MET':
      return `Minimalny pobyt w tym terminie to ${formatNights(item.minNights)}.`;
    default:
      return 'Ktoś zarezerwował ten pokój przed chwilą. Wybierz inny pokój lub termin.';
  }
}

function BookingForm({
  property,
  search,
  item,
  currency,
}: {
  property: PublicPropertyDto;
  search: StaySearch;
  item: RoomAvailabilityDto;
  currency: string;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const create = usePublicCreateReservation();
  const form = useForm<BookingFormValues, unknown, BookingFormOutput>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      guest: { firstName: '', lastName: '', email: '', phone: '' },
      guestNotes: '',
      acceptTerms: false,
    },
  });
  const { errors } = form.formState;
  const overlap = isApiError(create.error) && create.error.code === 'RESERVATION_OVERLAP';
  const resultsUrl = routes.public.availability(property.slug, search);

  const onSubmit = form.handleSubmit((values) => {
    create.mutate(
      {
        slug: property.slug,
        data: {
          roomId: item.room.id,
          checkIn: search.checkIn,
          checkOut: search.checkOut,
          guestsCount: search.guests,
          guest: values.guest,
          guestNotes: values.guestNotes.trim() || null,
        },
      },
      {
        onSuccess: (reservation) => {
          void invalidatePublicAvailability(queryClient);
          const state: BookingSentState = { reservation };
          // `replace`: „Wstecz” z P4 wraca do wyników, a nie do wysłanego formularza.
          void navigate(routes.public.bookingSent(property.slug), { replace: true, state });
        },
        onError: (error) => {
          applyFieldErrors(error, form.setError, BOOKING_FORM_FIELDS);
          // BR-01: termin zajęty w międzyczasie – wyniki muszą to pokazać.
          if (isApiError(error) && error.code === 'RESERVATION_OVERLAP') {
            void invalidatePublicAvailability(queryClient);
          }
        },
      },
    );
  });

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
      <div className="order-2 grid gap-6 lg:order-1">
        <div className="grid gap-2">
          <h1 className="text-[1.625rem] leading-8 font-bold lg:text-headline">
            Dane osoby rezerwującej
          </h1>
          <p className="text-base text-muted-foreground">
            Na ten adres e-mail wyślemy potwierdzenie i link do zarządzania rezerwacją.
          </p>
        </div>

        <form
          noValidate
          onSubmit={(event) => void onSubmit(event)}
          className="grid gap-5"
          aria-label="Dane osoby rezerwującej"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label="Imię" required error={errors.guest?.firstName?.message}>
              <Input autoComplete="given-name" {...form.register('guest.firstName')} />
            </FormField>
            <FormField label="Nazwisko" required error={errors.guest?.lastName?.message}>
              <Input autoComplete="family-name" {...form.register('guest.lastName')} />
            </FormField>
          </div>
          <FormField label="Adres e-mail" required error={errors.guest?.email?.message}>
            <Input
              type="email"
              autoComplete="email"
              inputMode="email"
              {...form.register('guest.email')}
            />
          </FormField>
          <FormField
            label="Numer telefonu"
            required
            hint="Gospodarz zadzwoni w razie pytań o przyjazd."
            error={errors.guest?.phone?.message}
          >
            <Input type="tel" autoComplete="tel" {...form.register('guest.phone')} />
          </FormField>
          <FormField
            label="Uwagi do rezerwacji (opcjonalnie)"
            hint="Np. godzina przyjazdu, zwierzę, łóżeczko dla dziecka. Maks. 2000 znaków."
            error={errors.guestNotes?.message}
          >
            <Textarea rows={4} {...form.register('guestNotes')} />
          </FormField>

          <div className="grid gap-1 border-t pt-4">
            <Controller
              control={form.control}
              name="acceptTerms"
              render={({ field }) => (
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                  onBlur={field.onBlur}
                  aria-invalid={errors.acceptTerms ? true : undefined}
                  aria-describedby={errors.acceptTerms ? 'accept-terms-error' : undefined}
                  label={
                    <span>
                      Akceptuję warunki rezerwacji
                      <span className="text-destructive" aria-hidden="true">
                        *
                      </span>
                    </span>
                  }
                />
              )}
            />
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="link" className="ml-8 justify-self-start text-sm">
                  Przeczytaj warunki rezerwacji
                </Button>
              </DialogTrigger>
              <TermsDialogContent property={property} />
            </Dialog>
            {errors.acceptTerms?.message && (
              <p id="accept-terms-error" className="ml-8 text-sm text-destructive">
                {errors.acceptTerms.message}
              </p>
            )}
          </div>

          {overlap ? (
            <Alert
              title="Ten termin został właśnie zajęty"
              action={
                <Link
                  to={resultsUrl}
                  className={buttonVariants({ variant: 'outline', size: 'sm' })}
                >
                  <ArrowLeft aria-hidden="true" />
                  Wróć do wyników
                </Link>
              }
            >
              Ktoś zarezerwował ten pokój przed chwilą. Wybierz inny pokój lub termin.
            </Alert>
          ) : (
            create.isError &&
            !(isApiError(create.error) && create.error.code === 'VALIDATION_ERROR') && (
              <Alert title={getErrorMessage(create.error)} />
            )
          )}

          <Button type="submit" size="lg" loading={create.isPending} className="w-full">
            {!create.isPending && <Send aria-hidden="true" />}
            Wyślij prośbę o rezerwację
          </Button>
          <p className="flex items-center justify-center gap-2 text-center text-sm text-muted-foreground">
            <ShieldCheck className="size-4 shrink-0" aria-hidden="true" />
            Płatność ustalasz z gospodarzem po potwierdzeniu. Teraz nic nie płacisz.
          </p>
        </form>
      </div>

      <aside
        className="order-1 lg:sticky lg:top-24 lg:order-2"
        aria-label="Podsumowanie rezerwacji"
      >
        <BookingSummary property={property} item={item} search={search} currency={currency} />
        <p className="mt-3 text-sm text-muted-foreground">
          Rezerwujesz dla: {formatGuests(search.guests)}.{' '}
          <Link to={resultsUrl} className="font-semibold text-primary underline underline-offset-4">
            Zmień termin lub liczbę gości
          </Link>
        </p>
      </aside>
    </div>
  );
}
