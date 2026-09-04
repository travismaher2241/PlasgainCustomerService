// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { validateDealValue } from '../../utils/dealValueValidator';

describe('Deal value basis (understated pipeline)', () => {
  // Per-unit with a blank quantity used to save the unit price as the whole
  // project: a $1,450/ea job for 34 poles booked as $1,450, marked "Known".
  it('rejects a per-unit price with no quantity', () => {
    const result = validateDealValue({ enteredValue: 1450, basis: 'PER_UNIT' });

    expect(result.isValid).toBe(false);
    expect(result.severity).toBe('error');
    expect(result.warningMessage).toMatch(/quantity required/i);
    expect(result.suggestedCorrection?.basis).toBe('TOTAL');
  });

  it('accepts a per-unit price once the quantity is supplied', () => {
    const result = validateDealValue({ enteredValue: 1450, basis: 'PER_UNIT', quantity: 34 });

    expect(result.isValid).toBe(true);
    expect(result.effectiveTotal).toBe(49300);
    expect(result.effectiveUnitPrice).toBe(1450);
  });

  it('still accepts a project total with no quantity', () => {
    const result = validateDealValue({ enteredValue: 49300, basis: 'TOTAL' });

    expect(result.isValid).toBe(true);
    expect(result.effectiveTotal).toBe(49300);
  });

  it('keeps catching the order-of-magnitude slip it already caught', () => {
    const result = validateDealValue({ enteredValue: 1600, basis: 'TOTAL', quantity: 30 });

    expect(result.isOutlier).toBe(true);
    expect(result.suggestedCorrection?.basis).toBe('PER_UNIT');
  });
});
