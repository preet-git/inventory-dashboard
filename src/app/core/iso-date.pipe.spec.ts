import { describe, expect, it } from 'vitest';
import { IsoDatePipe } from './iso-date.pipe';

describe('IsoDatePipe', () => {
  const pipe = new IsoDatePipe();

  it('formats an ISO date without shifting it into the local timezone', () => {
    // The bug this pipe exists to avoid: DatePipe reads this as UTC midnight and renders 15 Mar
    // anywhere west of Greenwich.
    expect(pipe.transform('2024-03-16')).toBe('16 Mar 2024');
  });

  it('formats the first and last day of a year', () => {
    expect(pipe.transform('2024-01-01')).toBe('01 Jan 2024');
    expect(pipe.transform('2024-12-31')).toBe('31 Dec 2024');
  });

  it('passes through anything that is not an ISO date', () => {
    expect(pipe.transform('not a date')).toBe('not a date');
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
  });
});
