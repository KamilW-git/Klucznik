import { zodResolver } from '@hookform/resolvers/zod';
import { isApiError, useAuthLogin } from '@klucznik/api-client';
import { ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { getErrorMessage } from '@/shared/lib/api-errors';
import { applyFieldErrors } from '@/shared/lib/form-errors';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { FormField } from '@/shared/ui/form-field';
import { Input, InputGroup } from '@/shared/ui/input';

import { useAuth } from '../auth-context';
import { loginSchema, type LoginFormValues } from '../schemas';

/** O1: logowanie właściciela i administratora. Przekierowanie po sukcesie: `RedirectIfAuthenticated`. */
export function LoginPage() {
  const { signIn, endReason } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState<unknown>(null);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onTouched',
  });
  const { errors } = form.formState;

  const login = useAuthLogin({ mutation: { onSuccess: signIn } });

  const onSubmit = form.handleSubmit((values) => {
    setSubmitError(null);
    login.mutate(
      { data: values },
      {
        onError: (error) => {
          if (!applyFieldErrors(error, form.setError, ['email', 'password'])) {
            setSubmitError(error);
          }
          if (isApiError(error) && error.code === 'INVALID_CREDENTIALS') {
            form.resetField('password', { keepError: false });
            form.setFocus('password');
          }
        },
      },
    );
  });

  return (
    <div className="grid gap-8">
      <header className="grid gap-2">
        <h1 className="text-headline max-sm:text-[1.625rem] max-sm:leading-8">Witaj ponownie</h1>
        <p className="text-base text-muted-foreground sm:text-lg">
          Zaloguj się do{' '}
          <strong className="font-semibold text-foreground">Panelu Gospodarza</strong>, aby
          sprawdzić kalendarz i rezerwacje.
        </p>
      </header>

      {submitError !== null ? (
        <LoginErrorAlert error={submitError} onDismiss={() => setSubmitError(null)} />
      ) : (
        endReason === 'expired' && (
          <Alert variant="info" title="Sesja wygasła">
            Zaloguj się ponownie, aby kontynuować.
          </Alert>
        )
      )}

      <form className="grid gap-6" onSubmit={(event) => void onSubmit(event)} noValidate>
        <FormField label="Adres e-mail" required error={errors.email?.message}>
          <InputGroup startIcon={<Mail />}>
            <Input
              type="email"
              autoComplete="username"
              inputMode="email"
              placeholder="jan.nowak@example.com"
              {...form.register('email')}
            />
          </InputGroup>
        </FormField>

        <FormField label="Hasło" required error={errors.password?.message}>
          <InputGroup
            startIcon={<Lock />}
            end={
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground"
                aria-label={showPassword ? 'Ukryj hasło' : 'Pokaż hasło'}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
              </Button>
            }
          >
            <Input
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              {...form.register('password')}
            />
          </InputGroup>
        </FormField>

        <Button type="submit" size="lg" className="w-full" loading={login.isPending}>
          Zaloguj się
          {!login.isPending && <ArrowRight aria-hidden="true" />}
        </Button>
      </form>
    </div>
  );
}

function LoginErrorAlert({ error, onDismiss }: { error: unknown; onDismiss: () => void }) {
  const code = isApiError(error) ? error.code : null;
  if (code === 'INVALID_CREDENTIALS') {
    return (
      <Alert title="Nieprawidłowy e-mail lub hasło" onDismiss={onDismiss}>
        Sprawdź wprowadzone dane i spróbuj ponownie. Upewnij się, że klawisz Caps Lock jest
        wyłączony.
      </Alert>
    );
  }
  if (code === 'RATE_LIMITED') {
    return (
      <Alert variant="warning" title="Zbyt wiele prób logowania" onDismiss={onDismiss}>
        Odczekaj minutę i spróbuj ponownie.
      </Alert>
    );
  }
  return <Alert title={getErrorMessage(error)} onDismiss={onDismiss} />;
}
