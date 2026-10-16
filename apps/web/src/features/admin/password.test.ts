import { describe, expect, it } from 'vitest';

import { generatePassword, PASSWORD_MIN_LENGTH } from './password';

describe('generatePassword', () => {
  it('has the requested length and every character group', () => {
    for (let run = 0; run < 50; run += 1) {
      const password = generatePassword();
      expect(password).toHaveLength(16);
      expect(password).toMatch(/[a-z]/);
      expect(password).toMatch(/[A-Z]/);
      expect(password).toMatch(/[2-9]/);
      expect(password).toMatch(/[!@#$%*?]/);
    }
  });

  it('never uses look-alike characters and never goes below the API minimum', () => {
    const password = generatePassword(4);
    expect(password.length).toBe(PASSWORD_MIN_LENGTH);
    expect(Array.from({ length: 50 }, () => generatePassword()).join('')).not.toMatch(/[0O1lI]/);
  });

  it('gives different passwords each time', () => {
    const passwords = new Set(Array.from({ length: 20 }, () => generatePassword()));
    expect(passwords.size).toBe(20);
  });
});
