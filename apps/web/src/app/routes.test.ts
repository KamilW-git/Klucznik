import { describe, expect, it } from 'vitest';

import { homeFor, routes, safeNext } from './routes';

describe('routes', () => {
  it('login link carries an encoded next path', () => {
    expect(routes.login('/panel/rezerwacje?status=PENDING')).toBe(
      '/logowanie?next=%2Fpanel%2Frezerwacje%3Fstatus%3DPENDING',
    );
    expect(routes.login()).toBe('/logowanie');
  });

  it('home depends on the role', () => {
    expect(homeFor('OWNER')).toBe('/panel');
    expect(homeFor('ADMIN')).toBe('/admin/wlasciciele');
  });

  it.each([
    ['/panel/kalendarz', '/panel/kalendarz'],
    ['//evil.example.com', null],
    ['/\\evil.example.com', null],
    ['https://evil.example.com', null],
    ['panel', null],
    [null, null],
  ])('safeNext(%s) → %s', (next, expected) => {
    expect(safeNext(next)).toBe(expected);
  });
});
