import { describe, it, expect } from 'vitest';
import { validateDealValue } from '../../utils/dealValueValidator';

describe('Deal Value Validation & Commercial Basis (P0-18, P0-19)', () => {
  it('calculates effective total from per-unit basis correctly (P0-19)', () => {
    const res = validateDealValue({
      enteredValue: 1600,
      basis: 'PER_UNIT',
      quantity: 30
    });

    expect(res.effectiveTotal).toBe(48000);
    expect(res.effectiveUnitPrice).toBe(1600);
    expect(res.isOutlier).toBe(false);
  });

  it('calculates effective unit price from project-total basis correctly', () => {
    const res = validateDealValue({
      enteredValue: 48000,
      basis: 'TOTAL',
      quantity: 30
    });

    expect(res.effectiveTotal).toBe(48000);
    expect(res.effectiveUnitPrice).toBe(1600);
    expect(res.isOutlier).toBe(false);
  });

  it('detects low unit-value outlier when per-unit price is entered into total field (P0-18)', () => {
    // Rep typed $1,600 as total for 30 units ($53.33/ea)
    const res = validateDealValue({
      enteredValue: 1600,
      basis: 'TOTAL',
      quantity: 30
    });

    expect(res.isOutlier).toBe(true);
    expect(res.severity).toBe('warning');
    expect(res.warningMessage).toContain('Potential Value Basis Error');
    expect(res.suggestedCorrection).toBeDefined();
    expect(res.suggestedCorrection?.calculatedTotal).toBe(48000);
  });

  it('detects high outlier when massive project total is assigned to a single unit (P0-18)', () => {
    // Rep typed $48,000 for 1 unit
    const res = validateDealValue({
      enteredValue: 48000,
      basis: 'TOTAL',
      quantity: 1
    });

    expect(res.isOutlier).toBe(true);
    expect(res.warningMessage).toContain('High Deal Value Notice');
  });

  it('handles zero or initial deal values gracefully', () => {
    const res = validateDealValue({
      enteredValue: 0,
      basis: 'TOTAL',
      quantity: 10
    });

    expect(res.effectiveTotal).toBe(0);
    expect(res.isOutlier).toBe(false);
    expect(res.severity).toBe('none');
  });
});
