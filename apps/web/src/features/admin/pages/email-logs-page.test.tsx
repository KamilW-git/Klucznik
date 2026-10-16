import type { EmailLogPageDto } from '@klucznik/api-client';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { failedEmail, sentEmail } from '@/test/fixtures';
import { api } from '@/test/msw/handlers/auth';
import { server } from '@/test/msw/server';
import { renderAsAdmin } from '@/test/render';

describe('EmailLogsPage (admin)', () => {
  it('shows logs with Polish template names; FAILED is highlighted with the error', async () => {
    renderAsAdmin('/admin/logi-email');

    const table = await screen.findByRole('table', { name: 'Logi e-maili' });
    const sent = (await within(table).findByText('anna.kowalska@example.com')).closest('tr')!;
    expect(sent).toHaveTextContent('Potwierdzenie (gość)');
    expect(sent).toHaveTextContent('Wysłany');
    expect(sent).toHaveTextContent('KL-2026-000123');

    const failed = within(table).getByText('marek@example.com').closest('tr')!;
    expect(failed).toHaveTextContent('Nowa rezerwacja (gospodarz)');
    expect(failed).toHaveTextContent('Błąd');
    expect(failed.className).toContain('bg-destructive-soft');
    expect(
      within(failed).getByRole('button', { name: 'Treść błędu: SMTP 550: mailbox unavailable' }),
    ).toBeVisible();
  });

  it('status filter and recipient search go to the API', async () => {
    const requests: URLSearchParams[] = [];
    server.use(
      http.get(api('/admin/email-logs'), ({ request }) => {
        requests.push(new URL(request.url).searchParams);
        return HttpResponse.json<EmailLogPageDto>({
          data: [sentEmail, failedEmail],
          meta: { page: 1, pageSize: 20, totalItems: 2, totalPages: 1 },
        });
      }),
    );
    const { router } = renderAsAdmin('/admin/logi-email');
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Błąd' }));
    await waitFor(() => expect(requests.at(-1)?.get('status')).toBe('FAILED'));
    expect(router.state.location.search).toBe('?status=FAILED');

    await user.type(screen.getByRole('searchbox', { name: 'Szukaj odbiorcy' }), 'marek');
    await waitFor(() => expect(requests.at(-1)?.get('q')).toBe('marek'));

    await user.click(screen.getByRole('button', { name: 'Wyczyść filtry' }));
    // Bez filtrów klucz zapytania jest jak na starcie, więc lista wraca z cache (bez żądania).
    await waitFor(() => expect(router.state.location.search).toBe(''));
    expect(screen.getByRole('button', { name: 'Wszystkie' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('searchbox', { name: 'Szukaj odbiorcy' })).toHaveValue('');
  });

  it('empty filtered result → "Wyczyść filtry"', async () => {
    server.use(
      http.get(api('/admin/email-logs'), () =>
        HttpResponse.json<EmailLogPageDto>({
          data: [],
          meta: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
        }),
      ),
    );
    renderAsAdmin('/admin/logi-email?status=FAILED');

    expect(await screen.findByText('Brak e-maili pasujących do filtrów')).toBeVisible();
  });
});
