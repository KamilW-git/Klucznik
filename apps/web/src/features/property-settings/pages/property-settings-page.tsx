import { zodResolver } from '@hookform/resolvers/zod';
import {
  isApiError,
  usePropertiesGet,
  usePropertiesUpdate,
  type PropertyDto,
} from '@klucznik/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { Clock, Copy, ExternalLink, MapPin, Phone } from 'lucide-react';
import type { ReactNode } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';

import { useCurrentProperty } from '@/features/current-property';
import { PhotosManager } from '@/features/photos';
import { getErrorMessage } from '@/shared/lib/api-errors';
import { pluralize } from '@/shared/lib/dates';
import { applyFieldErrors } from '@/shared/lib/form-errors';
import { invalidateProperty } from '@/shared/lib/invalidate';
import { notifyError, notifySuccess } from '@/shared/lib/notify';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { FormField } from '@/shared/ui/form-field';
import { Input, InputGroup } from '@/shared/ui/input';
import { PageHeader } from '@/shared/ui/page-header';
import { SaveBar } from '@/shared/ui/save-bar';
import { ErrorState, PageSkeleton } from '@/shared/ui/states';
import { Stepper } from '@/shared/ui/stepper';
import { Switch } from '@/shared/ui/switch';
import { Textarea } from '@/shared/ui/textarea';

import { propertySettingsSchema, type PropertySettingsValues } from '../schemas';

function toValues(property: PropertyDto): PropertySettingsValues {
  return {
    name: property.name,
    slug: property.slug,
    description: property.description ?? '',
    street: property.street ?? '',
    postalCode: property.postalCode ?? '',
    city: property.city ?? '',
    phone: property.phone ?? '',
    contactEmail: property.contactEmail ?? '',
    checkInTime: property.checkInTime,
    checkOutTime: property.checkOutTime,
    cancellationDeadlineDays: property.cancellationDeadlineDays,
    pendingExpiryHours: property.pendingExpiryHours,
    isActive: property.isActive,
  };
}

/** Pola opcjonalne: pusty tekst → `null` (usunięcie wartości). */
const NULLABLE = new Set<keyof PropertySettingsValues>(['description', 'phone', 'contactEmail']);

/** O8: ustawienia obiektu (dane, zasady pobytu, rezerwacje, zdjęcia). */
export function PropertySettingsPage() {
  const { id } = useCurrentProperty();
  const property = usePropertiesGet(id);

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Ustawienia obiektu"
        description="Dane wizytówki, godziny pobytu, zasady rezerwacji i zdjęcia strony obiektu."
        actions={
          property.data && (
            <Button asChild variant="outline">
              <a href={property.data.publicUrl} target="_blank" rel="noreferrer">
                <ExternalLink aria-hidden="true" />
                Podgląd strony obiektu
              </a>
            </Button>
          )
        }
      />
      {property.isPending ? (
        <PageSkeleton />
      ) : property.isError ? (
        <ErrorState
          error={property.error}
          onRetry={() => void property.refetch()}
          retrying={property.isFetching}
        />
      ) : (
        <SettingsForm key={property.data.id} property={property.data} />
      )}
    </div>
  );
}

function SettingsForm({ property }: { property: PropertyDto }) {
  const queryClient = useQueryClient();
  const form = useForm<PropertySettingsValues>({
    resolver: zodResolver(propertySettingsSchema),
    values: toValues(property),
    resetOptions: { keepDirtyValues: true },
  });
  const { errors, isDirty, dirtyFields } = form.formState;
  const update = usePropertiesUpdate();
  const futureCount =
    isApiError(update.error) && update.error.code === 'HAS_FUTURE_RESERVATIONS'
      ? Number(update.error.details?.['count'] ?? 0)
      : null;

  const onSubmit = form.handleSubmit((values) => {
    const data: Record<string, unknown> = {};
    for (const key of Object.keys(dirtyFields) as (keyof PropertySettingsValues)[]) {
      const value = values[key];
      data[key] = NULLABLE.has(key) && typeof value === 'string' ? value.trim() || null : value;
    }
    update.mutate(
      { id: property.id, data },
      {
        onSuccess: (updated) => {
          form.reset(toValues(updated));
          notifySuccess('Zapisano ustawienia obiektu');
          void invalidateProperty(queryClient);
        },
        onError: (error) => {
          if (isApiError(error) && error.code === 'SLUG_TAKEN') {
            form.setError('slug', { type: 'server', message: getErrorMessage(error) });
            form.setFocus('slug');
          } else {
            applyFieldErrors(
              error,
              form.setError,
              Object.keys(values) as (keyof PropertySettingsValues)[],
            );
          }
        },
      },
    );
  });

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(property.publicUrl);
      notifySuccess('Skopiowano adres strony obiektu');
    } catch (error) {
      notifyError(error, 'Nie udało się skopiować adresu');
    }
  };

  // `publicUrl` = `${APP_PUBLIC_URL}/o/<slug>`: podgląd nowego adresu przy edycji sluga.
  const origin = property.publicUrl.slice(0, property.publicUrl.length - property.slug.length);
  const slug = useWatch({ control: form.control, name: 'slug' });

  return (
    <div className="grid gap-6">
      <form
        id="property-settings-form"
        noValidate
        onSubmit={(event) => void onSubmit(event)}
        className="grid gap-6"
      >
        <Section
          title="Dane obiektu"
          description="Wyświetlane gościom na stronie obiektu i w e-mailach."
        >
          <div className="grid gap-5 lg:grid-cols-2">
            <FormField label="Nazwa obiektu" required error={errors.name?.message}>
              <Input {...form.register('name')} />
            </FormField>
            <FormField
              label="Adres strony obiektu"
              required
              hint={
                <>
                  <span className="break-all">
                    {origin}
                    <strong className="font-semibold text-foreground">{slug}</strong>
                  </span>
                  <br />
                  Zmiana adresu unieważnia stare linki do strony.
                </>
              }
              error={errors.slug?.message}
            >
              <div className="flex gap-2">
                <Input
                  className="flex-1"
                  autoCapitalize="off"
                  spellCheck={false}
                  {...form.register('slug')}
                />
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Kopiuj adres strony"
                  onClick={() => void copyLink()}
                >
                  <Copy aria-hidden="true" />
                </Button>
              </div>
            </FormField>
          </div>
          <FormField label="Opis dla gości" error={errors.description?.message}>
            <Textarea rows={4} {...form.register('description')} />
          </FormField>
          <fieldset className="grid gap-5">
            <legend className="mb-3 flex items-center gap-2 text-base font-semibold">
              <MapPin className="size-5 text-primary" aria-hidden="true" />
              Adres
            </legend>
            <div className="grid gap-5 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,2fr)]">
              <FormField label="Ulica i numer" required error={errors.street?.message}>
                <Input autoComplete="street-address" {...form.register('street')} />
              </FormField>
              <FormField label="Kod pocztowy" required error={errors.postalCode?.message}>
                <Input
                  inputMode="numeric"
                  placeholder="00-000"
                  autoComplete="postal-code"
                  {...form.register('postalCode')}
                />
              </FormField>
              <FormField label="Miejscowość" required error={errors.city?.message}>
                <Input autoComplete="address-level2" {...form.register('city')} />
              </FormField>
            </div>
          </fieldset>
          <fieldset className="grid gap-5">
            <legend className="mb-3 flex items-center gap-2 text-base font-semibold">
              <Phone className="size-5 text-primary" aria-hidden="true" />
              Kontakt dla gości
            </legend>
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField label="Telefon" error={errors.phone?.message}>
                <Input type="tel" {...form.register('phone')} />
              </FormField>
              <FormField
                label="E-mail kontaktowy"
                hint="Odpowiedzi gości na e-maile z rezerwacją trafią na ten adres."
                error={errors.contactEmail?.message}
              >
                <Input type="email" {...form.register('contactEmail')} />
              </FormField>
            </div>
          </fieldset>
        </Section>

        <Section
          title="Zasady pobytu"
          description="Godziny zameldowania i wymeldowania podawane gościom."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label="Zameldowanie od" required error={errors.checkInTime?.message}>
              <InputGroup startIcon={<Clock />}>
                <Input type="time" {...form.register('checkInTime')} />
              </InputGroup>
            </FormField>
            <FormField label="Wymeldowanie do" required error={errors.checkOutTime?.message}>
              <InputGroup startIcon={<Clock />}>
                <Input type="time" {...form.register('checkOutTime')} />
              </InputGroup>
            </FormField>
          </div>
        </Section>

        <Section
          title="Rezerwacje"
          description="Zasady anulowania i potwierdzania próśb ze strony obiektu."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              label="Bezpłatne anulowanie przez gościa"
              hint="Ile dni przed przyjazdem gość może jeszcze sam anulować (BR-08)."
            >
              <Controller
                control={form.control}
                name="cancellationDeadlineDays"
                render={({ field }) => (
                  <Stepper
                    value={field.value}
                    onChange={field.onChange}
                    min={0}
                    max={60}
                    format={(value) => `${pluralize(value, 'dzień', 'dni', 'dni')} przed`}
                  />
                )}
              />
            </FormField>
            <FormField
              label="Czas na potwierdzenie prośby"
              hint="Niepotwierdzona prośba wygasa, a termin się zwalnia (BR-07)."
            >
              <Controller
                control={form.control}
                name="pendingExpiryHours"
                render={({ field }) => (
                  <Stepper
                    value={field.value}
                    onChange={field.onChange}
                    min={1}
                    max={168}
                    format={(value) => pluralize(value, 'godzina', 'godziny', 'godzin')}
                  />
                )}
              />
            </FormField>
          </div>
          <Controller
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <div className="flex items-center justify-between gap-4 rounded-md border p-4">
                <label htmlFor="property-active" className="grid gap-0.5">
                  <span className="font-medium">Obiekt przyjmuje rezerwacje online</span>
                  <span className="text-sm text-muted-foreground">
                    Wyłączenie ukrywa stronę obiektu; możliwe tylko bez przyszłych rezerwacji.
                  </span>
                </label>
                <Switch
                  id="property-active"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </div>
            )}
          />
          {futureCount !== null && (
            <Alert
              title={`Nie można wyłączyć obiektu – istnieją przyszłe rezerwacje (${futureCount})`}
            >
              Najpierw anuluj{' '}
              {pluralize(futureCount, 'tę rezerwację', 'te rezerwacje', 'te rezerwacje')} albo
              poczekaj do ich zakończenia.
            </Alert>
          )}
        </Section>
        {update.isError &&
          futureCount === null &&
          !(
            isApiError(update.error) &&
            ['SLUG_TAKEN', 'VALIDATION_ERROR'].includes(update.error.code)
          ) && <Alert title={getErrorMessage(update.error)} />}
      </form>

      <Section
        title="Zdjęcia obiektu"
        description="Pierwsze zdjęcie jest główną grafiką strony obiektu."
      >
        <PhotosManager
          target={{ kind: 'property', id: property.id }}
          photos={property.photos}
          fallbackAlt={property.name}
        />
      </Section>

      <SaveBar
        formId="property-settings-form"
        dirty={isDirty}
        saving={update.isPending}
        onDiscard={() => form.reset(toValues(property))}
      />
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">{children}</CardContent>
    </Card>
  );
}
