import { zodResolver } from '@hookform/resolvers/zod';
import { isApiError, useAdminOwnersCreate, type OwnerDto } from '@klucznik/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { CircleCheck, Copy, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';

import { routes } from '@/app/routes';
import { getErrorMessage } from '@/shared/lib/api-errors';
import { applyFieldErrors } from '@/shared/lib/form-errors';
import { invalidateAdmin } from '@/shared/lib/invalidate';
import { notifySuccess } from '@/shared/lib/notify';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import { Dialog, DialogContent } from '@/shared/ui/dialog';
import { FormField } from '@/shared/ui/form-field';
import { Input } from '@/shared/ui/input';

import { generatePassword } from '../password';
import {
  createOwnerSchema,
  type CreateOwnerFormOutput,
  type CreateOwnerFormValues,
} from '../schemas';
import { PasswordField } from './password-field';

interface CreateOwnerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Created {
  owner: OwnerDto;
  password: string;
}

/**
 * „Nowy właściciel” (A1, admin-owners.md): konto z hasłem tymczasowym i opcjonalnie od razu obiekt
 * (Q-07). Po utworzeniu jednorazowo pokazujemy dane do przekazania – hasło nie jest nigdzie zapisywane.
 */
export function CreateOwnerDialog({ open, onOpenChange }: CreateOwnerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && <CreateOwnerContent onClose={() => onOpenChange(false)} />}
    </Dialog>
  );
}

function CreateOwnerContent({ onClose }: { onClose: () => void }) {
  const [created, setCreated] = useState<Created | null>(null);
  return created ? (
    <CreatedSummary created={created} onClose={onClose} />
  ) : (
    <CreateOwnerForm onClose={onClose} onCreated={setCreated} />
  );
}

function CreateOwnerForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (created: Created) => void;
}) {
  const queryClient = useQueryClient();
  const create = useAdminOwnersCreate();
  const form = useForm<CreateOwnerFormValues, unknown, CreateOwnerFormOutput>({
    resolver: zodResolver(createOwnerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: generatePassword(),
      property: { enabled: true, name: '', slug: '' },
    },
  });
  const { errors } = form.formState;
  const [password, withProperty] = useWatch({
    control: form.control,
    name: ['password', 'property.enabled'],
  });

  const onSubmit = form.handleSubmit((values) => {
    create.mutate(
      {
        data: {
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          password: values.password,
          ...(values.property.enabled && {
            property: {
              name: values.property.name,
              ...(values.property.slug && { slug: values.property.slug }),
            },
          }),
        },
      },
      {
        onSuccess: (owner) => {
          void invalidateAdmin(queryClient);
          notifySuccess(`Założono konto: ${owner.firstName} ${owner.lastName}`);
          onCreated({ owner, password: values.password });
        },
        onError: (error) => {
          if (isApiError(error) && error.code === 'EMAIL_TAKEN') {
            form.setError('email', { message: getErrorMessage(error) }, { shouldFocus: true });
            return;
          }
          if (isApiError(error) && error.code === 'SLUG_TAKEN') {
            form.setError(
              'property.slug',
              { message: getErrorMessage(error) },
              { shouldFocus: true },
            );
            return;
          }
          applyFieldErrors(error, form.setError, [
            'firstName',
            'lastName',
            'email',
            'password',
            'property.name',
            'property.slug',
          ]);
        },
      },
    );
  });

  const handledInline =
    isApiError(create.error) &&
    ['EMAIL_TAKEN', 'SLUG_TAKEN', 'VALIDATION_ERROR'].includes(create.error.code);

  return (
    <DialogContent
      size="lg"
      title="Nowy właściciel"
      description="Konto gospodarza z hasłem tymczasowym. Hasło przekazujesz właścicielowi osobnym kanałem."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={create.isPending}>
            Anuluj
          </Button>
          <Button type="submit" form="create-owner-form" loading={create.isPending}>
            Utwórz konto właściciela
          </Button>
        </>
      }
    >
      <form
        id="create-owner-form"
        noValidate
        onSubmit={(event) => void onSubmit(event)}
        className="grid gap-5"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="Imię" required error={errors.firstName?.message}>
            <Input autoComplete="off" {...form.register('firstName')} />
          </FormField>
          <FormField label="Nazwisko" required error={errors.lastName?.message}>
            <Input autoComplete="off" {...form.register('lastName')} />
          </FormField>
        </div>
        <FormField
          label="Adres e-mail"
          required
          hint="Login właściciela do Panelu Gospodarza."
          error={errors.email?.message}
        >
          <Input type="email" autoComplete="off" {...form.register('email')} />
        </FormField>
        <FormField
          label="Hasło tymczasowe"
          required
          hint="Min. 10 znaków. Przekaż je właścicielowi – nie wysyłamy go e-mailem."
          error={errors.password?.message}
        >
          <PasswordField
            registration={form.register('password')}
            value={password}
            onGenerate={(next) => form.setValue('password', next, { shouldValidate: true })}
          />
        </FormField>

        <fieldset className="grid gap-4 rounded-lg border bg-accent/40 p-4">
          <legend className="sr-only">Obiekt właściciela</legend>
          <Controller
            control={form.control}
            name="property.enabled"
            render={({ field }) => (
              <Checkbox
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked === true)}
                label={<span className="font-semibold">Utwórz od razu obiekt dla właściciela</span>}
                description="Obiekt dostaje ustawienia domyślne; resztę uzupełni właściciel w panelu."
              />
            )}
          />
          {withProperty && (
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField label="Nazwa obiektu" required error={errors.property?.name?.message}>
                <Input autoComplete="off" {...form.register('property.name')} />
              </FormField>
              <FormField
                label="Adres strony (opcjonalnie)"
                hint="Np. lesna-polana. Puste: utworzymy z nazwy."
                error={errors.property?.slug?.message}
              >
                <Input autoComplete="off" spellCheck={false} {...form.register('property.slug')} />
              </FormField>
            </div>
          )}
        </fieldset>

        {create.isError && !handledInline && <Alert title={getErrorMessage(create.error)} />}
      </form>
    </DialogContent>
  );
}

function CreatedSummary({ created, onClose }: { created: Created; onClose: () => void }) {
  const { owner, password } = created;
  const property = owner.properties[0];

  async function copyCredentials() {
    try {
      await navigator.clipboard.writeText(`Login: ${owner.email}\nHasło tymczasowe: ${password}`);
      notifySuccess('Skopiowano dane logowania');
    } catch {
      // Brak dostępu do schowka: dane są widoczne na ekranie.
    }
  }

  return (
    <DialogContent
      size="md"
      title="Konto założone"
      description="Przekaż właścicielowi dane logowania. Po zamknięciu okna hasła nie da się już wyświetlić."
      footer={<Button onClick={onClose}>Gotowe</Button>}
    >
      <div className="grid gap-4">
        <p className="flex items-center gap-2 font-semibold text-success">
          <CircleCheck className="size-5" aria-hidden="true" />
          {owner.firstName} {owner.lastName}
        </p>
        <dl className="grid gap-3 rounded-lg border bg-background p-4 text-base">
          <div>
            <dt className="text-sm text-muted-foreground">Login (e-mail)</dt>
            <dd className="font-semibold break-all">{owner.email}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Hasło tymczasowe</dt>
            <dd className="font-mono font-semibold break-all">{password}</dd>
          </div>
          {property && (
            <div>
              <dt className="text-sm text-muted-foreground">Obiekt</dt>
              <dd className="flex flex-wrap items-center gap-x-3">
                <span className="font-semibold">{property.name}</span>
                <a
                  href={routes.public.property(property.slug)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary underline underline-offset-4"
                >
                  /o/{property.slug}
                  <ExternalLink className="size-4" aria-hidden="true" />
                  <span className="sr-only">(otwiera się w nowej karcie)</span>
                </a>
              </dd>
            </div>
          )}
        </dl>
        <Button
          variant="outline"
          onClick={() => void copyCredentials()}
          className="justify-self-start"
        >
          <Copy aria-hidden="true" />
          Kopiuj dane logowania
        </Button>
      </div>
    </DialogContent>
  );
}
