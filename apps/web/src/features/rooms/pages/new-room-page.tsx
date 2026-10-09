import { zodResolver } from '@hookform/resolvers/zod';
import { isApiError, useRoomsCreate } from '@klucznik/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react';
import { Controller, useForm, type UseFormReturn } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';

import { routes } from '@/app/routes';
import { useCurrentProperty } from '@/features/current-property';
import { getErrorMessage } from '@/shared/lib/api-errors';
import { formatNights } from '@/shared/lib/dates';
import { applyFieldErrors } from '@/shared/lib/form-errors';
import { invalidateRooms } from '@/shared/lib/invalidate';
import { notifySuccess } from '@/shared/lib/notify';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { FormField } from '@/shared/ui/form-field';
import { MoneyInput } from '@/shared/ui/money-input';
import { PageHeader } from '@/shared/ui/page-header';
import { Stepper } from '@/shared/ui/stepper';

import { RoomInfoFields } from '../components/room-info-form';
import {
  newRoomSchema,
  type NewRoomFormOutput,
  type NewRoomFormValues,
  type RoomInfoFormValues,
} from '../schemas';

/** `/panel/pokoje/nowy`: formularz zakładki „Informacje” z ceną bazową; potem galeria zdjęć. */
export function NewRoomPage() {
  const property = useCurrentProperty();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const form = useForm<NewRoomFormValues, unknown, NewRoomFormOutput>({
    resolver: zodResolver(newRoomSchema),
    defaultValues: {
      name: '',
      description: '',
      capacity: 2,
      isActive: true,
      basePricePerNight: null,
      minNights: 1,
    },
  });
  const { errors } = form.formState;
  const create = useRoomsCreate();

  const onSubmit = form.handleSubmit((values) =>
    create.mutate(
      {
        propertyId: property.id,
        data: { ...values, description: values.description.trim() || null },
      },
      {
        onSuccess: (room) => {
          void invalidateRooms(queryClient);
          notifySuccess(
            `Dodano pokój ${room.name}`,
            'Dodaj zdjęcia, aby pokój dobrze wyglądał na stronie.',
          );
          void navigate(routes.panel.room(room.id, 'zdjecia'), { replace: true });
        },
        onError: (error) =>
          applyFieldErrors(error, form.setError, [
            'name',
            'description',
            'capacity',
            'basePricePerNight',
            'minNights',
          ]),
      },
    ),
  );

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow={
          <Link
            to={routes.panel.rooms()}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
            Pokoje i domki
          </Link>
        }
        title="Nowy pokój"
        description="Podstawowe informacje i cena. Zdjęcia, stawki sezonowe i blokady dodasz po zapisaniu."
      />
      <form noValidate onSubmit={(event) => void onSubmit(event)} className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Informacje o pokoju</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5">
            <RoomInfoFields
              form={form as unknown as UseFormReturn<RoomInfoFormValues>}
              errors={errors}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Cena i minimalny pobyt</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <FormField
              label="Cena bazowa za noc"
              required
              hint="Obowiązuje poza stawkami sezonowymi."
              error={errors.basePricePerNight?.message}
            >
              <Controller
                control={form.control}
                name="basePricePerNight"
                render={({ field }) => (
                  <MoneyInput
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    suffix="zł / noc"
                  />
                )}
              />
            </FormField>
            <FormField label="Minimalna liczba nocy" required>
              <Controller
                control={form.control}
                name="minNights"
                render={({ field }) => (
                  <Stepper
                    value={field.value}
                    onChange={field.onChange}
                    min={1}
                    max={30}
                    format={(value) => formatNights(value).replace(/^\d+ /, '')}
                  />
                )}
              />
            </FormField>
          </CardContent>
        </Card>
        {create.isError &&
          !(isApiError(create.error) && create.error.code === 'VALIDATION_ERROR') && (
            <Alert title={getErrorMessage(create.error)} />
          )}
        <div className="flex justify-end gap-3">
          <Button asChild variant="outline">
            <Link to={routes.panel.rooms()}>Anuluj</Link>
          </Button>
          <Button type="submit" loading={create.isPending}>
            Dodaj pokój
          </Button>
        </div>
      </form>
    </div>
  );
}
