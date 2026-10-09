import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { MoneyInput } from './money-input';

function Harness({ initial }: { initial: number | null }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <MoneyInput aria-label="Cena" value={value} onChange={setValue} />
      <output data-testid="minor">{String(value)}</output>
    </>
  );
}

describe('MoneyInput (zł ↔ grosze)', () => {
  it('shows złote and reports grosze; Polish decimal comma', async () => {
    render(<Harness initial={38_000} />);
    const input = screen.getByLabelText('Cena');
    expect(input).toHaveValue('380');

    await userEvent.clear(input);
    await userEvent.type(input, '1 640,50');
    expect(screen.getByTestId('minor')).toHaveTextContent('164050');

    await userEvent.tab();
    expect(input).toHaveValue('1640,50');
  });

  it('empty → null, invalid text → NaN (zod reports the error)', async () => {
    render(<Harness initial={null} />);
    const input = screen.getByLabelText('Cena');
    expect(screen.getByTestId('minor')).toHaveTextContent('null');
    await userEvent.type(input, '12,345');
    expect(screen.getByTestId('minor')).toHaveTextContent('NaN');
  });
});
