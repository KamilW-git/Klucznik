import { zodResolver } from '@hookform/resolvers/zod';
import {
  useRatesList,
  useRatesRemove,
  useRoomsUpdate,
  type RoomDto,
  type SeasonalRateDto,
} from '@klucznik/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { getErrorMessage } from '@/shared/lib/api-errors';
import { formatDate, formatNights } from '@/shared/lib/dates';
import { invalidateRates, invalidateRooms } from '@/shared/lib/invalidate';
import { formatMoney } from '@/shared/lib/money';
import { minorPriceSchema } from '@/shared/lib/money-schema';
import { notifyError, notifySuccess } from '@/shared/lib/notify';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { FormField } from '@/shared/ui/form-field';
import { MoneyInput } from '@/shared/ui/money-input';
import { SaveBar } from '@/shared/ui/save-bar';
import { Skeleton } from '@/shared/ui/skeleton';
import { ErrorState } from '@/shared/ui/states';
import { Stepper } from '@/shared/ui/stepper';

import { seasonColor } from '../season-colors';
import { RateDialog } from './rate-dialog';
import { SeasonTimeline } from './season-timeline';

const baseSchema = z.object({
  basePricePerNight: minorPriceSchema,
  minNights: z.int().min(1).max(30),
});
type BaseValues = z.input<typeof baseSchema>;
type BaseOutput = z.output<typeof baseSchema>;

/** O7 „Cennik”: cena bazowa i minimalny pobyt (`PATCH /rooms/:id`) oraz stawki sezonowe (BR-09). */
export function PricingTab({ room }: { room: RoomDto }) {
  return (
    <div className="grid gap-6">
      <BasePriceCard room={room} />
      <SeasonalRatesCard room={room} />
    </div>
  );
}

function BasePriceCard({ room }: { room: RoomDto }) {
  const queryClient = useQueryClient();
  const values = { basePricePerNight: room.basePricePerNight, minNights: room.minNights };
  const form = useForm<BaseValues, unknown, BaseOutput>({
    resolver: zodResolver(baseSchema),
    values,
    resetOptions: { keepDirtyValues: true },
  });
  const update = useRoomsUpdate();
  const { errors, isDirty } = form.formState;

  const onSubmit = form.handleSubmit((data) =>
    update.mutate(
      { id: room.id, data },
      {
        onSuccess: (updated) => {
          form.reset({
            basePricePerNight: updated.basePricePerNight,
            minNights: updated.minNights,
          });
          notifySuccess('Zapisano cenę bazową', 'Nowa cena dotyczy tylko nowych rezerwacji.');
          void invalidateRooms(queryClient);
        },
      },
    ),
  );

  return (
    <form
      id="base-price-form"
      noValidate
      onSubmit={(event) => void onSubmit(event)}
      className="grid gap-4"
    >
      <Card>
        <CardHeader>
          <CardTitle>Cena podstawowa i minimalny pobyt</CardTitle>
          <CardDescription>Obowiązują przez cały rok poza stawkami sezonowymi.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <FormField label="Cena bazowa za noc" required error={errors.basePricePerNight?.message}>
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
          {update.isError && (
            <Alert className="sm:col-span-2" title={getErrorMessage(update.error)} />
          )}
        </CardContent>
      </Card>
      <SaveBar
        formId="base-price-form"
        dirty={isDirty}
        saving={update.isPending}
        onDiscard={() => form.reset(values)}
      />
    </form>
  );
}

function SeasonalRatesCard({ room }: { room: RoomDto }) {
  const queryClient = useQueryClient();
  const rates = useRatesList(room.id);
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [editing, setEditing] = useState<SeasonalRateDto | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState<SeasonalRateDto | null>(null);
  const remove = useRatesRemove({
    mutation: {
      onSuccess: () => {
        notifySuccess('Usunięto stawkę sezonową');
        setDeleting(null);
        void invalidateRates(queryClient);
      },
      onError: (error) => notifyError(error, 'Nie udało się usunąć stawki'),
    },
  });

  const list = rates.data?.data ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="grid gap-1">
          <CardTitle>Stawki sezonowe</CardTitle>
          <CardDescription>
            Nadpisują cenę bazową w wybranych nocach. Stawki tego pokoju nie mogą się nakładać.
          </CardDescription>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus aria-hidden="true" />
          Dodaj stawkę sezonową
        </Button>
      </CardHeader>
      <CardContent className="grid gap-5">
        {rates.isPending ? (
          <Skeleton className="h-32 w-full" />
        ) : rates.isError ? (
          <ErrorState error={rates.error} onRetry={() => void rates.refetch()} />
        ) : (
          <>
            <SeasonTimeline rates={list} year={year} onYearChange={setYear} />
            {list.length === 0 ? (
              <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                Brak stawek sezonowych – przez cały rok obowiązuje cena bazowa{' '}
                {formatMoney(room.basePricePerNight, room.currency)} / noc.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-left text-sm">
                  <caption className="sr-only">Stawki sezonowe</caption>
                  <thead className="bg-background/60 text-overline text-muted-foreground uppercase">
                    <tr>
                      <th scope="col" className="px-4 py-3">
                        Nazwa
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Od
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Do (ostatnia noc)
                      </th>
                      <th scope="col" className="px-4 py-3 text-right">
                        Cena za noc
                      </th>
                      <th scope="col" className="px-4 py-3 text-right">
                        Min. nocy
                      </th>
                      <th scope="col" className="px-4 py-3 text-right">
                        <span className="sr-only">Akcje</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {list.map((rate, index) => (
                      <tr key={rate.id}>
                        <td className="px-4 py-3 font-medium">
                          <span className="flex items-center gap-2">
                            <span
                              className={`size-3 rounded-full ${seasonColor(index)}`}
                              aria-hidden="true"
                            />
                            {rate.name}
                          </span>
                        </td>
                        <td className="px-4 py-3 tabular">{formatDate(rate.dateFrom)}</td>
                        <td className="px-4 py-3 tabular">{formatDate(rate.dateTo)}</td>
                        <td className="px-4 py-3 text-right font-semibold tabular">
                          {formatMoney(rate.pricePerNight, rate.currency)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {rate.minNights ?? (
                            <span className="text-muted-foreground">jak pokój</span>
                          )}
                        </td>
                        <td className="px-2 py-1 text-right whitespace-nowrap">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Edytuj stawkę ${rate.name}`}
                            onClick={() => {
                              setEditing(rate);
                              setDialogOpen(true);
                            }}
                          >
                            <Pencil aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            aria-label={`Usuń stawkę ${rate.name}`}
                            onClick={() => setDeleting(rate)}
                          >
                            <Trash2 aria-hidden="true" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </CardContent>
      <RateDialog
        roomId={room.id}
        rate={editing}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        roomMinNights={room.minNights}
      />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Usunąć stawkę „${deleting?.name ?? ''}”?`}
        description="Istniejące rezerwacje zachowują swoje ceny."
        confirmLabel="Usuń stawkę"
        loading={remove.isPending}
        onConfirm={() => deleting && remove.mutate({ id: deleting.id })}
      />
    </Card>
  );
}
