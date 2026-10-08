import { IntersectionType } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { flattenValidationErrors } from '../errors/validation';
import { paginate, PaginationQuery, toSkipTake } from './pagination';
import { parseSort, SortQuery } from './sort';

class ListQuery extends IntersectionType(
  PaginationQuery,
  SortQuery(['checkIn', 'number', 'createdAt'], 'checkIn:asc'),
) {}

function validateQuery(raw: Record<string, unknown>): { query: ListQuery; fields: string[] } {
  const query = plainToInstance(ListQuery, raw);
  const errors = validateSync(query, { whitelist: true, forbidNonWhitelisted: true });
  return { query, fields: flattenValidationErrors(errors).map((error) => error.field) };
}

describe('PaginationQuery + SortQuery', () => {
  it('applies defaults when parameters are missing', () => {
    const { query, fields } = validateQuery({});
    expect(fields).toEqual([]);
    expect(query).toMatchObject({ page: 1, pageSize: 20, sort: 'checkIn:asc' });
  });

  it('converts query strings to numbers', () => {
    const { query, fields } = validateQuery({ page: '3', pageSize: '50' });
    expect(fields).toEqual([]);
    expect(toSkipTake(query)).toEqual({ skip: 100, take: 50 });
  });

  it.each([
    [{ page: '0' }, 'page'],
    [{ page: '1.5' }, 'page'],
    [{ pageSize: '101' }, 'pageSize'],
    [{ pageSize: 'abc' }, 'pageSize'],
    [{ sort: 'price:asc' }, 'sort'],
    [{ sort: 'checkIn:up' }, 'sort'],
    [{ sort: 'checkIn' }, 'sort'],
    [{ sort: 'checkIn:asc,' }, 'sort'],
  ])('rejects %j (400 on %s)', (raw, field) => {
    expect(validateQuery(raw).fields).toContain(field);
  });

  it('accepts multiple sort fields from the whitelist', () => {
    const { query, fields } = validateQuery({ sort: 'checkIn:asc,number:desc' });
    expect(fields).toEqual([]);
    expect(parseSort(query.sort)).toEqual([
      { field: 'checkIn', direction: 'asc' },
      { field: 'number', direction: 'desc' },
    ]);
  });

  it('keeps the first occurrence of a repeated sort field', () => {
    expect(parseSort('checkIn:asc,checkIn:desc')).toEqual([{ field: 'checkIn', direction: 'asc' }]);
  });

  it('rejects a default sort outside the whitelist at definition time', () => {
    expect(() => SortQuery(['checkIn'], 'number:asc')).toThrow(/not allowed/);
  });
});

describe('paginate', () => {
  it('builds meta with total pages', () => {
    const query = Object.assign(new PaginationQuery(), { page: 2, pageSize: 20 });
    expect(paginate(['a'], query, 134).meta).toEqual({
      page: 2,
      pageSize: 20,
      totalItems: 134,
      totalPages: 7,
    });
  });

  it('returns zero pages for an empty list', () => {
    expect(paginate([], new PaginationQuery(), 0).meta.totalPages).toBe(0);
  });
});
