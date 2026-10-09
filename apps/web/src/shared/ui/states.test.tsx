import { ApiError } from '@klucznik/api-client';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { EmptyState, ErrorState, PageSkeleton } from './states';
import { StatusBadge } from './status-badge';

describe('StatusBadge', () => {
  it.each([
    ['PENDING', 'Oczekuje'],
    ['CONFIRMED', 'Potwierdzona'],
    ['CANCELLED', 'Anulowana'],
    ['EXPIRED', 'Wygasła'],
    ['COMPLETED', 'Zakończona'],
  ] as const)('%s always has a text label: %s', (status, label) => {
    render(<StatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});

describe('view states (S1)', () => {
  it('PageSkeleton announces loading', () => {
    render(<PageSkeleton />);
    expect(screen.getByRole('status')).toHaveTextContent('Ładowanie…');
  });

  it('EmptyState shows the title and actions', () => {
    render(
      <EmptyState
        title="Brak rezerwacji w wybranym filtrze"
        actions={<button type="button">Wyczyść filtry</button>}
      />,
    );
    expect(
      screen.getByRole('heading', { name: 'Brak rezerwacji w wybranym filtrze' }),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Wyczyść filtry' })).toBeVisible();
  });

  it('ErrorState maps the code to Polish, shows requestId for 5xx and retries', async () => {
    const onRetry = vi.fn();
    render(
      <ErrorState
        error={new ApiError(500, 'INTERNAL_ERROR', 'Internal server error', null, 'req-42')}
        onRetry={onRetry}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Coś poszło nie tak. Spróbuj ponownie.');
    expect(screen.getByRole('alert')).not.toHaveTextContent('Internal server error');
    expect(screen.getByText('req-42')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Spróbuj ponownie' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
