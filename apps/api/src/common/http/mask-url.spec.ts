import { maskSecretsInUrl } from './mask-url';

describe('maskSecretsInUrl', () => {
  it('keeps only the first 6 characters of a guest token', () => {
    expect(maskSecretsInUrl('/api/v1/public/reservations/AbCdEf123456789xyz/cancel?x=1')).toBe(
      '/api/v1/public/reservations/AbCdEf…/cancel?x=1',
    );
  });

  it('leaves other URLs unchanged', () => {
    expect(maskSecretsInUrl('/api/v1/reservations/6f0c2a7e')).toBe('/api/v1/reservations/6f0c2a7e');
  });
});
