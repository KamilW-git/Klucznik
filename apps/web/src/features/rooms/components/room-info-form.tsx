import { zodResolver } from '@hookform/resolvers/zod';
import { isApiError, useRoomsUpdate, type RoomDto } from '@klucznik/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm, type UseFormReturn } from 'react-hook-form';

import { getErrorMessage } from '@/shared/lib/api-errors';
import { applyFieldErrors } from '@/shared/lib/form-errors';
import { invalidateRooms } from '@/shared/lib/invalidate';
import { notifySuccess } from '@/shared/lib/notify';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { FormField } from '@/shared/ui/form-field';
import { Input } from '@/shared/ui/input';
import { SaveBar } from '@/shared/ui/save-bar';
import { Stepper } from '@/shared/ui/stepper';
import { Switch } from '@/shared/ui/switch';
import { Textarea } from '@/shared/ui/textarea';

import { futureReservationsCount } from '../hooks/use-room-mutations';
import { roomInfoSchema, type RoomInfoFormValues } from '../schemas';
import { DeleteRoomDialog } from './delete-room-dialog';

function toValues(room: RoomDto): RoomInfoFormValues {
  return {
    name: room.name,
    description: room.description ?? '',
    capacity: room.capacity,
    isActive: room.isActive,
  };
}

/** O7 „Informacje”: nazwa, opis, pojemność, widoczność; usunięcie pokoju. */
export function RoomInfoForm({ room, onDeleted }: { room: RoomDto; onDeleted: () => void }) {
  const queryClient = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const form = useForm<RoomInfoFormValues>({
    resolver: zodResolver(roomInfoSchema),
    values: toValues(room),
    resetOptions: { keepDirtyValues: true },
  });
  const { errors, isDirty } = form.formState;
  const update = useRoomsUpdate();
  const futureCount = futureReservationsCount(update.error);

  const onSubmit = form.handleSubmit((values) =>
    update.mutate(
      {
        id: room.id,
        data: {
          name: values.name,
          description: values.description.trim() || null,
          capacity: values.capacity,
          isActive: values.isActive,
        },
      },
      {
        onSuccess: (updated) => {
          form.reset(toValues(updated));
          notifySuccess('Zapisano zmiany pokoju');
          void invalidateRooms(queryClient);
        },
        onError: (error) =>
          applyFieldErrors(error, form.setError, ['name', 'description', 'capacity']),
      },
    ),
  );

  return (
    <div className="grid gap-6">
      <form id="room-info-form" noValidate onSubmit={(event) => void onSubmit(event)}>
        <Card>
          <CardHeader>
            <CardTitle>Informacje o pokoju</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5">
            <RoomInfoFields form={form} errors={errors} />
          </CardContent>
        </Card>
      </form>
      {futureCount !== null ? (
        <Alert title={`Nie można ukryć pokoju – istnieją przyszłe rezerwacje (${futureCount})`}>
          Anuluj lub przenieś je, zanim ukryjesz pokój.
        </Alert>
      ) : (
        update.isError &&
        !(isApiError(update.error) && update.error.code === 'VALIDATION_ERROR') && (
          <Alert title={getErrorMessage(update.error)} />
        )
      )}
      <Card className="border-destructive/30">
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-title-sm">Usuń pokój</h2>
            <p className="text-sm text-muted-foreground">
              Możliwe tylko bez przyszłych rezerwacji. Historia pobytów zostaje zachowana.
            </p>
          </div>
          <Button variant="destructive-outline" onClick={() => setDeleteOpen(true)}>
            <Trash2 aria-hidden="true" />
            Usuń pokój
          </Button>
        </CardContent>
      </Card>
      <SaveBar
        formId="room-info-form"
        dirty={isDirty}
        saving={update.isPending}
        onDiscard={() => form.reset(toValues(room))}
      />
      <DeleteRoomDialog
        room={deleteOpen ? room : null}
        onOpenChange={setDeleteOpen}
        onDeleted={onDeleted}
      />
    </div>
  );
}

/** Pola wspólne dla nowego pokoju i edycji. */
export function RoomInfoFields({
  form,
  errors,
}: {
  /** Formularz edycji albo nowego pokoju (rozszerza pola informacji). */
  form: UseFormReturn<RoomInfoFormValues>;
  errors: Partial<Record<'name' | 'description' | 'capacity', { message?: string }>>;
}) {
  return (
    <>
      <FormField label="Nazwa" required error={errors.name?.message}>
        <Input placeholder="np. Domek Sosna" {...form.register('name')} />
      </FormField>
      <FormField
        label="Opis dla gości"
        hint="Wyświetlany na stronie obiektu przy pokoju."
        error={errors.description?.message}
      >
        <Textarea rows={5} {...form.register('description')} />
      </FormField>
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="Maksymalna liczba gości" required error={errors.capacity?.message}>
          <Controller
            control={form.control}
            name="capacity"
            render={({ field }) => (
              <Stepper
                value={field.value}
                onChange={field.onChange}
                min={1}
                max={30}
                format={() => 'os.'}
              />
            )}
          />
        </FormField>
        <Controller
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <div className="flex items-center justify-between gap-4 rounded-md border p-4">
              <label htmlFor="room-is-active" className="grid gap-0.5">
                <span className="font-medium">Widoczny na stronie</span>
                <span className="text-sm text-muted-foreground">
                  Goście mogą rezerwować online.
                </span>
              </label>
              <Switch id="room-is-active" checked={field.value} onCheckedChange={field.onChange} />
            </div>
          )}
        />
      </div>
    </>
  );
}
