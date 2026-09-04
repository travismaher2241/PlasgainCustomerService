import { describe, it, expect } from 'vitest';
import { validateDealValue } from '../../utils/dealValueValidator';

describe('FINAL PRIORITY 0 ACCEPTANCE AUDIT', () => {
  // --- SECTION 4: DEAL VALUE VALIDATION & VALUE BASIS (P0-18 - P0-19) ---
  describe('4. Deal Value Outlier Detection & Value Basis (P0-18, P0-19)', () => {
    it('correctly calculates total from per-unit basis (P0-19)', () => {
      const res = validateDealValue({
        enteredValue: 1750,
        basis: 'PER_UNIT',
        quantity: 20
      });

      expect(res.effectiveTotal).toBe(35000);
      expect(res.effectiveUnitPrice).toBe(1750);
      expect(res.isOutlier).toBe(false);
    });

    it('flags outlier when unit price is mistakenly entered in project total field (P0-18)', () => {
      // Rep typed $1,750 as total for 20 units ($87.50/unit)
      const res = validateDealValue({
        enteredValue: 1750,
        basis: 'TOTAL',
        quantity: 20
      });

      expect(res.isOutlier).toBe(true);
      expect(res.severity).toBe('warning');
      expect(res.warningMessage).toContain('Potential Value Basis Error');
      expect(res.suggestedCorrection?.calculatedTotal).toBe(35000);
    });

    it('flags outlier when large total is assigned to a single unit (P0-18)', () => {
      const res = validateDealValue({
        enteredValue: 75000,
        basis: 'TOTAL',
        quantity: 1
      });

      expect(res.isOutlier).toBe(true);
      expect(res.warningMessage).toContain('High Deal Value Notice');
    });
  });
});
