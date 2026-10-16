import { zodResolver } from '@hookform/resolvers/zod';
import {
  isApiError,
  useAdminOwnersGet,
  useAdminOwnersUpdate,
  type OwnerListItemDto,
  type UpdateOwnerDto,
} from '@klucznik/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { Link } from 'react-router';

import { routes } from '@/app/routes';
import { getErrorMessage } from '@/shared/lib/api-errors';
import { applyFieldErrors } from '@/shared/lib/form-errors';
import { invalidateAdmin } from '@/shared/lib/invalidate';
import { notifySuccess } from '@/shared/lib/notify';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent } from '@/shared/ui/dialog';
import { FormField } from '@/shared/ui/form-field';
import { Input } from '@/shared/ui/input';
import { Skeleton } from '@/shared/ui/skeleton';

import { editOwnerSchema, type EditOwnerFormOutput, type EditOwnerFormValues } from '../schemas';
import { ActiveBadge } from './badges';
import { PasswordField } from './password-field';

interface EditOwnerDialogProps {
  /** Edytowany właściciel (wiersz listy); `null` zamyka dialog. */
  owner: OwnerListItemDto | null;
  onClose: () => void;
}

/** Edycja właściciela: dane, opcjonalne nowe hasło tymczasowe, lista obiektów (`GET /admin/owners/:id`). */
export function EditOwnerDialog({ owner, onClose }: EditOwnerDialogProps) {
  return (
    <Dialog open={owner !== null} onOpenChange={(open) => !open && onClose()}>
      {owner && <EditOwnerForm owner={owner} onClose={onClose} />}
    </Dialog>
  );
}

function EditOwnerForm({ owner, onClose }: { owner: OwnerListItemDto; onClose: () => void }) {
  const queryClient = useQueryClient();
  const details = useAdminOwnersGet(owner.id);
  const update = useAdminOwnersUpdate();
  const form = useForm<EditOwnerFormValues, unknown, EditOwnerFormOutput>({
    resolver: zodResolver(editOwnerSchema),
    defaultValues: {
      firstName: owner.firstName,
      lastName: owner.lastName,
      email: owner.email,
      password: '',
    },
  });
  const { errors, dirtyFields } = form.formState;
  const password = useWatch({ control: form.control, name: 'password' });

  const onSubmit = form.handleSubmit((values) => {
    // Tylko zmienione pola (PATCH).
    const data: UpdateOwnerDto = {
      ...(dirtyFields.firstName && { firstName: values.firstName }),
      ...(dirtyFields.lastName && { lastName: values.lastName }),
      ...(dirtyFields.email && { email: values.email }),
      ...(values.password && { password: values.password }),
    };
    if (Object.keys(data).length === 0) {
      onClose();
      return;
    }
    update.mutate(
      { id: owner.id, data },
      {
        onSuccess: () => {
          void invalidateAdmin(queryClient);
          notifySuccess(
            'Zapisano zmiany',
            data.password ? 'Przekaż właścicielowi nowe hasło tymczasowe.' : undefined,
          );
          onClose();
        },
        onError: (error) => {
          if (isApiError(error) && error.code === 'EMAIL_TAKEN') {
            form.setError('email', { message: getErrorMessage(error) }, { shouldFocus: true });
            return;
          }
          applyFieldErrors(error, form.setError, ['firstName', 'lastName', 'email', 'password']);
        },
      },
    );
  });

  const handledInline =
    isApiError(update.error) && ['EMAIL_TAKEN', 'VALIDATION_ERROR'].includes(update.error.code);

  return (
    <DialogContent
      size="lg"
      title={`Edycja: ${owner.firstName} ${owner.lastName}`}
      description="Zmiana danych konta właściciela."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={update.isPending}>
            Anuluj
          </Button>
          <Button type="submit" form="edit-owner-form" loading={update.isPending}>
            Zapisz zmiany
          </Button>
        </>
      }
    >
      <form
        id="edit-owner-form"
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
        <FormField label="Adres e-mail" required error={errors.email?.message}>
          <Input type="email" autoComplete="off" {...form.register('email')} />
        </FormField>
        <FormField
          label="Nowe hasło tymczasowe (opcjonalnie)"
          hint="Puste pole: hasło bez zmian."
          error={errors.password?.message}
        >
          <PasswordField
            registration={form.register('password')}
            value={password}
            onGenerate={(next) =>
              form.setValue('password', next, { shouldValidate: true, shouldDirty: true })
            }
          />
        </FormField>

        <section aria-labelledby="owner-properties-title" className="grid gap-2">
          <h3 id="owner-properties-title" className="text-sm font-semibold">
            Obiekty właściciela
          </h3>
          {details.isPending ? (
            <Skeleton className="h-11 w-full" />
          ) : details.isError ? (
            <p className="text-sm text-destructive">{getErrorMessage(details.error)}</p>
          ) : details.data.properties.length === 0 ? (
            <p className="text-sm text-muted-foreground">Właściciel nie ma jeszcze obiektu.</p>
          ) : (
            <ul className="grid gap-2">
              {details.data.properties.map((property) => (
                <li
                  key={property.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2"
                >
                  <span className="grid">
                    <span className="font-medium">{property.name}</span>
                    <span className="text-sm text-muted-foreground">/o/{property.slug}</span>
                  </span>
                  <span className="flex items-center gap-3">
                    <ActiveBadge active={property.isActive} inactiveLabel="Nieaktywny" />
                    {property.isActive && (
                      <a
                        href={routes.public.property(property.slug)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary"
                      >
                        Podgląd
                        <ExternalLink className="size-4" aria-hidden="true" />
                        <span className="sr-only">strony {property.name} (nowa karta)</span>
                      </a>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link
            to={routes.admin.properties({ ownerId: owner.id })}
            className="justify-self-start text-sm font-semibold text-primary underline underline-offset-4"
          >
            Pokaż na liście obiektów
          </Link>
        </section>

        {update.isError && !handledInline && <Alert title={getErrorMessage(update.error)} />}
      </form>
    </DialogContent>
  );
}
