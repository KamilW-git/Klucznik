import type { AvailabilityBlockDto } from '@klucznik/api-client';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { ROOM_2_ID } from '@/test/fixtures';
import { api, apiError } from '@/test/msw/handlers/auth';
import { server } from '@/test/msw/server';
import { renderAsOwner } from '@/test/render';

/** Pierwszy widoczny dzień o danym numerze w otwartym kalendarzu (miesiąc zależy od daty systemowej). */
async function findDay(label: string) {
  const grid = (await screen.findAllByRole('grid'))[0]!;
  return within(grid)
    .getAllByRole('button')
    .find((button) => button.textContent === label)!;
}

describe('CalendarPage (O3)', () => {
  it('requests the month window and draws rooms, the reservation bar and the block', async () => {
    const windows: string[] = [];
    server.use(
      http.get(api('/properties/:id/calendar'), ({ request }) => {
        const url = new URL(request.url);
        windows.push(`${url.searchParams.get('from')}..${url.searchParams.get('to')}`);
        return HttpResponse.json({
          from: url.searchParams.get('from'),
          to: url.searchParams.get('to'),
          rooms: [
            { id: 'r1', name: 'Domek Sosna', isActive: true },
            { id: ROOM_2_ID, name: 'Apartament Pod Dębem', isActive: false },
          ],
          reservations: [
            {
              id: 'res-1',
              roomId: 'r1',
              number: 'KL-2026-000123',
              checkIn: '2026-11-14',
              checkOut: '2026-11-18',
              status: 'PENDING',
              source: 'ONLINE',
              guestName: 'Anna Kowalska',
              guestsCount: 3,
              totalPrice: 164_000,
            },
          ],
          blocks: [
            {
              id: 'b1',
              roomId: ROOM_2_ID,
              dateFrom: '2026-11-20',
              dateTo: '2026-11-22',
              reason: 'Remont',
            },
          ],
        });
      }),
    );
    renderAsOwner('/panel/kalendarz?from=2026-11-10');

    expect(await screen.findByRole('heading', { name: 'listopad 2026' })).toBeVisible();
    expect(windows[0]).toBe('2026-11-01..2026-11-30');
    expect(
      await screen.findByRole('button', {
        name: 'KL-2026-000123, Anna Kowalska, 14.11 – 18.11.2026 (4 noce), Oczekuje',
      }),
    ).toBeVisible();
    expect(
      screen.getByRole('img', { name: /Blokada – Remont: noce 20\.11\.2026 – 22\.11\.2026/ }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('ukryty na stronie').length).toBeGreaterThan(0);
  });

  it('navigation and view live in the URL (?from&view)', async () => {
    const { router } = renderAsOwner('/panel/kalendarz?from=2026-11-10');
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Następny okres' }));
    await waitFor(() => expect(router.state.location.search).toBe('?from=2026-12-10'));

    await user.click(screen.getByRole('button', { name: '2 tygodnie' }));
    await waitFor(() => expect(router.state.location.search).toContain('view=2w'));
    expect(await screen.findByRole('heading', { name: '07.12 – 20.12.2026' })).toBeVisible();
  });

  it('a reservation bar opens the reservation drawer', async () => {
    renderAsOwner('/panel/kalendarz?from=2026-11-10');
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: /KL-2026-000123, Anna Kowalska/ }));

    const drawer = await screen.findByRole('dialog', { name: 'Szczegóły rezerwacji' });
    expect(await within(drawer).findByText('KL-2026-000123')).toBeVisible();
  });

  it('"Zablokuj termin": BLOCK_OVERLAPS_RESERVATION shows the conflicting number', async () => {
    server.use(
      http.post(api('/rooms/:id/blocks'), () =>
        apiError(409, 'BLOCK_OVERLAPS_RESERVATION', {
          conflictingReservationId: 'res-1',
          conflictingReservationNumber: 'KL-2026-000123',
        }),
      ),
    );
    renderAsOwner('/panel/kalendarz?from=2026-11-10');
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Zablokuj termin' }));
    const dialog = await screen.findByRole('dialog', { name: 'Zablokuj termin' });
    // Pokój: Radix Select (klawiatura), noce: wybór w kalendarzu.
    await user.click(within(dialog).getByRole('combobox', { name: /Pokój/ }));
    await user.click(await screen.findByRole('option', { name: 'Domek Sosna' }));
    await user.click(within(dialog).getByRole('button', { name: /Zablokowane noce/ }));
    await user.click(await findDay('15'));
    await user.click(await findDay('16'));
    await user.click(within(dialog).getByRole('button', { name: 'Zablokuj termin' }));

    expect(await within(dialog).findByText('Termin obejmuje aktywną rezerwację')).toBeVisible();
    expect(within(dialog).getByRole('link', { name: 'KL-2026-000123' })).toBeVisible();
  });

  it('creates a block and refreshes the calendar', async () => {
    let body: unknown;
    let calendarCalls = 0;
    server.use(
      http.get(api('/properties/:id/calendar'), ({ request }) => {
        calendarCalls += 1;
        const url = new URL(request.url);
        return HttpResponse.json({
          from: url.searchParams.get('from'),
          to: url.searchParams.get('to'),
          rooms: [{ id: 'r1', name: 'Domek Sosna', isActive: true }],
          reservations: [],
          blocks: [],
        });
      }),
      http.post(api('/rooms/:id/blocks'), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json<AvailabilityBlockDto>(
          {
            id: 'b2',
            roomId: 'r1',
            dateFrom: '2026-11-15',
            dateTo: '2026-11-15',
            reason: null,
            createdAt: '2026-10-09T10:00:00.000Z',
          },
          { status: 201 },
        );
      }),
    );
    renderAsOwner('/panel/kalendarz?from=2026-11-10');
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Zablokuj termin' }));
    const dialog = await screen.findByRole('dialog', { name: 'Zablokuj termin' });
    await user.click(within(dialog).getByRole('combobox', { name: /Pokój/ }));
    await user.click(await screen.findByRole('option', { name: 'Domek Sosna' }));
    await user.click(within(dialog).getByRole('button', { name: /Zablokowane noce/ }));
    const day = await findDay('15');
    await user.click(day);
    await user.click(day);
    await user.click(within(dialog).getByRole('button', { name: 'Zablokuj termin' }));

    expect(await screen.findByText('Termin został zablokowany')).toBeVisible();
    expect(body).toMatchObject({ dateFrom: expect.stringMatching(/-15$/) as string, reason: null });
    expect((body as { dateFrom: string; dateTo: string }).dateTo).toBe(
      (body as { dateFrom: string }).dateFrom,
    );
    await waitFor(() => expect(calendarCalls).toBeGreaterThan(1));
  });
});
