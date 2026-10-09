import { describe, expect, it } from 'vitest';

import { formatGuests, parseStaySearch } from './stay-search';

const parse = (query: string) => parseStaySearch(new URLSearchParams(query));

describe('parseStaySearch', () => {
  it('reads checkIn, checkOut and guests from the URL', () => {
    expect(parse('checkIn=2027-08-14&checkOut=2027-08-18&guests=3')).toEqual({
      checkIn: '2027-08-14',
      checkOut: '2027-08-18',
      guests: 3,
    });
  });

  it.each([
    ['missing dates', 'guests=2'],
    ['checkOut not after checkIn', 'checkIn=2027-08-18&checkOut=2027-08-18&guests=2'],
    ['impossible date', 'checkIn=2027-02-30&checkOut=2027-03-02&guests=2'],
    ['wrong format', 'checkIn=14.08.2027&checkOut=2027-08-18&guests=2'],
    ['guests below 1', 'checkIn=2027-08-14&checkOut=2027-08-18&guests=0'],
    ['guests not an integer', 'checkIn=2027-08-14&checkOut=2027-08-18&guests=2.5'],
    ['guests above 99', 'checkIn=2027-08-14&checkOut=2027-08-18&guests=100'],
  ])('%s → null', (_case, query) => {
    expect(parse(query)).toBeNull();
  });
});

describe('formatGuests', () => {
  it.each([
    [1, '1 osoba'],
    [3, '3 osoby'],
    [5, '5 osób'],
    [12, '12 osób'],
    [22, '22 osoby'],
  ])('%i → %s', (count, text) => {
    expect(formatGuests(count)).toBe(text);
  });
});
