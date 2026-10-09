import { zodResolver } from '@hookform/resolvers/zod';
import {
  isApiError,
  useRatesCreate,
  useRatesUpdate,
  type SeasonalRateDto,
} from '@klucznik/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

import { getErrorMessage } from '@/shared/lib/api-errors';
import { formatNights } from '@/shared/lib/dates';
import { applyFieldErrors } from '@/shared/lib/form-errors';
import { invalidateRates } from '@/shared/lib/invalidate';
import { minorPriceSchema } from '@/shared/lib/money-schema';
import { notifySuccess } from '@/shared/lib/notify';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import { DateRangePicker } from '@/shared/ui/date-range-picker';
import { Dialog, DialogContent } from '@/shared/ui/dialog';
import { FormField } from '@/shared/ui/form-field';
import { Input } from '@/shared/ui/input';
import { MoneyInput } from '@/shared/ui/money-input';
import { Stepper } from '@/shared/ui/stepper';

const rateSchema = z.object({
  name: z.string().trim().min(1, 'Podaj nazwę stawki.').max(80, 'Najwyżej 80 znaków.'),
  nights: z
    .object({ from: z.string(), to: z.string() })
    .nullable()
    .refine((value) => value !== null, 'Wybierz zakres nocy.'),
  pricePerNight: minorPriceSchema,
  ownMinNights: z.boolean(),
  minNights: z.int().min(1).max(30),
});

type RateFormValues = z.input<typeof rateSchema>;
type RateFormOutput = z.output<typeof rateSchema>;

interface RateDialogProps {
  roomId: string;
  /** Edycja istniejącej stawki albo `null` dla nowej. */
  rate: SeasonalRateDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Minimalny pobyt pokoju (podpowiedź, gdy stawka go nie zmienia). */
  roomMinNights: number;
}

/** Dodanie / edycja stawki sezonowej (pricing.md). Daty „Od–Do” to noce włącznie. */
export function RateDialog(props: RateDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      {props.open && <RateForm {...props} />}
    </Dialog>
  );
}

function RateForm({ roomId, rate, onOpenChange, roomMinNights }: RateDialogProps) {
  const queryClient = useQueryClient();
  const form = useForm<RateFormValues, unknown, RateFormOutput>({
    resolver: zodResolver(rateSchema),
    defaultValues: {
      name: rate?.name ?? '',
      nights: rate ? { from: rate.dateFrom, to: rate.dateTo } : null,
      pricePerNight: rate?.pricePerNight ?? null,
      ownMinNights: rate?.minNights !== null && rate?.minNights !== undefined,
      minNights: rate?.minNights ?? roomMinNights,
    },
  });
  const { errors } = form.formState;
  const ownMinNights = useWatch({ control: form.control, name: 'ownMinNights' });
  const create = useRatesCreate();
  const update = useRatesUpdate();
  const mutation = rate ? update : create;

  const onSuccess = () => {
    void invalidateRates(queryClient);
    notifySuccess(rate ? 'Zapisano stawkę sezonową' : 'Dodano stawkę sezonową');
    onOpenChange(false);
  };
  const onError = (error: unknown) => applyFieldErrors(error, form.setError, ['name']);

  const onSubmit = form.handleSubmit((values) => {
    const data = {
      name: values.name,
      dateFrom: values.nights.from,
      dateTo: values.nights.to,
      pricePerNight: values.pricePerNight,
      minNights: values.ownMinNights ? values.minNights : null,
    };
    if (rate) update.mutate({ id: rate.id, data }, { onSuccess, onError });
    else create.mutate({ roomId, data }, { onSuccess, onError });
  });

  return (
    <DialogContent
      title={rate ? `Edycja stawki „${rate.name}”` : 'Nowa stawka sezonowa'}
      description="Stawka zastępuje cenę bazową w wybranych nocach. Nie zmienia cen istniejących rezerwacji."
      footer={
        <>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Anuluj
          </Button>
          <Button type="submit" form="rate-form" loading={mutation.isPending}>
            {rate ? 'Zapisz stawkę' : 'Dodaj stawkę'}
          </Button>
        </>
      }
    >
      <form
        id="rate-form"
        noValidate
        onSubmit={(event) => void onSubmit(event)}
        className="grid gap-5"
      >
        <FormField label="Nazwa" required error={errors.name?.message}>
          <Input placeholder="np. Wysoki sezon (lato)" {...form.register('name')} />
        </FormField>
        <FormField
          label="Noce objęte stawką"
          required
          hint="Od pierwszej do ostatniej nocy objętej stawką (włącznie)."
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
        <FormField label="Cena za noc" required error={errors.pricePerNight?.message}>
          <Controller
            control={form.control}
            name="pricePerNight"
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
        <div className="grid gap-3">
          <Controller
            control={form.control}
            name="ownMinNights"
            render={({ field }) => (
              <Checkbox
                label="Własny minimalny pobyt w tym sezonie"
                description={`Bez zaznaczenia obowiązuje minimum pokoju: ${formatNights(roomMinNights)}.`}
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked === true)}
              />
            )}
          />
          {ownMinNights && (
            <FormField label="Minimalna liczba nocy (przyjazd w sezonie)">
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
          )}
        </div>
        {mutation.isError &&
          !(isApiError(mutation.error) && mutation.error.code === 'VALIDATION_ERROR') && (
            <Alert title={getErrorMessage(mutation.error)} />
          )}
      </form>
    </DialogContent>
  );
}
