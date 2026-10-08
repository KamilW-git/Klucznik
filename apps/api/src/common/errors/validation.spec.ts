import { Type } from 'class-transformer';
import { IsEmail, IsInt, Min, ValidateNested, validateSync } from 'class-validator';

import { flattenValidationErrors } from './validation';

class GuestInput {
  @IsEmail()
  email: string;
}

class ReservationInput {
  @IsInt()
  @Min(1)
  guestsCount: number;

  @ValidateNested()
  @Type(() => GuestInput)
  guest: GuestInput;
}

describe('flattenValidationErrors', () => {
  it('flattens nested errors into dotted field paths', () => {
    const input = Object.assign(new ReservationInput(), {
      guestsCount: 0,
      guest: Object.assign(new GuestInput(), { email: 'nope' }),
    });

    const fields = flattenValidationErrors(validateSync(input));

    expect(fields).toEqual([
      { field: 'guestsCount', messages: ['guestsCount must not be less than 1'] },
      { field: 'guest.email', messages: ['email must be an email'] },
    ]);
  });
});
